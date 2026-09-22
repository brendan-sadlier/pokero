# M5 — Sessions, forms & guarded routes

> Source plan: [IMPLEMENTATION_PLAN.md §5 M5, §2.1 `/create` `/join`, §2.6, §8 #1–#3, #8](../IMPLEMENTATION_PLAN.md) · Size: M
> Outcome: `env`, `ids`, `session`, `share` helpers; Create and Join forms that **save a session
> then navigate**; `/join` with typed search; `/game/$gameId` guarded by `beforeLoad`. No
> `location.state` anywhere.

Prerequisites: M1 (schemas/constants) and M3 (shell, primitives). M4 optional.

---

## 1. Files

```
src/lib/
├─ env.ts
├─ ids.ts
├─ session.ts
├─ share.ts
└─ __tests__/{env,ids,session,share}.test.ts
src/features/create-game/
├─ create-game-form.tsx
└─ __tests__/create-game-form.test.tsx
src/features/join-game/
├─ join-game-form.tsx
└─ __tests__/join-game-form.test.tsx
src/features/game/screens/connecting-screen.tsx       # pendingComponent (full version in M7)
src/routes/create.tsx
src/routes/join.tsx
src/routes/game.$gameId.tsx
src/routes/__tests__/guards.test.tsx
src/main.tsx                                          # + clearExpiredSessions()
.env.example
```

---

## 2. `src/lib/env.ts`

```ts
import { z } from 'zod';

const EnvSchema = z.object({
  /** Host (no scheme) of the PartyServer Worker, e.g. `pokero-party.<acct>.workers.dev`. */
  VITE_PARTY_HOST: z.string().min(1).default('localhost:8787'),
});

export const env = EnvSchema.parse(import.meta.env);

export function isLocalPartyHost(host = env.VITE_PARTY_HOST): boolean {
  return /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
}

/** `http(s)://host` — used by the M8 metadata fetch. */
export function partyHttpOrigin(host = env.VITE_PARTY_HOST): string {
  return `${isLocalPartyHost(host) ? 'http' : 'https'}://${host}`;
}
```

`.env.example`:

```
# Host of the deployed Worker (no scheme). Defaults to localhost:8787 when unset.
VITE_PARTY_HOST=pokero-party.your-account.workers.dev
```

Renamed from `VITE_PARTYKIT_HOST` (plan §8 #8). `VITE_SESSION_ENCRYPTION_KEY` is gone.

---

## 3. `src/lib/ids.ts`

```ts
import { customAlphabet } from 'nanoid';
import { GAME_ID_LENGTH } from '@shared/constants';

const gameIdAlphabet = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', GAME_ID_LENGTH);

/** Always 7 lower-case alphanumerics → always satisfies GAME_ID_PATTERN (plan §3.4 #8). */
export function generateGameId(): string {
  return gameIdAlphabet();
}

export function generatePlayerId(): string {
  return `player_${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function normalizeGameId(raw: string): string {
  return raw.trim().toLowerCase();
}
```

The old `generateGameId` (`Math.random().toString(36).substring(2, 9)`) could return fewer than 5
characters and fail its own validator.

---

## 4. `src/lib/session.ts`

Port of `src/lib/sessionManager.ts` **minus** `crypto-js` (plan §3.4 #11), with Zod validation on
read and a narrower API.

```ts
import { SESSION_KEY_PREFIX, SESSION_TTL_MS } from '@shared/constants';
import { PlayerSessionSchema, type GameSettings, type PlayerSession } from '@shared/schema';

const key = (gameId: string) => `${SESSION_KEY_PREFIX}${gameId}`;

function storages(): Storage[] {
  const list: Storage[] = [];
  try {
    list.push(localStorage);
  } catch {
    /* disabled */
  }
  try {
    list.push(sessionStorage);
  } catch {
    /* disabled */
  }
  return list;
}

function isExpired(timestamp: number, now = Date.now()): boolean {
  return now - timestamp > SESSION_TTL_MS;
}

function parse(raw: string | null): PlayerSession | null {
  if (!raw) return null;
  try {
    const result = PlayerSessionSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function saveSession(input: Omit<PlayerSession, 'timestamp'>): void {
  const session: PlayerSession = { ...input, timestamp: Date.now() };
  const json = JSON.stringify(session);
  for (const storage of storages()) {
    try {
      storage.setItem(key(input.gameId), json);
      return;
    } catch {
      /* quota / disabled → try next */
    }
  }
  console.error('Failed to save player session to any storage');
}

export function getSession(gameId: string): PlayerSession | null {
  for (const storage of storages()) {
    const session = parse(storage.getItem(key(gameId)));
    if (!session) continue;
    if (isExpired(session.timestamp)) {
      clearSession(gameId);
      return null;
    }
    return session;
  }
  return null;
}

export function updateSessionSettings(gameId: string, settings: GameSettings): void {
  const session = getSession(gameId);
  if (session) saveSession({ ...session, settings });
}

export function clearSession(gameId: string): void {
  for (const storage of storages()) {
    try {
      storage.removeItem(key(gameId));
    } catch {
      /* ignore */
    }
  }
}

/** Sweep on startup: drop expired or unparsable sessions. */
export function clearExpiredSessions(now = Date.now()): void {
  for (const storage of storages()) {
    for (const k of Object.keys(storage)) {
      if (!k.startsWith(SESSION_KEY_PREFIX)) continue;
      const session = parse(storage.getItem(k));
      if (!session || isExpired(session.timestamp, now)) storage.removeItem(k);
    }
  }
}
```

Removed from the old module: `encrypt`/`decrypt`, `generatePlayerId` re-export, `updateSessionTimestamp`
(unused), the positional `savePlayerSession(gameId, playerId, name, isAdmin, settings)` signature.

---

## 5. `src/lib/share.ts`

```ts
import { normalizeGameId } from './ids';

export function generateShareUrl(gameId: string, origin = window.location.origin): string {
  return `${origin}/join?gameId=${normalizeGameId(gameId)}`;
}
```

---

## 6. `src/main.tsx` — sweep sessions on boot

```tsx
import { clearExpiredSessions } from '@/lib/session';
// …
clearExpiredSessions();
createRoot(document.getElementById('root')!).render(/* … */);
```

---

## 7. Routes

### 7.1 `src/routes/create.tsx`

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { CreateGameForm } from '@/features/create-game/create-game-form';

export const Route = createFileRoute('/create')({
  component: CreateGameForm,
});
```

### 7.2 `src/routes/join.tsx`

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { JoinGameForm } from '@/features/join-game/join-game-form';

export const JoinSearchSchema = z.object({
  // Invalid or missing → undefined, never a router error.
  gameId: z.string().trim().toLowerCase().optional().catch(undefined),
});

export const Route = createFileRoute('/join')({
  validateSearch: JoinSearchSchema,
  component: JoinGameForm,
});
```

> Deliberately lenient: the field is pre-filled with whatever was in the URL and the form's own
> `JoinGameFormSchema` reports "Invalid Game ID format" on submit.

### 7.3 `src/routes/game.$gameId.tsx`

```tsx
import { createFileRoute, notFound, redirect } from '@tanstack/react-router';
import { GameIdSchema } from '@shared/schema';
import { normalizeGameId } from '@/lib/ids';
import { getSession } from '@/lib/session';
import { ConnectingScreen } from '@/features/game/screens/connecting-screen';
import { GamePage } from '@/features/game/game-page';

export const Route = createFileRoute('/game/$gameId')({
  beforeLoad: ({ params }) => {
    const gameId = normalizeGameId(params.gameId);

    if (!GameIdSchema.safeParse(gameId).success) throw notFound();

    // Canonical lower-case URL (plan §8 #2)
    if (gameId !== params.gameId) {
      throw redirect({ to: '/game/$gameId', params: { gameId }, replace: true });
    }

    // Session-first: no session ⇒ collect a name on /join (plan §3.4 #10)
    const session = getSession(gameId);
    if (!session) throw redirect({ to: '/join', search: { gameId } });

    return { session };
  },
  pendingComponent: ConnectingScreen,
  component: GamePage,
});
```

Until M7 lands, `GamePage` can be a placeholder that prints `Route.useRouteContext().session`:

```tsx
// src/features/game/game-page.tsx (placeholder — replaced in M7)
import { getRouteApi } from '@tanstack/react-router';
const route = getRouteApi('/game/$gameId');
export function GamePage() {
  const { session } = route.useRouteContext();
  return <pre className="p-6">{JSON.stringify(session, null, 2)}</pre>;
}
```

`src/features/game/screens/connecting-screen.tsx` (final version, reused in M7):

```tsx
export function ConnectingScreen({ attempt = 0 }: { attempt?: number }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="mb-4 size-12 animate-spin rounded-full border-b-2 border-primary" />
      <p className="text-muted-foreground">
        Connecting to game{attempt > 0 && ` (attempt ${attempt})`}
      </p>
    </div>
  );
}
```

---

## 8. Forms

Both forms keep the old visual structure (Card + Field + AnimatedBackground + back link). Changes:
`Link`/`useNavigate` from TanStack, Tabler icons (`ArrowLeft → IconArrowLeft`,
`LoaderCircle`/`Loader2 → IconLoader2`), validation via `shared/schema`, **session saved before
navigation**, no `location.state`, `font-ruska` dropped.

### 8.1 `src/features/create-game/create-game-form.tsx`

```tsx
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { IconArrowLeft, IconLoader2 } from '@tabler/icons-react';
import { toast } from 'sonner';
import {
  DEFAULT_GAME_SETTINGS,
  MAX_GAME_NAME_LENGTH,
  MAX_NAME_LENGTH,
  VOTING_TYPE_LABELS,
  type VotingType,
} from '@shared/constants';
import { CreateGameFormSchema, type GameSettings } from '@shared/schema';
import { generateGameId, generatePlayerId } from '@/lib/ids';
import { saveSession } from '@/lib/session';
import { AnimatedBackground } from '@/components/animated-background';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

export function CreateGameForm() {
  const navigate = useNavigate();
  const [playerName, setPlayerName] = useState('');
  const [gameName, setGameName] = useState('');
  const [votingType, setVotingType] = useState<VotingType>(DEFAULT_GAME_SETTINGS.votingType);
  const [allowPlayersToReveal, setAllowPlayersToReveal] = useState<boolean>(
    DEFAULT_GAME_SETTINGS.allowPlayersToReveal,
  );
  const [adminCanSpectate, setAdminCanSpectate] = useState<boolean>(
    DEFAULT_GAME_SETTINGS.adminCanSpectate,
  );
  const [submitting, setSubmitting] = useState(false);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;

    const parsed = CreateGameFormSchema.safeParse({ playerName, gameName });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Please check the form');
      return;
    }

    setSubmitting(true);
    try {
      const gameId = generateGameId();
      const settings: GameSettings = {
        gameName: parsed.data.gameName || DEFAULT_GAME_SETTINGS.gameName,
        allowPlayersToReveal,
        adminCanSpectate,
        votingType,
      };
      saveSession({
        gameId,
        playerId: generatePlayerId(),
        playerName: parsed.data.playerName,
        isAdmin: true,
        settings,
      });
      void navigate({ to: '/game/$gameId', params: { gameId } });
    } catch (err) {
      console.error('Error creating game:', err);
      toast.error('Failed to create game. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen w-screen items-center justify-center overflow-hidden bg-background">
      <Button asChild variant="link" className="absolute top-4 left-4 z-20 gap-2">
        <Link to="/">
          <IconArrowLeft className="size-5" />
          Back to Home
        </Link>
      </Button>

      <div className="relative z-10 flex w-full max-w-sm flex-col gap-6">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-pretty text-primary">Create a Game</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} noValidate>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="playerName">Name</FieldLabel>
                  <Input
                    id="playerName"
                    name="playerName"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Enter your Name"
                    required
                    maxLength={MAX_NAME_LENGTH}
                    disabled={submitting}
                    autoComplete="name"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="gameName">Game Name</FieldLabel>
                  <Input
                    id="gameName"
                    name="gameName"
                    value={gameName}
                    onChange={(e) => setGameName(e.target.value)}
                    placeholder={`Leave blank for '${DEFAULT_GAME_SETTINGS.gameName}'`}
                    maxLength={MAX_GAME_NAME_LENGTH}
                    disabled={submitting}
                    autoComplete="off"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="votingType">Voting Type</FieldLabel>
                  <Select
                    value={votingType}
                    onValueChange={(v) => setVotingType(v as VotingType)}
                    disabled={submitting}
                  >
                    <SelectTrigger id="votingType" className="w-full">
                      <SelectValue placeholder="Select voting type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(VOTING_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Accordion type="single" collapsible className="w-full px-2">
                  <AccordionItem value="settings">
                    <AccordionTrigger>Game Settings</AccordionTrigger>
                    <AccordionContent className="flex flex-col gap-2">
                      <Field>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="playerReveal"
                            checked={allowPlayersToReveal}
                            onCheckedChange={setAllowPlayersToReveal}
                            disabled={submitting}
                          />
                          <Label htmlFor="playerReveal">Allow All Players to Reveal Cards</Label>
                        </div>
                      </Field>
                      <Field>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="spectatorMode"
                            checked={adminCanSpectate}
                            onCheckedChange={setAdminCanSpectate}
                            disabled={submitting}
                          />
                          <Label htmlFor="spectatorMode">Spectator Mode</Label>
                        </div>
                      </Field>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <Field>
                  <Button type="submit" disabled={submitting} className="w-full">
                    {submitting ? (
                      <>
                        <IconLoader2 className="animate-spin" /> Creating...
                      </>
                    ) : (
                      'Create Game'
                    )}
                  </Button>
                  <FieldDescription className="text-center">
                    Already have a game? <Link to="/join">Join a Game</Link>
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>

      <AnimatedBackground />
    </div>
  );
}
```

> `noValidate` on the form so the toasts (not the browser's bubble) report `required` failures — this
> matches the old behaviour where `validatePlayerName` produced "Please enter your name".

### 8.2 `src/features/join-game/join-game-form.tsx`

```tsx
import { useState, type FormEvent } from 'react';
import { Link, getRouteApi, useNavigate } from '@tanstack/react-router';
import { IconArrowLeft, IconLoader2 } from '@tabler/icons-react';
import { toast } from 'sonner';
import { MAX_NAME_LENGTH } from '@shared/constants';
import { JoinGameFormSchema } from '@shared/schema';
import { generatePlayerId, normalizeGameId } from '@/lib/ids';
import { saveSession } from '@/lib/session';
import { AnimatedBackground } from '@/components/animated-background';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

const route = getRouteApi('/join');

export function JoinGameForm() {
  const navigate = useNavigate();
  const { gameId: initialGameId } = route.useSearch();
  const [playerName, setPlayerName] = useState('');
  const [gameId, setGameId] = useState(initialGameId ?? '');
  const [submitting, setSubmitting] = useState(false);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;

    const parsed = JoinGameFormSchema.safeParse({ playerName, gameId });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Please check the form');
      return;
    }

    setSubmitting(true);
    try {
      saveSession({
        gameId: parsed.data.gameId,
        playerId: generatePlayerId(),
        playerName: parsed.data.playerName,
        isAdmin: false,
      });
      void navigate({ to: '/game/$gameId', params: { gameId: parsed.data.gameId } });
    } catch (err) {
      console.error('Error joining game:', err);
      toast.error('Failed to join the game. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen w-screen items-center justify-center overflow-hidden bg-background">
      <Button asChild variant="link" className="absolute top-4 left-4 z-20 gap-2">
        <Link to="/">
          <IconArrowLeft className="size-5" />
          Back to Home
        </Link>
      </Button>

      <div className="relative z-10 flex w-full max-w-sm flex-col gap-6">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-pretty text-primary">Join a Game</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} noValidate>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="playerName">Name</FieldLabel>
                  <Input
                    id="playerName"
                    name="playerName"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Enter your Name"
                    required
                    maxLength={MAX_NAME_LENGTH}
                    disabled={submitting}
                    autoComplete="name"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="gameId">Game ID</FieldLabel>
                  <Input
                    id="gameId"
                    name="gameId"
                    value={gameId}
                    onChange={(e) => setGameId(normalizeGameId(e.target.value))}
                    placeholder="Enter Game ID"
                    required
                    disabled={submitting}
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                  />
                  <FieldDescription className="text-xs text-muted-foreground">
                    Game IDs are case-insensitive
                  </FieldDescription>
                </Field>

                <Field>
                  <Button type="submit" disabled={submitting} className="w-full">
                    {submitting ? (
                      <>
                        <IconLoader2 className="animate-spin" /> Joining...
                      </>
                    ) : (
                      'Join Game'
                    )}
                  </Button>
                  <FieldDescription className="text-center">
                    Don&apos;t have a Game ID? <Link to="/create">Create a Game</Link>
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
      <AnimatedBackground />
    </div>
  );
}
```

Old bug fixed in passing: the Name label had `htmlFor="name"` while the input id was `playerName`.

---

## 9. Tests

### 9.1 `src/lib/__tests__/session.test.ts`

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearExpiredSessions,
  clearSession,
  getSession,
  saveSession,
  updateSessionSettings,
} from '@/lib/session';
import { SESSION_TTL_MS } from '@shared/constants';

const base = { gameId: 'abc1234', playerId: 'player_1-x', playerName: 'Ann', isAdmin: true };

describe('session', () => {
  beforeEach(() => vi.useFakeTimers({ now: 1_000_000 }));
  afterEach(() => vi.useRealTimers());

  it('round-trips through localStorage', () => {
    saveSession(base);
    expect(getSession('abc1234')).toMatchObject({ ...base, timestamp: 1_000_000 });
  });

  it('expires after 24h and clears itself', () => {
    saveSession(base);
    vi.setSystemTime(1_000_000 + SESSION_TTL_MS + 1);
    expect(getSession('abc1234')).toBeNull();
    expect(localStorage.getItem('pokero_session_abc1234')).toBeNull();
  });

  it('rejects tampered / legacy encrypted payloads', () => {
    localStorage.setItem('pokero_session_abc1234', 'U2FsdGVkX1…');
    expect(getSession('abc1234')).toBeNull();
  });

  it('updateSessionSettings preserves identity', () => {
    saveSession(base);
    updateSessionSettings('abc1234', {
      gameName: 'X',
      allowPlayersToReveal: false,
      adminCanSpectate: true,
      votingType: 't-shirt',
    });
    expect(getSession('abc1234')?.settings?.gameName).toBe('X');
    expect(getSession('abc1234')?.playerId).toBe(base.playerId);
  });

  it('clearExpiredSessions sweeps only expired pokero keys', () => {
    localStorage.setItem('unrelated', '1');
    saveSession(base);
    saveSession({ ...base, gameId: 'zzz9999' });
    localStorage.setItem(
      'pokero_session_zzz9999',
      JSON.stringify({ ...base, gameId: 'zzz9999', timestamp: 0 }),
    );
    clearExpiredSessions();
    expect(localStorage.getItem('unrelated')).toBe('1');
    expect(getSession('abc1234')).not.toBeNull();
    expect(localStorage.getItem('pokero_session_zzz9999')).toBeNull();
    clearSession('abc1234');
    expect(getSession('abc1234')).toBeNull();
  });
});
```

### 9.2 `src/lib/__tests__/ids.test.ts`

- 1 000 generated game ids all match `GAME_ID_PATTERN` and have length 7.
- `generatePlayerId()` matches `/^player_\d+-[a-z0-9]{1,7}$/`.
- `normalizeGameId('  ABC1234 ')` → `'abc1234'`.

### 9.3 `src/routes/__tests__/guards.test.tsx`

```tsx
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { routeTree } from '@/routeTree.gen';
import { saveSession } from '@/lib/session';

async function go(path: string) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  render(<RouterProvider router={router} />);
  await waitFor(() => expect(router.state.status).toBe('idle'));
  return router;
}

describe('/game/$gameId guard', () => {
  it('redirects to /join?gameId= when there is no session', async () => {
    const router = await go('/game/abc1234');
    expect(router.state.location.pathname).toBe('/join');
    expect(router.state.location.search).toEqual({ gameId: 'abc1234' });
    expect(await screen.findByLabelText('Game ID')).toHaveValue('abc1234');
  });

  it('canonicalises upper-case ids', async () => {
    saveSession({ gameId: 'abc1234', playerId: 'p', playerName: 'Ann', isAdmin: false });
    const router = await go('/game/ABC1234');
    expect(router.state.location.pathname).toBe('/game/abc1234');
  });

  it('404s on malformed ids', async () => {
    await go('/game/x');
    expect(await screen.findByText('Page not found')).toBeInTheDocument();
  });

  it('renders the game route when a session exists', async () => {
    saveSession({ gameId: 'abc1234', playerId: 'p', playerName: 'Ann', isAdmin: false });
    const router = await go('/game/abc1234');
    expect(router.state.location.pathname).toBe('/game/abc1234');
  });
});
```

### 9.4 Form tests

`create-game-form.test.tsx`

- Submitting with an empty name shows the toast **"Please enter your name"** (assert via
  `screen.findByText`; sonner renders into the document when `<Toaster />` is mounted — the root
  route mounts it, so render through the router at `/create`).
- Valid submit → `router.state.location.pathname` matches `/^\/game\/[a-z0-9]{7}$/` and
  `getSession(id)` has `isAdmin: true`, `settings.gameName === 'Planning Poker'` when blank.
- Custom game name + T-Shirt + spectator switch → session settings reflect them.

`join-game-form.test.tsx`

- `/join?gameId=ABC1234` pre-fills `abc1234`.
- Typing `XyZ` produces `xyz` in the input.
- Empty id → "Please enter a valid Game ID"; `'ab'` → "Invalid Game ID format".
- Valid submit saves `isAdmin: false` and navigates.

---

## 10. Verify

1. `npm run dev` (Worker not needed yet).
2. `/create` → fill name → **Create Game** → URL `/game/<7 chars>`, placeholder shows the session JSON
   with `isAdmin: true` and your settings.
3. Refresh → still on the game route (session persisted). Close tab → reopen → same.
4. Open `/game/<same id>` in a private window → redirected to `/join?gameId=<id>` with the field
   pre-filled.
5. `/game/ABC1234` (with session for `abc1234`) → URL rewritten to lower case.
6. `/game/x` → 404 page.
7. `npm run check` green.

Commit: `feat(routes): session-first create/join flows and guarded game route`.

---

## Old code superseded by this milestone

| Old                                                                                               | Action                                               |
| ------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `src/pages/CreateGame.tsx`, `src/pages/JoinGame.tsx`                                              | → `features/create-game`, `features/join-game`       |
| `navigate('/game/id', { state })`, `useLocation().state`, `GameLocationState`                     | Removed — session is the hand-off                    |
| `src/lib/sessionManager.ts`                                                                       | → `src/lib/session.ts` (no crypto, Zod-validated)    |
| `generateGameId`, `generatePlayerId`, `normalizeGameId`, `generateShareUrl` in `src/lib/utils.ts` | → `src/lib/ids.ts`, `src/lib/share.ts`               |
| `validate*` helpers in `src/lib/utils.ts`                                                         | → `CreateGameFormSchema` / `JoinGameFormSchema`      |
| GamePage `beforeunload` → `clearPlayerSession` effect                                             | Removed — refresh = reconnect (plan §8 #1)           |
| GamePage "Please enter your name to join the game." redirect effect                               | Removed — `beforeLoad` redirects to `/join` instead  |
| GamePage `window.history.replaceState` lower-casing                                               | Removed — `beforeLoad` `redirect({ replace: true })` |
| `VITE_PARTYKIT_HOST`, `VITE_SESSION_ENCRYPTION_KEY`                                               | → `VITE_PARTY_HOST` only                             |
