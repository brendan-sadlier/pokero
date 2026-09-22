# M1 — Shared domain (`shared/`)

> Source plan: [IMPLEMENTATION_PLAN.md §5 M1, §2.5, §4](../IMPLEMENTATION_PLAN.md) · Size: M
> Outcome: pure, dependency-free (except Zod) game rules, statistics, constants and wire schemas,
> imported by both the Worker and the browser, with ≥ 95 % line coverage.

Nothing here touches the DOM, `Date.now()`, timers or sockets. Time is injected via `ReduceContext.now`.

---

## 1. Files

```
shared/
├─ constants.ts        # decks, limits, defaults, reconnection config
├─ schema.ts           # Zod schemas + inferred TS types (single source of truth)
├─ stats.ts            # calculateRoundStats, buildHistoryEntry
├─ game-logic.ts       # reduce(state, command, ctx) → ReduceResult
├─ constants.test.ts
├─ schema.test.ts
├─ stats.test.ts
└─ game-logic.test.ts
```

Delete `shared/smoke.test.ts` from M0 once the real tests exist.

---

## 2. `shared/constants.ts`

Consolidates values that today live in three places (`src/types/index.ts`, `party/index.ts`,
`src/lib/usePartyKit.ts`) **with conflicting defaults**. This is now the only copy.

```ts
export const VOTING_TYPES = ['fibonacci', 't-shirt', 'powers-of-2'] as const;
export type VotingType = (typeof VOTING_TYPES)[number];

export const VOTING_TYPE_LABELS: Record<VotingType, string> = {
  fibonacci: 'Fibonacci',
  't-shirt': 'T-Shirt Sizing',
  'powers-of-2': 'Powers of 2',
};

export const CARD_VALUES_BY_TYPE: Record<VotingType, readonly string[]> = {
  fibonacci: ['0', '1', '2', '3', '5', '8', '13', '21', '34', '?'],
  't-shirt': ['XS', 'S', 'M', 'L', 'XL', 'XXL', '?'],
  'powers-of-2': ['0', '1', '2', '4', '8', '16', '32', '64', '?'],
};

export function getDeck(votingType: VotingType): readonly string[] {
  return CARD_VALUES_BY_TYPE[votingType];
}

export const MAX_NAME_LENGTH = 50;
export const MAX_GAME_NAME_LENGTH = 100;
export const GAME_ID_LENGTH = 7;
export const GAME_ID_PATTERN = /^[a-z0-9]{5,15}$/;
export const COUNTDOWN_MS = 3000;

export const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
export const SESSION_KEY_PREFIX = 'pokero_session_';

export const RECONNECTION = {
  maxRetries: 5,
  minDelayMs: 1000,
  maxDelayMs: 30000,
  growFactor: 2,
} as const;

export const DEFAULT_GAME_SETTINGS = {
  gameName: 'Planning Poker',
  allowPlayersToReveal: true,
  adminCanSpectate: false,
  votingType: 'fibonacci',
} as const satisfies {
  gameName: string;
  allowPlayersToReveal: boolean;
  adminCanSpectate: boolean;
  votingType: VotingType;
};
```

