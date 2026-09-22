# M2 — Server: PartyServer Durable Object (`party/`)

> Source plan: [IMPLEMENTATION_PLAN.md §5 M2, §3.3, §4](../IMPLEMENTATION_PLAN.md) · Size: M
> Outcome: `pokero-party` Worker with a hibernating, storage-backed `PokeroServer` Durable Object
> that delegates every rule to `shared/game-logic.ts`, uses a DO alarm for the reveal countdown,
> and serves a room-metadata `GET` (used by M8).

Prerequisite: M1 merged (the reducer and schemas exist).

---

## 1. Files

```
party/
├─ index.ts           # PokeroServer + default fetch (CORS wrapper)
├─ codec.ts           # encode/decode helpers
├─ cors.ts            # origin allow-list helpers
└─ server.test.ts     # @cloudflare/vitest-pool-workers
```

Delete `party/smoke.test.ts` from M0.

---

## 2. `party/codec.ts`

```ts
import { ClientMessageSchema, type ClientMessage, type ServerMessage } from '../shared/schema';

export function encode(message: ServerMessage): string {
  return JSON.stringify(message);
}

export function decode(raw: string): ClientMessage | null {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  const parsed = ClientMessageSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}
```

---

## 3. `party/cors.ts`

> Correction to the plan: `routePartykitRequest` has **no** `cors` option (its options are
> `prefix`, `locationHint`, `jurisdiction`, `routingRetry`, `onBeforeConnect`, `onBeforeRequest`).
> CORS is applied in the Worker's `fetch` instead.

```ts
const LOCALHOST = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

export function isAllowedOrigin(origin: string | null, allowed: string): boolean {
  if (!origin) return false;
  if (LOCALHOST.test(origin)) return true;
  return allowed
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
    .some((o) => o === '*' || o === origin);
}

export function corsHeaders(origin: string | null, allowed: string): Record<string, string> {
  if (!isAllowedOrigin(origin, allowed)) return {};
  return {
    'Access-Control-Allow-Origin': origin as string,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

export function withCors(response: Response, origin: string | null, allowed: string): Response {
  // 101 responses (WebSocket upgrades) must be returned untouched.
  if (response.status === 101) return response;
  const out = new Response(response.body, response);
  for (const [k, v] of Object.entries(corsHeaders(origin, allowed))) out.headers.set(k, v);
  return out;
}
```

`ALLOWED_ORIGINS` comes from `wrangler.jsonc` `vars` (M0 §7.1). `localhost` origins are always
accepted so `vite dev` works without configuration.

---

## 4. `party/index.ts`

Replace the M0 stub entirely.

```ts
import { Server, routePartykitRequest, type Connection, type WSMessage } from 'partyserver';
import { reduce, type Command } from '../shared/game-logic';
import type { GameState } from '../shared/schema';
import { decode, encode } from './codec';
import { corsHeaders, withCors } from './cors';

const STORAGE_KEY = 'game';

export class PokeroServer extends Server<Env> {
  static options = { hibernate: true };

  #state: GameState | null = null;

  async onStart() {
    this.#state = (await this.ctx.storage.get<GameState>(STORAGE_KEY)) ?? null;
  }

  onConnect(connection: Connection) {
    if (this.#state) connection.send(encode({ type: 'gameState', state: this.#state }));
  }

  async onMessage(connection: Connection, raw: WSMessage) {
    if (typeof raw !== 'string') return;
    const message = decode(raw);
    if (!message) {
      connection.send(encode({ type: 'error', message: 'Invalid message format.' }));
      return;
    }
    await this.#dispatch({ kind: 'client', playerId: connection.id, message }, connection);
  }

  async onClose(connection: Connection) {
    await this.#dispatch({ kind: 'disconnect', playerId: connection.id });
  }

  async onError(connection: Connection, error: unknown) {
    console.error(`[${this.name}] connection ${connection.id} error`, error);
    await this.#dispatch({ kind: 'disconnect', playerId: connection.id });
  }

  async onAlarm() {
    await this.#dispatch({ kind: 'revealDue' });
  }

  // GET /parties/pokero-server/:gameId → room metadata (consumed in M8)
  async onRequest(request: Request) {
    if (request.method !== 'GET') return new Response(null, { status: 405 });
    if (!this.#state) return Response.json({ exists: false }, { status: 404 });
    const { settings, players } = this.#state;
    return Response.json({
      exists: true,
      gameName: settings.gameName,
      playerCount: Object.keys(players).length,
      votingType: settings.votingType,
    });
  }

  async #dispatch(cmd: Command, sender?: Connection) {
    const result = reduce(this.#state, cmd, { roomId: this.name, now: Date.now() });

    if (result.errorToSender && sender) {
      sender.send(encode({ type: 'error', message: result.errorToSender }));
    }
    if (!result.changed) {
      if (result.alarmAt === null) await this.ctx.storage.deleteAlarm();
      return;
    }

    this.#state = result.state;

    if (result.state) {
      await this.ctx.storage.put(STORAGE_KEY, result.state);
    } else {
      await this.ctx.storage.deleteAll(); // also removes any pending alarm
    }

    if (result.alarmAt === null) {
      await this.ctx.storage.deleteAlarm();
    } else if (typeof result.alarmAt === 'number') {
      await this.ctx.storage.setAlarm(result.alarmAt);
    }

    for (const event of result.events) this.broadcast(encode(event));
    if (result.state) this.broadcast(encode({ type: 'gameState', state: result.state }));
  }
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin, env.ALLOWED_ORIGINS) });
    }

    const response = await routePartykitRequest(request, env);
    if (!response) return new Response('Not Found', { status: 404 });
    return withCors(response, origin, env.ALLOWED_ORIGINS);
  },
} satisfies ExportedHandler<Env>;
```

