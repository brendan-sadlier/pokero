# Pokero rebuild — developer docs

Step-by-step instructions for every milestone of the greenfield rebuild described in
[IMPLEMENTATION_PLAN.md](../IMPLEMENTATION_PLAN.md). Each document is self-contained: what to
create (with code), what to change, what **not** to carry over from the current repo, tests to
write, and how to verify before committing.

| #   | Document                                                                    | Size | Depends on | Ships                                                                                    |
| --- | --------------------------------------------------------------------------- | ---- | ---------- | ---------------------------------------------------------------------------------------- |
| M0  | [Scaffold & toolchain](M0-scaffold-and-toolchain.md)                        | S    | —          | Vite/TS/Tailwind/shadcn config, TanStack Router plugin, Wrangler stub, Vitest ×3, ESLint |
| M1  | [Shared domain](M1-shared-domain.md)                                        | M    | M0         | `shared/` constants, Zod schemas, stats, `reduce()` game logic + tests                   |
| M2  | [Server (PartyServer DO)](M2-server-partyserver.md)                         | M    | M1         | `PokeroServer` with storage, alarm, hibernation, CORS, metadata GET + worker tests       |
| M3  | [Design system & app shell](M3-design-system-and-app-shell.md)              | M    | M0         | tokens, fonts, primitives, custom Button, theme, Toaster, root route, 404, error         |
| M4  | [Landing page](M4-landing-page.md)                                          | S    | M3         | `/` with all sections ported to TanStack `Link` + `motion/react`                         |
| M5  | [Sessions, forms & guarded routes](M5-sessions-forms-and-guarded-routes.md) | M    | M1, M3     | env/ids/session/share libs, Create & Join forms, `beforeLoad` guard                      |
| M6  | [Game client & store](M6-game-client-and-store.md)                          | M    | M1, M2, M5 | `gameClient` (PartySocket) + `gameStore` (TanStack Store) + hook                         |
| M7  | [Game room UI](M7-game-room-ui.md)                                          | L    | M3, M5, M6 | every game screen/dialog, event → toast wiring, integration tests                        |
| M8  | [Room metadata + Query](M8-room-metadata-and-query.md)                      | S    | M2, M5     | "Game not found" pre-flight on `/join` via TanStack Query                                |
| M9  | [CI/CD, deployment & docs](M9-ci-cd-deployment-and-docs.md)                 | S    | all        | GitHub Actions, Wrangler + Vercel deploy, README                                         |

## Conventions used in these docs

- **Fresh directory.** Commands assume a new `pokero/` created in M0. The current repo is only a
  reference; each doc ends with an "Old code superseded" table listing what is ported vs dropped.
- **Paths.** `@/…` → `src/…`, `@shared/…` → `shared/…` (browser code). Worker code imports
  `../shared/…` relatively.
- **Every milestone ends green.** `npm run check` (lint + `tsc -b` + all Vitest projects) must pass
  before the suggested commit message at the end of each doc.
- **Plan corrections.** Where the implementation plan sketch does not match the real library API,
  the doc says so explicitly (e.g. M2: `routePartykitRequest` has no `cors` option; M0: Vitest
  `projects` replaces `vitest.workspace.ts`; M6: reconnect counting uses close events, not
  `socket.retryCount`).

## Suggested order

M0 → M1 → M2 (server can be verified with `wscat`) → M3 → M4 → M5 → M6 → M7 → M8 → M9.
M3/M4 can be developed in parallel with M1/M2 by different people; M5 needs both tracks.
