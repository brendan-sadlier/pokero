# M8 — Room metadata endpoint + TanStack Query

> Source plan: [IMPLEMENTATION_PLAN.md §5 M8, §3.4 #15, §8 #9](../IMPLEMENTATION_PLAN.md) · Size: S (conditional — recommended)
> Outcome: `/join?gameId=…` tells the user whether the room exists ("Joining **Sprint 42** (3
> players)" vs "Game not found") **before** a WebSocket is opened, and joining an unknown room no
> longer silently creates it. TanStack Query is introduced only for this request/response data.

Prerequisites: M2 (`onRequest` + CORS already implemented), M5 (join form, env).

---

## 1. Files

```
src/queries/game.ts
src/queries/__tests__/game.test.ts
src/lib/query-client.ts
src/routes/__root.tsx            # createRootRouteWithContext
src/router.tsx                   # context: { queryClient }
src/main.tsx                     # QueryClientProvider
src/routes/join.tsx              # loaderDeps + loader
src/features/join-game/join-game-form.tsx   # room status + block unknown rooms
src/routes/game.$gameId.tsx      # (optional) pre-flight for direct links
```

---

## 2. Server — already done in M2

`PokeroServer.onRequest` returns:

```
GET /parties/pokero-server/:gameId
200 { "exists": true, "gameName": "…", "playerCount": 2, "votingType": "fibonacci" }
404 { "exists": false }
```

CORS is applied by the Worker `fetch` from `ALLOWED_ORIGINS` (+ localhost). For production, make sure
`wrangler.jsonc` `vars.ALLOWED_ORIGINS` lists the exact site origin(s), e.g.
`"https://pokero.dev,https://www.pokero.dev"`. Redeploy after editing (`npm run deploy:party`).

---

## 3. `src/lib/query-client.ts`

```ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
```

---

## 4. `src/queries/game.ts`

```ts
import { queryOptions } from '@tanstack/react-query';
import { GameIdSchema, GameMetaSchema, type GameMeta } from '@shared/schema';
import { partyHttpOrigin } from '@/lib/env';

export class GameMetaError extends Error {
  constructor(public readonly status: number) {
    super(`Room metadata request failed with ${status}`);
  }
}

/** `null` ⇒ the room does not exist (404). */
export async function fetchGameMeta(
  gameId: string,
  signal?: AbortSignal,
): Promise<GameMeta | null> {
  const res = await fetch(
    `${partyHttpOrigin()}/parties/pokero-server/${encodeURIComponent(gameId)}`,
    {
      signal,
      headers: { Accept: 'application/json' },
    },
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new GameMetaError(res.status);
  return GameMetaSchema.parse(await res.json());
}

export const gameQueries = {
  all: () => ['game'] as const,
  meta: (gameId: string) =>
    queryOptions({
      queryKey: [...gameQueries.all(), gameId, 'meta'] as const,
      queryFn: ({ signal }) => fetchGameMeta(gameId, signal),
      enabled: GameIdSchema.safeParse(gameId).success,
    }),
};
```

---

## 5. Router context

### 5.1 `src/routes/__root.tsx`

Change the route factory; everything else from M3 stays:

```tsx
import { createRootRouteWithContext } from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootLayout,
  notFoundComponent: NotFound,
  errorComponent: RouteError,
});
```

### 5.2 `src/router.tsx`

```tsx
import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
import { queryClient } from './lib/query-client';

export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0, // let Query own staleness
  scrollRestoration: true,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
```

### 5.3 `src/main.tsx`

```tsx
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/query-client';
// …
<StrictMode>
  <QueryClientProvider client={queryClient}>
    <RouterProvider router={router} />
  </QueryClientProvider>
</StrictMode>;
```

(Optionally add `@tanstack/react-query-devtools` in dev alongside the router devtools.)

---

## 6. `src/routes/join.tsx` — prefetch in the loader

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { gameQueries } from '@/queries/game';
import { JoinGameForm } from '@/features/join-game/join-game-form';

export const JoinSearchSchema = z.object({
  gameId: z.string().trim().toLowerCase().optional().catch(undefined),
});

export const Route = createFileRoute('/join')({
  validateSearch: JoinSearchSchema,
  loaderDeps: ({ search }) => ({ gameId: search.gameId }),
  loader: async ({ context: { queryClient }, deps: { gameId } }) => {
    if (!gameId) return;
    // Warm the cache; failures are surfaced by the form's useQuery, not the route.
    await queryClient.ensureQueryData(gameQueries.meta(gameId)).catch(() => undefined);
  },
  component: JoinGameForm,
});
```

---

## 7. `join-game-form.tsx` — room status + guard

Add to the form from M5:

```tsx
import { useQuery } from '@tanstack/react-query';
import { GameIdSchema } from '@shared/schema';
import { gameQueries } from '@/queries/game';
// …
const validId = GameIdSchema.safeParse(gameId).success;
const meta = useQuery({ ...gameQueries.meta(gameId), enabled: validId });
const roomMissing = validId && meta.isSuccess && meta.data === null;
```

Below the Game ID field description, render:

```tsx
{
  validId && meta.isPending && (
    <FieldDescription className="text-xs">Checking room…</FieldDescription>
  );
}
{
  roomMissing && (
    <FieldDescription className="text-xs text-destructive">Game not found</FieldDescription>
  );
}
{
  meta.data && (
    <FieldDescription className="text-xs">
      Joining <strong>{meta.data.gameName}</strong> ({meta.data.playerCount}{' '}
      {meta.data.playerCount === 1 ? 'player' : 'players'})
    </FieldDescription>
  );
}
{
  validId && meta.isError && (
    <FieldDescription className="text-xs text-muted-foreground">
      Couldn&apos;t check the room right now — you can still try to join.
    </FieldDescription>
  );
}
```

In `onSubmit`, after schema validation and before `saveSession`:

```tsx
if (roomMissing) {
  toast.error('Game not found');
  return;
}
```

Network errors do **not** block joining (the Worker might be reachable over WS even if the fetch
fails, e.g. a corporate proxy); only a definitive 404 blocks.

Debounce: `useQuery` re-runs on each keystroke that produces a valid id. With a 7-character id and
`staleTime: 10s` this is at most one request per distinct id — acceptable. If needed, wrap `gameId`
in a 300 ms debounced value before passing it to `gameQueries.meta`.

---

## 8. Optional: pre-flight on direct game links

In `src/routes/game.$gameId.tsx`, after the session check:

```ts
loader: async ({ context: { queryClient }, params }) => {
  const meta = await queryClient.ensureQueryData(gameQueries.meta(params.gameId)).catch(() => undefined);
  if (meta === null) {
    // Room gone (e.g. admin ended it). Clear stale session and send to /join with a hint.
    clearSession(params.gameId);
    throw redirect({ to: '/join', search: { gameId: params.gameId } });
  }
},
```

Trade-off: adds one HTTP round-trip before the WebSocket for every game load. Skip it if you prefer
the room to be **created** by whoever arrives first with a session (which is what the WebSocket
`join` does today). The plan lists this as optional; the recommended default is to include it only
for the `/join` route (§7).

---

## 9. Tests

### 9.1 `src/queries/__tests__/game.test.ts`

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchGameMeta, GameMetaError } from '@/queries/game';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('fetchGameMeta', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns parsed metadata on 200', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          json({ exists: true, gameName: 'S', playerCount: 2, votingType: 'fibonacci' }),
        ),
    );
    await expect(fetchGameMeta('abc1234')).resolves.toEqual({
      exists: true,
      gameName: 'S',
      playerCount: 2,
      votingType: 'fibonacci',
    });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/parties/pokero-server/abc1234'),
      expect.anything(),
    );
  });

  it('returns null on 404', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ exists: false }, 404)));
    await expect(fetchGameMeta('abc1234')).resolves.toBeNull();
  });

  it('throws GameMetaError on 5xx', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({}, 503)));
    await expect(fetchGameMeta('abc1234')).rejects.toBeInstanceOf(GameMetaError);
  });
});
```

### 9.2 Join form (extend M5 tests)

- `/join?gameId=abc1234` with fetch stubbed to 200 → shows "Joining **Sprint** (2 players)".
- Stubbed 404 → shows "Game not found"; submit with a valid name → toast "Game not found", no
  navigation, no session saved.
- Stubbed network error → helper text mentions "Couldn't check", submit still navigates.

The route tests in M5 build a router without `context`; update the helper to pass
`context: { queryClient: new QueryClient() }` (a fresh client per test).

### 9.3 Server (already in M2)

`GET metadata: 404 before join, 200 after` and the CORS assertions cover the endpoint.

---

## 10. Verify

1. `npm run party` + `npm run dev`.
2. Create a game in profile A. In profile B open `/join?gameId=<id>` → "Joining **Planning Poker**
   (1 player)". Network tab shows one `GET /parties/pokero-server/<id>` with
   `Access-Control-Allow-Origin: http://localhost:3000`.
3. `/join?gameId=doesnotexist` → "Game not found"; submitting toasts and **no WebSocket** is opened
   (check WS tab).
4. Stop the Worker → `/join?gameId=<id>` shows the "Couldn't check" helper; submit still proceeds
   to the game route (which then shows Connecting/Error as in M7).
5. `npm run check` green.

Commit: `feat(join): room metadata pre-flight with tanstack query`.

---

## Old behaviour superseded by this milestone

| Old                                                        | New                                                  |
| ---------------------------------------------------------- | ---------------------------------------------------- |
| Joining any id opened a WS and the server created the room | Definitive 404 blocks the join with "Game not found" |
| No request/response data path                              | One HTTP endpoint, cached by TanStack Query          |
