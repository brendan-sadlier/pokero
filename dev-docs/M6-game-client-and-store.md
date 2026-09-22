# M6 — Game client & store

> Source plan: [IMPLEMENTATION_PLAN.md §5 M6, §2.6, §3.3](../IMPLEMENTATION_PLAN.md) · Size: M
> Outcome: a module-level `gameClient` that owns the `PartySocket`, writes to a TanStack
> `gameStore`, emits typed side-events, and a `useGameConnection` hook. Replaces
> `src/lib/usePartyKit.ts` and all connection `useState` in `GamePage`.

Prerequisites: M1, M2 (a running Worker for manual verification), M5 (sessions/env).

---

## 1. Files

```
src/stores/
├─ game-store.ts
└─ __tests__/game-store.test.ts
src/lib/
├─ game-client.ts
├─ emitter.ts
└─ __tests__/game-client.test.ts
src/features/game/
└─ use-game-connection.ts
```

---

## 2. `src/stores/game-store.ts`

TanStack Store (`createStore`, derived stores via function form, `useSelector` in components).
Derived stores only read `.state` of other stores **synchronously** so dependency tracking is exact.

```ts
import { createStore } from '@tanstack/store';
import type { GameState, Player } from '@shared/schema';
import { calculateRoundStats, type RoundStats } from '@shared/stats';

export type ConnectionState =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'RECONNECTING'
  | 'FAILED';

export type GameErrorCode = 'CONNECTION_FAILED' | 'MAX_RETRIES_REACHED' | 'SERVER_ERROR';

export interface GameError {
  code: GameErrorCode;
  message: string;
  userMessage: string;
  timestamp: number;
}

export interface GameConnection {
  connectionState: ConnectionState;
  gameState: GameState | null;
  error: GameError | null;
  /** Reconnection attempts since the last successful open. */
  retryCount: number;
}

export const INITIAL_CONNECTION: GameConnection = {
  connectionState: 'DISCONNECTED',
  gameState: null,
  error: null,
  retryCount: 0,
};

export const gameStore = createStore<GameConnection>(INITIAL_CONNECTION);

export function resetGameStore(): void {
  gameStore.setState(() => INITIAL_CONNECTION);
}

export function createGameError(
  code: GameErrorCode,
  message: string,
  userMessage: string,
): GameError {
  return { code, message, userMessage, timestamp: Date.now() };
}

// ---------- derived ----------

export const playersStore = createStore<Player[]>(() =>
  Object.values(gameStore.state.gameState?.players ?? {}),
);

export const votersStore = createStore<Player[]>(() =>
  playersStore.state.filter((p) => !p.isSpectator),
);

export const allVotedStore = createStore<boolean>(
  () => votersStore.state.length > 0 && votersStore.state.every((p) => p.hasVoted),
);

export const countingDownStore = createStore<boolean>(() => {
  const g = gameStore.state.gameState;
  return g?.countdownEnd != null && !g.votesRevealed;
});

export const roundStatsStore = createStore<RoundStats | null>(() => {
  const g = gameStore.state.gameState;
  return g?.votesRevealed ? calculateRoundStats(g) : null;
});

// ---------- selectors (for useSelector) ----------

export const selectMe =
  (playerId: string) =>
  (s: GameConnection): Player | null =>
    s.gameState?.players[playerId] ?? null;

export const selectSettings = (s: GameConnection) => s.gameState?.settings ?? null;
export const selectHistory = (s: GameConnection) => s.gameState?.history ?? [];
export const selectConnection = (s: GameConnection) => ({
  connectionState: s.connectionState,
  error: s.error,
  retryCount: s.retryCount,
});
```

> `ConnectionState`, `GameError`, `ErrorCode`, `createGameError` used to live in
> `src/types/index.ts`; they are client-only so they move here. `SESSION_EXPIRED`, `INVALID_GAME_ID`
> and `UNKNOWN_ERROR` codes were never produced meaningfully and are dropped.

---

## 3. `src/lib/emitter.ts`

Tiny typed emitter — avoids a dependency for four events.