### Why it is shaped this way

| Concern                                | Decision                                                                                                                                                        |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Name collision                         | The old server had a private `broadcast()` that would shadow `Server#broadcast`. Here the framework method is used directly.                                    |
| Argument order                         | PartyServer's `onMessage(connection, message)` is the **reverse** of PartyKit's `onMessage(message, sender)`.                                                   |
| Player identity                        | `PartySocket({ id })` sends `?_pk=<id>`; PartyServer exposes it as `connection.id`. The player id is therefore stable across reconnects and hibernation.        |
| Durability (plan §3.4 #6)              | State lives in `ctx.storage` under one key; `onStart()` reloads it after eviction or wake-up. `hibernate: true` keeps idle rooms free.                          |
| Countdown                              | A DO alarm (`setAlarm(countdownEnd)`) replaces `setTimeout`. If the isolate is evicted mid-countdown the alarm still fires and `revealDue` completes the round. |
| `revealDue` after `endGame`/`newRound` | `reduce` returns `alarmAt: null` and `changed: false`; `#dispatch` clears the alarm and does nothing else.                                                      |
| Errors                                 | Only the sender learns about a rejected command; the room is not spammed with `gameState` frames for no-ops (`changed: false`).                                 |

### Not ported from the old `party/index.ts`

- Type/interface block (lines 1–100) → `shared/`.
- `DEFAULT_SETTINGS` (`gameName: 'Pokero'`, `adminCanSpectate: true`) → `shared/constants.ts` with client values.
- `isValidVote` (1–10 chars) → deck membership check in `reduce`.
- `handleJoin(..., isAdmin)` honouring the client's `isAdmin` flag → creator-is-admin in `reduce`.
- `countdownTimer` / `setTimeout` → alarm.
- `console.log` noise on every event → keep only the `onError` log; rely on Workers observability.

---

## 5. Regenerate types

```bash
npm run types
```

Confirm `worker-configuration.d.ts` declares:

```ts
interface Env {
  ALLOWED_ORIGINS: string;
  PokeroServer: DurableObjectNamespace<import('./party/index').PokeroServer>;
}
```

---

## 6. Tests — `party/server.test.ts`

Runs inside workerd via `@cloudflare/vitest-pool-workers` (project `party`, config in M0 §5.2).
Requests go through `SELF.fetch` so `routePartykitRequest` is exercised too.

```ts
import { env, SELF, runDurableObjectAlarm } from 'cloudflare:test';
import { afterEach, describe, expect, it } from 'vitest';
import type { ServerMessage } from '../shared/schema';

const ROOM = 'abc1234';
const BASE = 'http://example.com';

interface Client {
  ws: WebSocket;
  inbox: ServerMessage[];
  send(msg: unknown): void;
  next<T extends ServerMessage['type']>(type: T): Promise<Extract<ServerMessage, { type: T }>>;
  close(): void;
}

const sockets: WebSocket[] = [];

async function connect(room: string, playerId: string): Promise<Client> {
  const res = await SELF.fetch(`${BASE}/parties/pokero-server/${room}?_pk=${playerId}`, {
    headers: { Upgrade: 'websocket' },
  });
  expect(res.status).toBe(101);
  const ws = res.webSocket!;
  ws.accept();
  sockets.push(ws);

  const inbox: ServerMessage[] = [];
  const waiters: Array<() => void> = [];
  ws.addEventListener('message', (e) => {
    inbox.push(JSON.parse(e.data as string));
    waiters.splice(0).forEach((w) => w());
  });

  return {
    ws,
    inbox,
    send: (msg) => ws.send(JSON.stringify(msg)),
    async next(type) {
      for (let i = 0; i < 50; i++) {
        const idx = inbox.findIndex((m) => m.type === type);
        if (idx !== -1) return inbox.splice(idx, 1)[0] as never;
        await new Promise<void>((r) => {
          waiters.push(r);
          setTimeout(r, 20);
        });
      }
      throw new Error(`Timed out waiting for "${type}"`);
    },
    close: () => ws.close(1000, 'test'),
  };
}

afterEach(() => {
  sockets.splice(0).forEach((ws) => {
    try {
      ws.close();
    } catch {
      /* already closed */
    }
  });
});

describe('PokeroServer', () => {
  it('first joiner becomes admin with their settings; second joiner is a player', async () => {
    const ann = await connect(ROOM, 'p-ann');
    ann.send({
      type: 'join',
      name: 'Ann',
      settings: {
        gameName: 'Sprint 42',
        allowPlayersToReveal: false,
        adminCanSpectate: false,
        votingType: 't-shirt',
      },
    });
    const s1 = await ann.next('gameState');
    expect(s1.state.adminId).toBe('p-ann');
    expect(s1.state.settings.gameName).toBe('Sprint 42');

    const bob = await connect(ROOM, 'p-bob');
    // late joiner receives the current state on connect
    const onConnect = await bob.next('gameState');
    expect(Object.keys(onConnect.state.players)).toEqual(['p-ann']);

    bob.send({ type: 'join', name: 'Bob', settings: { ...s1.state.settings, gameName: 'Nope' } });
    const s2 = await bob.next('gameState');
    expect(s2.state.settings.gameName).toBe('Sprint 42');
    expect(s2.state.players['p-bob'].isAdmin).toBe(false);
  });

  it('vote → reveal → alarm completes the round and records history', async () => {
    const ann = await connect(ROOM, 'p-ann');
    const bob = await connect(ROOM, 'p-bob');
    ann.send({ type: 'join', name: 'Ann' });
    bob.send({ type: 'join', name: 'Bob' });
    await bob.next('gameState');
    await bob.next('gameState');

    ann.send({ type: 'vote', vote: '5' });
    bob.send({ type: 'vote', vote: '8' });
    await bob.next('gameState');
    await bob.next('gameState');

    ann.send({ type: 'reveal' });
    const counting = await bob.next('gameState');
    expect(counting.state.countdownEnd).not.toBeNull();

    const stub = env.PokeroServer.get(env.PokeroServer.idFromName(ROOM));
    expect(await runDurableObjectAlarm(stub)).toBe(true);

    const revealed = await bob.next('gameState');
    expect(revealed.state.votesRevealed).toBe(true);
    expect(revealed.state.history).toHaveLength(1);
    expect(revealed.state.history[0].playerVotes).toEqual({ Ann: '5', Bob: '8' });
  });

  it('rejects votes outside the deck with an error to the sender only', async () => {
    const ann = await connect(ROOM, 'p-ann');
    const bob = await connect(ROOM, 'p-bob');
    ann.send({ type: 'join', name: 'Ann' });
    bob.send({ type: 'join', name: 'Bob' });
    await ann.next('gameState');
    await ann.next('gameState');

    bob.send({ type: 'vote', vote: '999' });
    const err = await bob.next('error');
    expect(err.message).toMatch(/deck/i);
    expect(ann.inbox.find((m) => m.type === 'error')).toBeUndefined();
  });

  it('malformed frame → error frame, room untouched', async () => {
    const ann = await connect(ROOM, 'p-ann');
    ann.send({ type: 'join', name: 'Ann' });
    await ann.next('gameState');
    ann.ws.send('{not json');
    const err = await ann.next('error');
    expect(err.message).toBe('Invalid message format.');
    expect(ann.inbox.filter((m) => m.type === 'gameState')).toHaveLength(0);
  });

  it('admin disconnect promotes the next player', async () => {
    const ann = await connect(ROOM, 'p-ann');
    const bob = await connect(ROOM, 'p-bob');
    ann.send({ type: 'join', name: 'Ann' });
    bob.send({ type: 'join', name: 'Bob' });
    await bob.next('gameState');
    await bob.next('gameState');

    ann.close();
    const left = await bob.next('playerLeft');
    expect(left.playerName).toBe('Ann');
    const s = await bob.next('gameState');
    expect(s.state.adminId).toBe('p-bob');
  });

  it('endGame broadcasts gameEnded and wipes storage', async () => {
    const ann = await connect(ROOM, 'p-ann');
    ann.send({ type: 'join', name: 'Ann' });
    await ann.next('gameState');
    ann.send({ type: 'endGame' });
    const ended = await ann.next('gameEnded');
    expect(ended.endedBy).toBe('Ann');

    const res = await SELF.fetch(`${BASE}/parties/pokero-server/${ROOM}`);
    expect(res.status).toBe(404);
  });

  it('GET metadata: 404 before join, 200 after', async () => {
    expect((await SELF.fetch(`${BASE}/parties/pokero-server/${ROOM}`)).status).toBe(404);

    const ann = await connect(ROOM, 'p-ann');
    ann.send({ type: 'join', name: 'Ann' });
    await ann.next('gameState');

    const res = await SELF.fetch(`${BASE}/parties/pokero-server/${ROOM}`, {
      headers: { Origin: 'http://localhost:3000' },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
    expect(await res.json()).toEqual({
      exists: true,
      gameName: 'Planning Poker',
      playerCount: 1,
      votingType: 'fibonacci',
    });
  });

  it('OPTIONS preflight from a disallowed origin carries no CORS headers', async () => {
    const res = await SELF.fetch(`${BASE}/parties/pokero-server/${ROOM}`, {
      method: 'OPTIONS',
      headers: { Origin: 'https://evil.example' },
    });
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });
});
```

Notes

- `isolatedStorage: true` (M0 config) gives every test a clean Durable Object storage, so the same
  `ROOM` name can be reused.
- `runDurableObjectAlarm(stub)` runs the pending alarm immediately and returns `true` if one was
  scheduled — no fake timers needed.

---

## 7. Manual verification

```bash
npm run party                    # wrangler dev → ws://localhost:8787
npx wscat -c "ws://localhost:8787/parties/pokero-server/abc1234?_pk=p1"
> {"type":"join","name":"Ann"}
< {"type":"gameState","state":{...,"adminId":"p1",...}}
> {"type":"reveal"}
< {"type":"gameState","state":{...,"countdownEnd":...}}
   (≈3 s later)
< {"type":"gameState","state":{...,"votesRevealed":true,...}}
> garbage
< {"type":"error","message":"Invalid message format."}
```

```bash
curl -i http://localhost:8787/parties/pokero-server/abc1234        # 200 JSON while p1 is connected
curl -i -X OPTIONS -H 'Origin: http://localhost:3000' http://localhost:8787/parties/pokero-server/abc1234
```

`npm run check` and `npx wrangler deploy --dry-run` green.

Commit: `feat(party): PokeroServer durable object on partyserver with storage, alarm and CORS`.

---

## Optional follow-ups (not required for parity)

- **Abandoned-room GC**: in `removePlayer` when the room becomes empty, set a 24 h alarm; in
  `onAlarm` if the room is still empty, `deleteAll()`. Requires a distinct alarm "reason" stored in
  `ctx.storage` since a DO has a single alarm.
- **Rate limiting** malformed frames per connection.