> Old server default was `{ gameName: 'Pokero', adminCanSpectate: true }`; old client default was
> `{ gameName: 'Planning Poker', adminCanSpectate: false }`. The client values win (plan §3.4 #2).

---

## 3. `shared/schema.ts`

Zod v4. Every wire type and persisted type is a schema; TS types are inferred. Replaces all
interfaces in `src/types/index.ts` and the duplicated interfaces at the top of `party/index.ts`.

```ts
import { z } from 'zod';
import { GAME_ID_PATTERN, MAX_GAME_NAME_LENGTH, MAX_NAME_LENGTH, VOTING_TYPES } from './constants';

// ---------- Primitives ----------

export const VotingTypeSchema = z.enum(VOTING_TYPES);

export const GameIdSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(GAME_ID_PATTERN, 'Invalid Game ID format');

export const PlayerNameSchema = z
  .string()
  .trim()
  .min(1, 'Please enter your name')
  .max(MAX_NAME_LENGTH, `Name cannot exceed ${MAX_NAME_LENGTH} characters`);

export const GameNameSchema = z
  .string()
  .trim()
  .min(1, 'Game name cannot be empty')
  .max(MAX_GAME_NAME_LENGTH, `Game name must be ${MAX_GAME_NAME_LENGTH} characters or less`);

// ---------- Domain ----------

export const GameSettingsSchema = z.object({
  gameName: GameNameSchema,
  allowPlayersToReveal: z.boolean(),
  adminCanSpectate: z.boolean(),
  votingType: VotingTypeSchema,
});
export type GameSettings = z.infer<typeof GameSettingsSchema>;

export const PlayerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(MAX_NAME_LENGTH),
  isAdmin: z.boolean(),
  isSpectator: z.boolean(),
  vote: z.string().nullable(),
  hasVoted: z.boolean(),
});
export type Player = z.infer<typeof PlayerSchema>;

export const RoundHistoryEntrySchema = z.object({
  roundNumber: z.number().int().positive(),
  completedAt: z.number(),
  distribution: z.record(z.string(), z.number().int().nonnegative()),
  average: z.number().nullable(),
  winners: z.array(z.string()),
  isDraw: z.boolean(),
  agreeability: z.number().nullable(),
  voterCount: z.number().int().nonnegative(),
  playerVotes: z.record(z.string(), z.string()),
  votingType: VotingTypeSchema,
});
export type RoundHistoryEntry = z.infer<typeof RoundHistoryEntrySchema>;

export const GameStateSchema = z.object({
  gameId: z.string().min(1),
  settings: GameSettingsSchema,
  players: z.record(z.string(), PlayerSchema),
  roundActive: z.boolean(),
  votesRevealed: z.boolean(),
  countdownEnd: z.number().nullable(),
  adminId: z.string(),
  history: z.array(RoundHistoryEntrySchema),
});
export type GameState = z.infer<typeof GameStateSchema>;

// ---------- Wire: client → server ----------

export const ClientMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('join'),
    name: PlayerNameSchema,
    // Honoured only when this join creates the room.
    settings: GameSettingsSchema.optional(),
  }),
  z.object({ type: z.literal('vote'), vote: z.string().min(1).max(10) }),
  z.object({ type: z.literal('reveal') }),
  z.object({ type: z.literal('newRound') }),
  z.object({ type: z.literal('updateSettings'), settings: GameSettingsSchema.partial() }),
  z.object({ type: z.literal('leave') }),
  z.object({ type: z.literal('endGame') }),
  z.object({ type: z.literal('kickPlayer'), targetPlayerId: z.string().min(1) }),
  z.object({ type: z.literal('transferAdmin'), targetPlayerId: z.string().min(1) }),
]);
export type ClientMessage = z.infer<typeof ClientMessageSchema>;

// ---------- Wire: server → client ----------

export const ServerMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('gameState'), state: GameStateSchema }),
  z.object({ type: z.literal('error'), message: z.string() }),
  z.object({ type: z.literal('playerLeft'), playerId: z.string(), playerName: z.string() }),
  z.object({
    type: z.literal('playerKicked'),
    playerId: z.string(),
    playerName: z.string(),
    kickedBy: z.string(),
  }),
  z.object({
    type: z.literal('adminTransferred'),
    fromPlayerId: z.string(),
    fromPlayerName: z.string(),
    toPlayerId: z.string(),
    toPlayerName: z.string(),
  }),
  z.object({ type: z.literal('gameEnded'), endedBy: z.string() }),
]);
export type ServerMessage = z.infer<typeof ServerMessageSchema>;

/** Server messages that are broadcast alongside (not instead of) a `gameState` frame. */
export type SideEvent = Exclude<ServerMessage, { type: 'gameState' | 'error' }>;

// ---------- Client persistence & forms ----------

export const PlayerSessionSchema = z.object({
  playerId: z.string().min(1),
  playerName: z.string().min(1),
  gameId: GameIdSchema,
  isAdmin: z.boolean(),
  timestamp: z.number(),
  settings: GameSettingsSchema.optional(),
});
export type PlayerSession = z.infer<typeof PlayerSessionSchema>;

export const CreateGameFormSchema = z.object({
  playerName: PlayerNameSchema,
  gameName: z
    .string()
    .trim()
    .max(MAX_GAME_NAME_LENGTH, `Game name cannot exceed ${MAX_GAME_NAME_LENGTH} characters`),
});

export const JoinGameFormSchema = z.object({
  playerName: PlayerNameSchema,
  gameId: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Please enter a valid Game ID')
    .regex(GAME_ID_PATTERN, 'Invalid Game ID format'),
});

// ---------- M8: room metadata ----------

export const GameMetaSchema = z.object({
  exists: z.literal(true),
  gameName: z.string(),
  playerCount: z.number().int().nonnegative(),
  votingType: VotingTypeSchema,
});
export type GameMeta = z.infer<typeof GameMetaSchema>;
```

Notes

- `JoinMessage.isAdmin` from the old protocol is **gone** (plan §3.4 #1). A frame carrying it still
  parses (unknown keys are stripped) but is ignored.
- Form-validation messages from plan §2.4 are encoded as Zod messages so the forms just surface
  `error.issues[0].message`.

---

## 4. `shared/stats.ts`

Replaces `calculateRoundStats` in `src/lib/utils.ts`, `getWinningVote` in
`src/components/game/stats/index.tsx` **and** `captureRoundHistory` in `party/index.ts` — three
implementations of the same maths.

```ts
import { getDeck } from './constants';
import type { GameState, Player, RoundHistoryEntry } from './schema';

export interface RoundStats {
  /** Mean of parseFloat-able votes; null when none. */
  average: number | null;
  /** vote value → count */
  distribution: Record<string, number>;
  /** Vote value(s) with the highest count. Empty when no votes. */
  winners: string[];
  isDraw: boolean;
  /** 0–100, null when no vote is in the deck. */
  agreeability: number | null;
  voterCount: number;
}

export function votersOf(state: GameState): Player[] {
  return Object.values(state.players).filter((p) => !p.isSpectator && p.vote !== null);
}

export function calculateDistribution(voters: Player[]): Record<string, number> {
  const distribution: Record<string, number> = {};
  for (const { vote } of voters) {
    if (vote === null) continue;
    distribution[vote] = (distribution[vote] ?? 0) + 1;
  }
  return distribution;
}

export function calculateAverage(distribution: Record<string, number>): number | null {
  let sum = 0;
  let n = 0;
  for (const [vote, count] of Object.entries(distribution)) {
    const num = parseFloat(vote);
    if (Number.isFinite(num)) {
      sum += num * count;
      n += count;
    }
  }
  return n > 0 ? sum / n : null;
}

export function calculateWinners(distribution: Record<string, number>): {
  winners: string[];
  isDraw: boolean;
} {
  const entries = Object.entries(distribution);
  if (entries.length === 0) return { winners: [], isDraw: false };
  const max = Math.max(...entries.map(([, c]) => c));
  const winners = entries.filter(([, c]) => c === max).map(([v]) => v);
  return { winners, isDraw: winners.length > 1 };
}

/**
 * 1 − (mean absolute distance of vote indices from their mean) / (deck.length − 1), as a percentage.
 * Votes not in the deck are ignored; returns null when nothing is left to measure.
 */
export function calculateAgreeability(
  distribution: Record<string, number>,
  deck: readonly string[],
): number | null {
  const index = new Map(deck.map((v, i) => [v, i] as const));
  let n = 0;
  let weightedIdx = 0;
  for (const [vote, count] of Object.entries(distribution)) {
    const idx = index.get(vote);
    if (idx === undefined) continue;
    n += count;
    weightedIdx += idx * count;
  }
  if (n === 0) return null;

  const mean = weightedIdx / n;
  let weightedDist = 0;
  for (const [vote, count] of Object.entries(distribution)) {
    const idx = index.get(vote);
    if (idx === undefined) continue;
    weightedDist += Math.abs(idx - mean) * count;
  }
  const avgDist = weightedDist / n;
  const maxDist = Math.max(deck.length - 1, 1);
  return Math.max(0, Math.min(1, 1 - avgDist / maxDist)) * 100;
}

export function calculateRoundStats(state: GameState): RoundStats {
  const voters = votersOf(state);
  const distribution = calculateDistribution(voters);
  const { winners, isDraw } = calculateWinners(distribution);
  return {
    average: calculateAverage(distribution),
    distribution,
    winners,
    isDraw,
    agreeability: calculateAgreeability(distribution, getDeck(state.settings.votingType)),
    voterCount: voters.length,
  };
}

/** Returns null when nobody voted (round is not recorded). */
export function buildHistoryEntry(state: GameState, now: number): RoundHistoryEntry | null {
  const voters = votersOf(state);
  if (voters.length === 0) return null;
  const stats = calculateRoundStats(state);
  const playerVotes: Record<string, string> = {};
  for (const v of voters) playerVotes[v.name] = v.vote as string;
  return {
    roundNumber: state.history.length + 1,
    completedAt: now,
    distribution: stats.distribution,
    average: stats.average,
    winners: stats.winners,
    isDraw: stats.isDraw,
    agreeability: stats.agreeability,
    voterCount: stats.voterCount,
    playerVotes,
    votingType: state.settings.votingType,
  };
}
```

> Fixes plan §3.4 #9: the old `calculateRoundStats` divided by zero (→ `NaN`) when every vote was
> outside the deck.

---

## 5. `shared/game-logic.ts`

The whole server rulebook as a pure reducer. `party/index.ts` (M2) becomes a thin adapter around it.

```ts
import {
  COUNTDOWN_MS,
  DEFAULT_GAME_SETTINGS,
  MAX_GAME_NAME_LENGTH,
  MAX_NAME_LENGTH,
  getDeck,
} from './constants';
import type { ClientMessage, GameSettings, GameState, Player, SideEvent } from './schema';
import { buildHistoryEntry } from './stats';

export type Command =
  | { kind: 'client'; playerId: string; message: ClientMessage }
  | { kind: 'disconnect'; playerId: string }
  | { kind: 'revealDue' };

export interface ReduceContext {
  roomId: string;
  now: number;
}

export interface ReduceResult {
  /** null ⇒ room deleted */
  state: GameState | null;
  /** Broadcast to everyone, before the gameState frame. */
  events: SideEvent[];
  /** Whether `state` differs from the input and a gameState frame should be broadcast. */
  changed: boolean;
  /** number ⇒ set alarm, null ⇒ clear alarm, undefined ⇒ leave as is. */
  alarmAt?: number | null;
  /** Sent as an `error` frame to the sender only. */
  errorToSender?: string;
}

// ---------- helpers ----------

const unchanged = (state: GameState | null, errorToSender?: string): ReduceResult => ({
  state,
  events: [],
  changed: false,
  errorToSender,
});

const clone = (state: GameState): GameState => structuredClone(state);

function clearVotes(state: GameState): void {
  for (const p of Object.values(state.players)) {
    p.vote = null;
    p.hasVoted = false;
  }
}

function resetRound(state: GameState): void {
  clearVotes(state);
  state.votesRevealed = false;
  state.countdownEnd = null;
  state.roundActive = true;
}

function applyAdminSpectator(state: GameState, admin: Player): void {
  admin.isSpectator = state.settings.adminCanSpectate;
  if (admin.isSpectator) {
    admin.vote = null;
    admin.hasVoted = false;
  }
}

function createGame(roomId: string, adminId: string, settings: GameSettings): GameState {
  return {
    gameId: roomId,
    settings,
    players: {},
    roundActive: true,
    votesRevealed: false,
    countdownEnd: null,
    adminId,
    history: [],
  };
}

function isEmpty(state: GameState): boolean {
  return Object.keys(state.players).length === 0;
}

function admin(state: GameState, playerId: string): Player | null {
  const p = state.players[playerId];
  return p?.isAdmin ? p : null;
}

// ---------- reducer ----------

export function reduce(prev: GameState | null, cmd: Command, ctx: ReduceContext): ReduceResult {
  switch (cmd.kind) {
    case 'revealDue':
      return revealDue(prev, ctx);
    case 'disconnect':
      return removePlayer(prev, cmd.playerId);
    case 'client':
      return handleClient(prev, cmd.playerId, cmd.message, ctx);
  }
}

function handleClient(
  prev: GameState | null,
  playerId: string,
  msg: ClientMessage,
  ctx: ReduceContext,
): ReduceResult {
  if (msg.type === 'join') return join(prev, playerId, msg.name, msg.settings, ctx);
  if (!prev) return unchanged(prev);

  switch (msg.type) {
    case 'vote':
      return vote(prev, playerId, msg.vote);
    case 'reveal':
      return reveal(prev, playerId, ctx);
    case 'newRound':
      return newRound(prev, playerId);
    case 'updateSettings':
      return updateSettings(prev, playerId, msg.settings);
    case 'leave':
      return removePlayer(prev, playerId);
    case 'kickPlayer':
      return kickPlayer(prev, playerId, msg.targetPlayerId);
    case 'transferAdmin':
      return transferAdmin(prev, playerId, msg.targetPlayerId);
    case 'endGame':
      return endGame(prev, playerId);
  }
}

function join(
  prev: GameState | null,
  playerId: string,
  rawName: string,
  settings: GameSettings | undefined,
  ctx: ReduceContext,
): ReduceResult {
  const name = rawName.trim().slice(0, MAX_NAME_LENGTH);
  if (!name) return unchanged(prev, 'Name is required.');

  let state: GameState;
  if (prev === null) {
    state = createGame(ctx.roomId, playerId, settings ?? { ...DEFAULT_GAME_SETTINGS });
  } else {
    state = clone(prev);
    if (isEmpty(prev)) {
      // Room persisted with no players (e.g. sole admin refreshed): joiner becomes admin,
      // creator settings are honoured, history is kept.
      state.adminId = playerId;
      if (settings) state.settings = settings;
    }
  }

  const isAdmin = state.adminId === playerId;
  state.players[playerId] = {
    id: playerId,
    name,
    isAdmin,
    isSpectator: isAdmin && state.settings.adminCanSpectate,
    vote: null,
    hasVoted: false,
  };
  return { state, events: [], changed: true };
}

function vote(prev: GameState, playerId: string, value: string): ReduceResult {
  const me = prev.players[playerId];
  if (!me) return unchanged(prev);
  if (me.isSpectator) return unchanged(prev, 'Spectators cannot vote.');
  if (prev.votesRevealed || prev.countdownEnd !== null) return unchanged(prev);
  if (!getDeck(prev.settings.votingType).includes(value)) {
    return unchanged(prev, 'Invalid vote for the current deck.');
  }
  const state = clone(prev);
  const p = state.players[playerId]!;
  p.vote = value;
  p.hasVoted = true;
  return { state, events: [], changed: true };
}

function reveal(prev: GameState, playerId: string, ctx: ReduceContext): ReduceResult {
  const me = prev.players[playerId];
  if (!me) return unchanged(prev);
  if (!(me.isAdmin || prev.settings.allowPlayersToReveal)) {
    return unchanged(prev, 'Only the admin can reveal votes.');
  }
  if (prev.countdownEnd !== null || prev.votesRevealed) return unchanged(prev);
  const state = clone(prev);
  state.countdownEnd = ctx.now + COUNTDOWN_MS;
  return { state, events: [], changed: true, alarmAt: state.countdownEnd };
}

function revealDue(prev: GameState | null, ctx: ReduceContext): ReduceResult {
  if (!prev || prev.countdownEnd === null || prev.votesRevealed) {
    return { ...unchanged(prev), alarmAt: null };
  }
  const state = clone(prev);
  state.votesRevealed = true;
  state.countdownEnd = null;
  const entry = buildHistoryEntry(state, ctx.now);
  if (entry) state.history.push(entry);
  return { state, events: [], changed: true, alarmAt: null };
}

function newRound(prev: GameState, playerId: string): ReduceResult {
  if (!admin(prev, playerId)) return unchanged(prev, 'Only the admin can start a new round.');
  const state = clone(prev);
  resetRound(state);
  return { state, events: [], changed: true, alarmAt: null };
}

function updateSettings(
  prev: GameState,
  playerId: string,
  patch: Partial<GameSettings>,
): ReduceResult {
  if (!admin(prev, playerId)) return unchanged(prev, 'Only the admin can update settings.');
  const state = clone(prev);
  let alarmAt: number | null | undefined;

  if (patch.gameName !== undefined) {
    const name = patch.gameName.trim().slice(0, MAX_GAME_NAME_LENGTH);
    if (name) state.settings.gameName = name;
  }
  if (patch.allowPlayersToReveal !== undefined) {
    state.settings.allowPlayersToReveal = patch.allowPlayersToReveal;
  }
  if (patch.adminCanSpectate !== undefined) {
    state.settings.adminCanSpectate = patch.adminCanSpectate;
    const currentAdmin = state.players[state.adminId];
    if (currentAdmin) applyAdminSpectator(state, currentAdmin);
  }
  if (patch.votingType !== undefined && patch.votingType !== state.settings.votingType) {
    state.settings.votingType = patch.votingType;
    resetRound(state); // also cancels a running countdown (plan §3.4 #5)
    alarmAt = null;
  }
  return { state, events: [], changed: true, alarmAt };
}

function removePlayer(prev: GameState | null, playerId: string): ReduceResult {
  if (!prev) return unchanged(prev);
  const leaving = prev.players[playerId];
  if (!leaving) return unchanged(prev);

  const state = clone(prev);
  delete state.players[playerId];

  if (leaving.isAdmin) {
    const next = Object.values(state.players)[0];
    if (next) {
      next.isAdmin = true;
      state.adminId = next.id;
      applyAdminSpectator(state, next); // same rule as transferAdmin (plan §3.4 #4)
    }
  }
  return {
    state,
    events: [{ type: 'playerLeft', playerId, playerName: leaving.name }],
    changed: true,
  };
}

function kickPlayer(prev: GameState, adminId: string, targetId: string): ReduceResult {
  const me = admin(prev, adminId);
  if (!me) return unchanged(prev, 'Only the admin can kick players.');
  if (adminId === targetId) return unchanged(prev);
  const target = prev.players[targetId];
  if (!target) return unchanged(prev);

  const state = clone(prev);
  delete state.players[targetId];
  return {
    state,
    events: [
      { type: 'playerKicked', playerId: targetId, playerName: target.name, kickedBy: me.name },
    ],
    changed: true,
  };
}

function transferAdmin(prev: GameState, adminId: string, targetId: string): ReduceResult {
  const me = admin(prev, adminId);
  if (!me) return unchanged(prev, 'Only the admin can transfer admin rights.');
  if (adminId === targetId) return unchanged(prev);
  if (!prev.players[targetId]) return unchanged(prev);

  const state = clone(prev);
  const from = state.players[adminId]!;
  const to = state.players[targetId]!;
  from.isAdmin = false;
  from.isSpectator = false;
  to.isAdmin = true;
  state.adminId = to.id;
  applyAdminSpectator(state, to);
  return {
    state,
    events: [
      {
        type: 'adminTransferred',
        fromPlayerId: from.id,
        fromPlayerName: from.name,
        toPlayerId: to.id,
        toPlayerName: to.name,
      },
    ],
    changed: true,
  };
}

function endGame(prev: GameState, playerId: string): ReduceResult {
  const me = admin(prev, playerId);
  if (!me) return unchanged(prev, 'Only the admin can end the game.');
  return {
    state: null,
    events: [{ type: 'gameEnded', endedBy: me.name }],
    changed: true,
    alarmAt: null,
  };
}
```

Design notes

- **Immutability by cloning**: `structuredClone` is available in Workers and Node ≥ 17; the state is
  small, so cloning per command is cheap and lets the DO compare `prev !== next`.
- **`errorToSender`** replaces the old server's silent `return`s so the client can log/surface why a
  command was rejected. The client still performs its own courtesy checks (M7) so users rarely see them.
- **Empty-but-persisted rooms**: with durable storage (M2) a room outlives its last connection. A
  sole admin who refreshes will `disconnect` (removed) then `join` (room empty) — history and settings
  survive, and they become admin again.

---

## 6. Tests

All in the `shared` Vitest project (node). Use a fixture builder:

```ts
// shared/test-fixtures.ts
import type { GameState, Player } from './schema';
import { DEFAULT_GAME_SETTINGS } from './constants';

export const player = (id: string, over: Partial<Player> = {}): Player => ({
  id,
  name: id.toUpperCase(),
  isAdmin: false,
  isSpectator: false,
  vote: null,
  hasVoted: false,
  ...over,
});

export const game = (over: Partial<GameState> = {}): GameState => ({
  gameId: 'abc1234',
  settings: { ...DEFAULT_GAME_SETTINGS },
  players: {},
  roundActive: true,
  votesRevealed: false,
  countdownEnd: null,
  adminId: 'a',
  history: [],
  ...over,
});

export const ctx = { roomId: 'abc1234', now: 1_000_000 };
```

### 6.1 `stats.test.ts` — worked examples

```ts
import { describe, expect, it } from 'vitest';
import { calculateRoundStats, buildHistoryEntry } from './stats';
import { game, player } from './test-fixtures';

describe('calculateRoundStats', () => {
  it('[3,3,5] on fibonacci → avg 3.67, winner 3, agreeability ≈ 95.06', () => {
    const s = calculateRoundStats(
      game({
        players: {
          a: player('a', { vote: '3', hasVoted: true }),
          b: player('b', { vote: '3', hasVoted: true }),
          c: player('c', { vote: '5', hasVoted: true }),
        },
      }),
    );
    expect(s.average).toBeCloseTo(3.6667, 3);
    expect(s.winners).toEqual(['3']);
    expect(s.isDraw).toBe(false);
    // indices 3,3,4 → mean 3.333, avgDist 0.444, maxDist 9 → 1 − 0.0494 = 0.9506
    expect(s.agreeability).toBeCloseTo(95.06, 1);
    expect(s.voterCount).toBe(3);
  });

  it('all "?" → average null, agreeability 100 (all same index)', () => {
    const s = calculateRoundStats(
      game({
        players: {
          a: player('a', { vote: '?', hasVoted: true }),
          b: player('b', { vote: '?', hasVoted: true }),
        },
      }),
    );
    expect(s.average).toBeNull();
    expect(s.agreeability).toBe(100);
  });

  it('tie → isDraw with both winners', () => {
    const s = calculateRoundStats(
      game({
        players: {
          a: player('a', { vote: '1', hasVoted: true }),
          b: player('b', { vote: '2', hasVoted: true }),
        },
      }),
    );
    expect(s.isDraw).toBe(true);
    expect(s.winners.sort()).toEqual(['1', '2']);
  });

  it('votes outside the deck → agreeability null (no NaN)', () => {
    const s = calculateRoundStats(
      game({ players: { a: player('a', { vote: '999', hasVoted: true }) } }),
    );
    expect(s.agreeability).toBeNull();
    expect(Number.isNaN(s.average)).toBe(false);
  });

  it('spectators and non-voters are ignored', () => {
    const s = calculateRoundStats(
      game({
        players: {
          a: player('a', { isSpectator: true, vote: '8', hasVoted: true }),
          b: player('b'),
          c: player('c', { vote: '5', hasVoted: true }),
        },
      }),
    );
    expect(s.voterCount).toBe(1);
    expect(s.distribution).toEqual({ '5': 1 });
  });
});

describe('buildHistoryEntry', () => {
  it('returns null with zero voters', () => {
    expect(buildHistoryEntry(game({ players: { a: player('a') } }), 1)).toBeNull();
  });
  it('numbers rounds from history length and keys playerVotes by name', () => {
    const e = buildHistoryEntry(
      game({ players: { a: player('a', { vote: '5', hasVoted: true }) } }),
      42,
    );
    expect(e).toMatchObject({ roundNumber: 1, completedAt: 42, playerVotes: { A: '5' } });
  });
});
```

### 6.2 `game-logic.test.ts` — one block per §2.5 row

Cover, at minimum (each as its own `it`):

| Group            | Cases                                                                                                                                                                                                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| join             | creates room with joiner as admin + provided settings; defaults when none; second joiner is not admin even if room settings passed; admin + `adminCanSpectate` ⇒ spectator; empty name ⇒ `errorToSender`, unchanged; empty persisted room ⇒ joiner admin, history kept; rejoin resets vote |
| vote             | sets vote/hasVoted; spectator rejected; during countdown rejected; after reveal rejected; not in deck rejected; unknown player ignored                                                                                                                                                     |
| reveal           | admin sets `countdownEnd = now+3000` and `alarmAt`; non-admin allowed when `allowPlayersToReveal`; non-admin rejected otherwise; double reveal ignored                                                                                                                                     |
| revealDue        | marks revealed, clears countdown, appends history, `alarmAt: null`; no voters ⇒ no history entry; null state / already revealed ⇒ unchanged with `alarmAt: null`                                                                                                                           |
| newRound         | admin clears votes, flags, countdown, `alarmAt: null`; non-admin rejected                                                                                                                                                                                                                  |
| updateSettings   | name trimmed/limited, empty name ignored; `adminCanSpectate` toggles admin spectator and clears vote; votingType change resets round and `alarmAt: null`; same votingType ⇒ no reset; non-admin rejected                                                                                   |
| leave/disconnect | removes; emits `playerLeft`; admin leaving promotes first remaining **with adminCanSpectate applied**; last player leaving keeps state; unknown player unchanged                                                                                                                           |
| kickPlayer       | admin removes target, emits `playerKicked` with `kickedBy` name; self-kick ignored; non-admin rejected; unknown target ignored                                                                                                                                                             |
| transferAdmin    | flags swap, `adminId` updated, spectator rule applied to new admin, old admin not spectator, emits `adminTransferred`; self/unknown/non-admin cases                                                                                                                                        |
| endGame          | admin ⇒ `state: null`, `gameEnded`, `alarmAt: null`; non-admin rejected                                                                                                                                                                                                                    |
| purity           | `reduce` never mutates its input (deep-freeze the fixture with `Object.freeze` recursively and assert no throw)                                                                                                                                                                            |

Skeleton:

```ts
import { describe, expect, it } from 'vitest';
import { reduce } from './game-logic';
import type { ClientMessage } from './schema';
import { ctx, game, player } from './test-fixtures';

const client = (playerId: string, message: ClientMessage) =>
  ({ kind: 'client', playerId, message }) as const;

describe('join', () => {
  it('creates the room with the joiner as admin and the provided settings', () => {
    const settings = {
      gameName: 'Sprint 42',
      allowPlayersToReveal: false,
      adminCanSpectate: true,
      votingType: 't-shirt' as const,
    };
    const r = reduce(null, client('a', { type: 'join', name: 'Ann', settings }), ctx);
    expect(r.state).toMatchObject({
      gameId: 'abc1234',
      adminId: 'a',
      settings,
      players: { a: { name: 'Ann', isAdmin: true, isSpectator: true } },
    });
    expect(r.changed).toBe(true);
  });

  it('ignores settings from a non-creator', () => {
    const s0 = reduce(null, client('a', { type: 'join', name: 'Ann' }), ctx).state!;
    const r = reduce(
      s0,
      client('b', { type: 'join', name: 'Bob', settings: { ...s0.settings, gameName: 'Hijack' } }),
      ctx,
    );
    expect(r.state!.settings.gameName).toBe('Planning Poker');
    expect(r.state!.players.b.isAdmin).toBe(false);
  });
});

describe('reveal → revealDue', () => {
  it('schedules and then completes a reveal with history', () => {
    const s0 = game({
      players: {
        a: player('a', { isAdmin: true, vote: '5', hasVoted: true }),
        b: player('b', { vote: '8', hasVoted: true }),
      },
    });
    const r1 = reduce(s0, client('a', { type: 'reveal' }), ctx);
    expect(r1.state!.countdownEnd).toBe(ctx.now + 3000);
    expect(r1.alarmAt).toBe(ctx.now + 3000);

    const r2 = reduce(r1.state, { kind: 'revealDue' }, { ...ctx, now: ctx.now + 3000 });
    expect(r2.state).toMatchObject({ votesRevealed: true, countdownEnd: null });
    expect(r2.state!.history).toHaveLength(1);
    expect(r2.alarmAt).toBeNull();
  });
});
```

### 6.3 `schema.test.ts`

- `ClientMessageSchema` accepts every valid frame and rejects `{ type: 'vote' }` (missing field),
  `{ type: 'nope' }`, and non-object input.
- `join` frame with legacy `isAdmin: true` parses and the output has no `isAdmin` key.
- `GameIdSchema.parse(' ABC1234 ')` → `'abc1234'`; `'x'` fails with `'Invalid Game ID format'`.
- `PlayerNameSchema` messages match §2.4 exactly.
- `PlayerSessionSchema` round-trips through `JSON.parse(JSON.stringify(...))`.

### 6.4 `constants.test.ts`

- Every deck ends with `'?'`, has unique values, and `DEFAULT_GAME_SETTINGS.votingType` is a key.

---

## 7. Verify

```bash
npx vitest run --project shared --coverage
```

- All tests green.
- Coverage for `shared/game-logic.ts` and `shared/stats.ts` ≥ 95 % lines.
- `npm run check` green.

Commit: `feat(shared): domain constants, zod schemas, stats and game reducer`.

---

## Old code superseded by this milestone (do not port)

| Old location                                                                                 | Replaced by                                                                |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `src/types/index.ts` (all interfaces/consts)                                                 | `shared/schema.ts` + `shared/constants.ts`                                 |
| `party/index.ts` lines 1–100 (types, defaults)                                               | `shared/schema.ts` + `shared/constants.ts`                                 |
| `party/index.ts` handlers + `captureRoundHistory`                                            | `shared/game-logic.ts` + `shared/stats.ts`                                 |
| `src/lib/utils.ts` `calculateRoundStats`, validators, `calculateBackoffDelay`                | `shared/stats.ts`, `shared/schema.ts`; backoff is handled by `partysocket` |
| `src/components/game/stats/index.tsx` `getWinningVote`                                       | `shared/stats.ts` `calculateWinners`                                       |
| `GameLocationState`, `isCreateGameState`, `CreateGameLocationState`, `JoinGameLocationState` | Deleted — no `location.state` hand-off (M5)                                |
| `ConnectionState`, `ErrorCode`, `GameError`, `createGameError`, `RECONNECTION_CONFIG`        | Client-only; re-created in `src/stores/game-store.ts` (M6)                 |