```ts
export type Listener<T> = (payload: T) => void;

export function createEmitter<Events extends Record<string, unknown>>() {
  const listeners = new Map<keyof Events, Set<Listener<never>>>();
  return {
    on<K extends keyof Events>(event: K, cb: Listener<Events[K]>): () => void {
      const set = (listeners.get(event) ?? new Set()) as Set<Listener<Events[K]>>;
      set.add(cb);
      listeners.set(event, set as Set<Listener<never>>);
      return () => set.delete(cb);
    },
    emit<K extends keyof Events>(event: K, payload: Events[K]): void {
      (listeners.get(event) as Set<Listener<Events[K]>> | undefined)?.forEach((cb) => cb(payload));
    },
    clear(): void {
      listeners.clear();
    },
  };
}
```

---

## 4. `src/lib/game-client.ts`

```ts
import PartySocket from 'partysocket';
import { RECONNECTION } from '@shared/constants';
import {
  ServerMessageSchema,
  type ClientMessage,
  type PlayerSession,
  type ServerMessage,
} from '@shared/schema';
import { env } from '@/lib/env';
import { createEmitter } from '@/lib/emitter';
import { createGameError, gameStore, resetGameStore } from '@/stores/game-store';

type Ev<T extends ServerMessage['type']> = Omit<Extract<ServerMessage, { type: T }>, 'type'>;

export interface GameEvents {
  playerLeft: Ev<'playerLeft'>;
  playerKicked: Ev<'playerKicked'>;
  adminTransferred: Ev<'adminTransferred'>;
  gameEnded: Ev<'gameEnded'>;
  serverError: Ev<'error'>;
  reconnected: undefined;
}

const emitter = createEmitter<GameEvents>();

let socket: PartySocket | null = null;
let session: PlayerSession | null = null;
let hasOpenedOnce = false;
let closesSinceOpen = 0;

function sendJoin() {
  if (!socket || !session) return;
  const message: ClientMessage = {
    type: 'join',
    name: session.playerName,
    // Only meaningful when this join creates the room; the server ignores it otherwise.
    ...(session.isAdmin && session.settings ? { settings: session.settings } : {}),
  };
  socket.send(JSON.stringify(message));
}

function handleOpen() {
  const reconnected = hasOpenedOnce;
  hasOpenedOnce = true;
  closesSinceOpen = 0;
  gameStore.setState((s) => ({ ...s, connectionState: 'CONNECTED', error: null, retryCount: 0 }));
  sendJoin();
  if (reconnected) emitter.emit('reconnected', undefined);
}

function handleMessage(event: MessageEvent) {
  let json: unknown;
  try {
    json = JSON.parse(String(event.data));
  } catch {
    console.warn('[game-client] non-JSON frame ignored');
    return;
  }
  const parsed = ServerMessageSchema.safeParse(json);
  if (!parsed.success) {
    console.warn('[game-client] unknown frame ignored', parsed.error.issues);
    return;
  }
  const msg = parsed.data;
  switch (msg.type) {
    case 'gameState':
      gameStore.setState((s) => ({ ...s, gameState: msg.state }));
      break;
    case 'error':
      emitter.emit('serverError', { message: msg.message });
      break;
    case 'playerLeft':
    case 'playerKicked':
    case 'adminTransferred':
    case 'gameEnded': {
      const { type, ...payload } = msg;
      emitter.emit(type, payload as never);
      break;
    }
  }
}

function handleClose() {
  // PartySocket schedules its own reconnect before this listener runs; after `maxRetries`
  // failed attempts it silently stops, so count closes ourselves to detect that.
  closesSinceOpen += 1;
  if (closesSinceOpen > RECONNECTION.maxRetries) {
    gameStore.setState((s) => ({
      ...s,
      connectionState: 'FAILED',
      retryCount: RECONNECTION.maxRetries,
      error: createGameError(
        'MAX_RETRIES_REACHED',
        'Maximum reconnection attempts reached',
        'Unable to reconnect to the game. Please refresh the page.',
      ),
    }));
    return;
  }
  gameStore.setState((s) => ({
    ...s,
    connectionState: 'RECONNECTING',
    retryCount: closesSinceOpen,
  }));
}

function handleError(event: Event) {
  console.error('[game-client] socket error', event);
  gameStore.setState((s) => ({
    ...s,
    error: createGameError(
      'CONNECTION_FAILED',
      'WebSocket error',
      'Connection error occurred. Attempting to reconnect...',
    ),
  }));
}

export const gameClient = {
  connect(gameId: string, nextSession: PlayerSession): void {
    gameClient.disconnect();
    session = nextSession;
    hasOpenedOnce = false;
    closesSinceOpen = 0;
    gameStore.setState((s) => ({
      ...s,
      connectionState: 'CONNECTING',
      error: null,
      retryCount: 0,
    }));

    socket = new PartySocket({
      host: env.VITE_PARTY_HOST,
      party: 'pokero-server', // kebab-case of the DO binding `PokeroServer`
      room: gameId,
      id: nextSession.playerId, // becomes connection.id on the server (?_pk=)
      maxRetries: RECONNECTION.maxRetries,
      minReconnectionDelay: RECONNECTION.minDelayMs,
      maxReconnectionDelay: RECONNECTION.maxDelayMs,
      reconnectionDelayGrowFactor: RECONNECTION.growFactor,
    });
    socket.addEventListener('open', handleOpen);
    socket.addEventListener('message', handleMessage);
    socket.addEventListener('close', handleClose);
    socket.addEventListener('error', handleError);
  },

  disconnect(): void {
    if (socket) {
      socket.removeEventListener('open', handleOpen);
      socket.removeEventListener('message', handleMessage);
      socket.removeEventListener('close', handleClose);
      socket.removeEventListener('error', handleError);
      socket.close();
      socket = null;
    }
    session = null;
    resetGameStore();
  },

  /** Manual retry from the error screen. */
  reconnect(): void {
    if (!socket) return;
    closesSinceOpen = 0;
    gameStore.setState((s) => ({
      ...s,
      connectionState: 'CONNECTING',
      error: null,
      retryCount: 0,
    }));
    socket.reconnect();
  },

  send(message: ClientMessage): void {
    if (!socket || gameStore.state.connectionState !== 'CONNECTED') {
      console.warn('[game-client] dropped message while not connected', message.type);
      return;
    }
    socket.send(JSON.stringify(message));
  },

  on: emitter.on,

  /** Test-only escape hatch. */
  _internals: {
    get socket() {
      return socket;
    },
  },
};
```

Behavioural contract (matches plan M6):

| Socket event | Store                                                                         | Emitted                                   |
| ------------ | ----------------------------------------------------------------------------- | ----------------------------------------- |
| `open`       | `CONNECTED`, `error: null`, `retryCount: 0`; sends `join`                     | `reconnected` if not first open           |
| `message`    | `gameState` → `gameState`; others → events                                    | `playerLeft` … `gameEnded`, `serverError` |
| `close`      | `RECONNECTING` + `retryCount = n` (n ≤ 5) or `FAILED` + `MAX_RETRIES_REACHED` | —                                         |
| `error`      | `error = CONNECTION_FAILED` (state unchanged)                                 | —                                         |

Removed vs. the old `usePartyKit`: the hand-rolled backoff timer (`scheduleReconnect`,
`calculateBackoffDelay`) — `partysocket` already implements exponential backoff with the same
parameters; running both produced duplicate connections.

---

## 5. `src/features/game/use-game-connection.ts`

```ts
import { useEffect } from 'react';
import type { PlayerSession } from '@shared/schema';
import { gameClient } from '@/lib/game-client';

export function useGameConnection(gameId: string, session: PlayerSession): void {
  useEffect(() => {
    gameClient.connect(gameId, session);
    return () => gameClient.disconnect();
    // Reconnect only when identity changes, not on every session object.
  }, [gameId, session.playerId, session.playerName, session.isAdmin]);
}
```

StrictMode's double effect run yields connect → disconnect → connect, which is harmless.

---

## 6. Tests

### 6.1 `src/stores/__tests__/game-store.test.ts`

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import {
  allVotedStore,
  countingDownStore,
  gameStore,
  playersStore,
  resetGameStore,
  roundStatsStore,
  selectMe,
} from '@/stores/game-store';
import type { GameState } from '@shared/schema';

const base: GameState = {
  gameId: 'abc1234',
  settings: {
    gameName: 'X',
    allowPlayersToReveal: true,
    adminCanSpectate: false,
    votingType: 'fibonacci',
  },
  players: {
    a: { id: 'a', name: 'Ann', isAdmin: true, isSpectator: false, vote: '5', hasVoted: true },
    b: { id: 'b', name: 'Bob', isAdmin: false, isSpectator: true, vote: null, hasVoted: false },
  },
  roundActive: true,
  votesRevealed: false,
  countdownEnd: null,
  adminId: 'a',
  history: [],
};

const set = (patch: Partial<GameState>) =>
  gameStore.setState((s) => ({ ...s, gameState: { ...base, ...patch } }));

describe('derived stores', () => {
  beforeEach(() => resetGameStore());

  it('players/voters/allVoted recompute', () => {
    set({});
    expect(playersStore.state).toHaveLength(2);
    expect(allVotedStore.state).toBe(true); // only Ann votes; Bob spectates
    set({
      players: {
        ...base.players,
        c: { id: 'c', name: 'Cy', isAdmin: false, isSpectator: false, vote: null, hasVoted: false },
      },
    });
    expect(allVotedStore.state).toBe(false);
  });

  it('allVoted is false with zero voters', () => {
    set({ players: { b: base.players.b } });
    expect(allVotedStore.state).toBe(false);
  });

  it('countingDown only while countdownEnd set and not revealed', () => {
    set({ countdownEnd: 123 });
    expect(countingDownStore.state).toBe(true);
    set({ countdownEnd: 123, votesRevealed: true });
    expect(countingDownStore.state).toBe(false);
  });

  it('roundStats only after reveal', () => {
    set({});
    expect(roundStatsStore.state).toBeNull();
    set({ votesRevealed: true });
    expect(roundStatsStore.state?.average).toBe(5);
  });

  it('selectMe', () => {
    set({});
    expect(selectMe('a')(gameStore.state)?.name).toBe('Ann');
    expect(selectMe('zzz')(gameStore.state)).toBeNull();
  });
});
```

### 6.2 `src/lib/__tests__/game-client.test.ts`

Mock `partysocket` with a controllable fake:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

class FakeSocket extends EventTarget {
  static instances: FakeSocket[] = [];
  sent: string[] = [];
  opts: Record<string, unknown>;
  reconnect = vi.fn();
  close = vi.fn();
  constructor(opts: Record<string, unknown>) {
    super();
    this.opts = opts;
    FakeSocket.instances.push(this);
  }
  send(data: string) {
    this.sent.push(data);
  }
  open() {
    this.dispatchEvent(new Event('open'));
  }
  message(payload: unknown) {
    this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(payload) }));
  }
  closeFromServer() {
    this.dispatchEvent(new Event('close'));
  }
}

vi.mock('partysocket', () => ({ default: FakeSocket }));

const { gameClient } = await import('@/lib/game-client');
const { gameStore } = await import('@/stores/game-store');

const session = {
  gameId: 'abc1234',
  playerId: 'p1',
  playerName: 'Ann',
  isAdmin: true,
  timestamp: 0,
  settings: {
    gameName: 'S',
    allowPlayersToReveal: true,
    adminCanSpectate: false,
    votingType: 'fibonacci' as const,
  },
};

describe('gameClient', () => {
  beforeEach(() => {
    FakeSocket.instances = [];
  });
  afterEach(() => gameClient.disconnect());

  it('connects with the right PartySocket options and joins with settings on open', () => {
    gameClient.connect('abc1234', session);
    const s = FakeSocket.instances[0];
    expect(s.opts).toMatchObject({
      party: 'pokero-server',
      room: 'abc1234',
      id: 'p1',
      maxRetries: 5,
    });
    expect(gameStore.state.connectionState).toBe('CONNECTING');
    s.open();
    expect(gameStore.state.connectionState).toBe('CONNECTED');
    expect(JSON.parse(s.sent[0])).toEqual({
      type: 'join',
      name: 'Ann',
      settings: session.settings,
    });
  });

  it('omits settings for non-admins', () => {
    gameClient.connect('abc1234', { ...session, isAdmin: false });
    FakeSocket.instances[0].open();
    expect(JSON.parse(FakeSocket.instances[0].sent[0])).toEqual({ type: 'join', name: 'Ann' });
  });

  it('writes gameState frames to the store and emits side events', () => {
    const left = vi.fn();
    gameClient.on('playerLeft', left);
    gameClient.connect('abc1234', session);
    const s = FakeSocket.instances[0];
    s.open();
    s.message({
      type: 'gameState',
      state: {
        gameId: 'abc1234',
        settings: session.settings,
        players: {},
        roundActive: true,
        votesRevealed: false,
        countdownEnd: null,
        adminId: 'p1',
        history: [],
      },
    });
    expect(gameStore.state.gameState?.gameId).toBe('abc1234');
    s.message({ type: 'playerLeft', playerId: 'x', playerName: 'Xe' });
    expect(left).toHaveBeenCalledWith({ playerId: 'x', playerName: 'Xe' });
  });

  it('ignores malformed frames', () => {
    gameClient.connect('abc1234', session);
    const s = FakeSocket.instances[0];
    s.open();
    s.message({ type: 'nope' });
    s.dispatchEvent(new MessageEvent('message', { data: '{bad' }));
    expect(gameStore.state.gameState).toBeNull();
  });

  it('tracks reconnect attempts and fails after maxRetries', () => {
    gameClient.connect('abc1234', session);
    const s = FakeSocket.instances[0];
    s.open();
    for (let i = 1; i <= 5; i++) {
      s.closeFromServer();
      expect(gameStore.state).toMatchObject({ connectionState: 'RECONNECTING', retryCount: i });
    }
    s.closeFromServer();
    expect(gameStore.state.connectionState).toBe('FAILED');
    expect(gameStore.state.error?.code).toBe('MAX_RETRIES_REACHED');
  });

  it('emits reconnected on the second open and resets counters', () => {
    const rc = vi.fn();
    gameClient.on('reconnected', rc);
    gameClient.connect('abc1234', session);
    const s = FakeSocket.instances[0];
    s.open();
    s.closeFromServer();
    s.open();
    expect(rc).toHaveBeenCalledTimes(1);
    expect(gameStore.state).toMatchObject({
      connectionState: 'CONNECTED',
      retryCount: 0,
      error: null,
    });
  });

  it('send() is a no-op while not connected', () => {
    gameClient.connect('abc1234', session);
    gameClient.send({ type: 'reveal' });
    expect(FakeSocket.instances[0].sent).toHaveLength(0);
  });

  it('disconnect closes the socket and resets the store', () => {
    gameClient.connect('abc1234', session);
    const s = FakeSocket.instances[0];
    s.open();
    gameClient.disconnect();
    expect(s.close).toHaveBeenCalled();
    expect(gameStore.state.connectionState).toBe('DISCONNECTED');
  });
});
```

---

## 7. Manual verification (placeholder page)

Temporarily make `features/game/game-page.tsx`:

```tsx
import { getRouteApi } from '@tanstack/react-router';
import { useSelector } from '@tanstack/react-store';
import { gameStore, playersStore } from '@/stores/game-store';
import { useGameConnection } from './use-game-connection';

const route = getRouteApi('/game/$gameId');

export function GamePage() {
  const { gameId } = route.useParams();
  const { session } = route.useRouteContext();
  useGameConnection(gameId, session);
  const state = useSelector(gameStore, (s) => s.connectionState);
  const players = useSelector(playersStore, (p) => p.map((x) => x.name).join(', '));
  return (
    <pre className="p-6">
      {state} · players: {players}
    </pre>
  );
}
```

1. `npm run party` and `npm run dev`.
2. Create a game → page shows `CONNECTED · players: Ann`.
3. Second browser profile → join via `/join?gameId=…` → both pages list both names live.
4. Kill `wrangler dev` → `RECONNECTING`; restart → `CONNECTED` with the same names (server re-adds on
   `join` with the same `_pk`).
5. Leave it dead → after 5 attempts `FAILED`.
6. `npm run check` green.

Commit: `feat(game): partysocket game client + tanstack store`.

---

## Old code superseded by this milestone

| Old                                                                                                                        | Action                                                                  |
| -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `src/lib/usePartyKit.ts`                                                                                                   | Deleted → `game-client.ts` + `game-store.ts`                            |
| `calculateBackoffDelay` (`src/lib/utils.ts`)                                                                               | Deleted — `partysocket` handles backoff                                 |
| `ConnectionState`, `ErrorCode`, `GameError`, `createGameError`, `isConnectionUsable`, `RECONNECTION_CONFIG` in `src/types` | → `game-store.ts` / `shared/constants.ts`                               |
| GamePage `hasJoined` / `isReconnecting` / `settingsApplied` state and the "apply initial settings" effect                  | Deleted — `join` carries settings; server applies them on room creation |
| `optionsRef` callback plumbing                                                                                             | → `gameClient.on(event, cb)`                                            |
