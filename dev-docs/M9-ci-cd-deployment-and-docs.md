# M9 — CI/CD, deployment & docs

> Source plan: [IMPLEMENTATION_PLAN.md §5 M9, §8 #5](../IMPLEMENTATION_PLAN.md) · Size: S
> Outcome: PRs run `npm run check` + build; pushes to `main` deploy the Worker with Wrangler and
> the SPA to Vercel; observability is on; the README documents local dev, env vars and architecture.

Prerequisites: all earlier milestones green locally; a Cloudflare account and a Vercel project.

---

## 1. Files

```
.github/workflows/ci.yml
.github/workflows/deploy.yml
.github/dependabot.yml            # optional
README.md                         # rewritten sections
wrangler.jsonc                    # ALLOWED_ORIGINS for production
.env.example                      # from M5
```

Delete the old `.github/workflows/deploy.yml` (PartyKit) and — unless still wanted —
`labeler.yml` / `release-drafter.yml` (they are unrelated to the runtime and can be kept as-is).

---

## 2. One-time Cloudflare setup

```bash
npx wrangler login
npx wrangler deploy            # first deploy creates the Worker + DO namespace + runs migration v1
npx wrangler tail              # sanity: connect a client, see "connection ... error" only on faults
```

Note the Worker host printed by the deploy, e.g. `pokero-party.<account>.workers.dev`. That value is
`VITE_PARTY_HOST` for the SPA build. If you attach a custom domain (e.g. `party.pokero.dev`) via the
Cloudflare dashboard, use that instead.

Create an API token (Cloudflare dashboard → _My Profile → API Tokens_ → template **Edit Cloudflare
Workers**) and add to the GitHub repo secrets:

| Secret                  | Value                                    |
| ----------------------- | ---------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | the token                                |
| `CLOUDFLARE_ACCOUNT_ID` | dashboard → Workers & Pages → Account ID |

---

## 3. One-time Vercel setup

Import the GitHub repo in Vercel (framework preset: Vite). Settings:

| Setting            | Value                           |
| ------------------ | ------------------------------- |
| Build command      | `npm run build`                 |
| Output directory   | `dist`                          |
| Install command    | `npm ci`                        |
| Env var (all envs) | `VITE_PARTY_HOST=<worker host>` |
| Production branch  | `main`                          |

`vercel.json` (from M0) rewrites every path to `/` so TanStack Router handles deep links.

Vercel's Git integration builds previews for PRs and production for `main`; no GitHub Action is
needed for the SPA. (Alternative — CLI deploy from Actions — is sketched in §5.2.)

---

## 4. `.github/workflows/ci.yml`

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  check:
    name: Lint · Typecheck · Test · Build
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - run: npm ci

      - name: Generate Worker types
        run: npm run types

      - name: Ensure generated files are committed
        run: git diff --exit-code -- worker-configuration.d.ts src/routeTree.gen.ts

      - run: npm run lint
      - run: npm run typecheck
      - run: npm run format:check

      - name: Test (with coverage)
        run: npm run test:coverage

      - name: Build SPA
        run: npx vite build
        env:
          VITE_PARTY_HOST: pokero-party.example.workers.dev

      - name: Wrangler dry-run
        run: npx wrangler deploy --dry-run --outdir=.wrangler/dry-run

      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist
          retention-days: 7
```

> `npm run test:coverage` fails the job if the thresholds in `vitest.config.ts` (M0 §5.1) are not met.
> The `git diff --exit-code` step catches a forgotten `routeTree.gen.ts` / `worker-configuration.d.ts`
> commit — both are required by `tsc -b`.

---

## 5. `.github/workflows/deploy.yml`

### 5.1 Worker (required)

```yaml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

concurrency:
  group: deploy-party
  cancel-in-progress: false

jobs:
  party:
    name: Deploy Worker (pokero-party)
    runs-on: ubuntu-latest
    timeout-minutes: 10
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run types
      - run: npx vitest run --project shared --project party

      - name: Deploy with Wrangler
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: deploy

      - name: Summary
        run: echo "Worker deployed. Tail with: npx wrangler tail pokero-party" >> "$GITHUB_STEP_SUMMARY"
```

### 5.2 SPA via CLI (only if you do **not** use Vercel's Git integration)

Add a second job that needs `party`:

```yaml
web:
  name: Deploy SPA (Vercel)
  needs: party
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: 22
        cache: npm
    - run: npm ci
    - run: npm run build
      env:
        VITE_PARTY_HOST: ${{ vars.VITE_PARTY_HOST }}
    - run: npx vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}
      env:
        VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
        VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
```

(`--prebuilt` requires `npx vercel build` instead of `npm run build`; follow Vercel's CLI docs for
the exact pair of commands for your CLI version.)

Ordering matters: the Worker deploys first so a new protocol never meets an old server.

---

## 6. Production `wrangler.jsonc`

```jsonc
"vars": {
  "ALLOWED_ORIGINS": "https://pokero.dev,https://www.pokero.dev"
}
```

Preview deployments on `*.vercel.app` will fail the metadata `GET` (CORS) but WebSockets still work
(browsers do not enforce CORS on WS upgrades). If previews need M8's pre-flight, add the preview
origin(s) or a second Worker environment.

Observability is already enabled (`"observability": { "enabled": true }`); view logs in the
Cloudflare dashboard → Workers → `pokero-party` → Logs, or `npx wrangler tail pokero-party`.

---

## 7. Single-Worker hosting (decision §8 #5 — deferred)

Not implemented now. If revisited: add `"assets": { "directory": "./dist", "not_found_handling": "single-page-application" }` to `wrangler.jsonc`, build the SPA before `wrangler deploy`, set
`VITE_PARTY_HOST` to the same host, and drop Vercel + CORS. Loses Vercel PR previews.

---

## 8. README rewrite

Keep the intro, screenshot and licence; replace the technical sections with:

### 8.1 Run locally

```bash
npm ci
npm run party        # Worker + Durable Object on http://localhost:8787
npm run dev          # SPA on http://localhost:3000 (VITE_PARTY_HOST defaults to localhost:8787)
```

### 8.2 Environment variables

| Where  | Variable          | Purpose                                               |
| ------ | ----------------- | ----------------------------------------------------- |
| SPA    | `VITE_PARTY_HOST` | Worker host without scheme (`localhost:8787` default) |
| Worker | `ALLOWED_ORIGINS` | Comma-separated browser origins for HTTP + CORS       |

### 8.3 Scripts

Table of the `package.json` scripts from M0 §8.

### 8.4 Project structure

```
shared/   pure domain: constants, zod schemas, game reducer, stats (used by both sides)
party/    Cloudflare Worker + PokeroServer Durable Object (partyserver)
src/
  routes/     TanStack Router file routes (__root, index, create, join, game.$gameId)
  features/   landing · create-game · join-game · game
  components/ shadcn ui + theme/logo/background/error components
  lib/        env · ids · session · share · game-client · emitter · query-client
  stores/     gameStore + derived stores (@tanstack/store)
  queries/    TanStack Query options (room metadata)
```

### 8.5 Architecture

Paste the Mermaid diagram from [IMPLEMENTATION_PLAN.md §3.3](../IMPLEMENTATION_PLAN.md) and the
wire-protocol block from §4.

### 8.6 Deploy

- Worker: push to `main` → `deploy.yml` → `wrangler deploy`.
- SPA: Vercel Git integration; env `VITE_PARTY_HOST`.

---

## 9. Optional: `.github/dependabot.yml`

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule: { interval: weekly }
    groups:
      tanstack: { patterns: ['@tanstack/*'] }
      cloudflare: { patterns: ['wrangler', 'partyserver', '@cloudflare/*'] }
      radix: { patterns: ['radix-ui'] }
  - package-ecosystem: github-actions
    directory: /
    schedule: { interval: weekly }
```

---

## 10. Final acceptance (plan §9)

Automated

- [ ] `ci.yml` green on a PR.
- [ ] Coverage gates met (`shared/` ≥ 95 %, `src/lib` + `src/stores` ≥ 90 %).
- [ ] `vite build` output: landing chunk excludes game code (grep `dist/assets/*.js` for `Reveal Votes`).
- [ ] `wrangler deploy --dry-run` succeeds.

Manual (production URLs, two browser profiles) — run the full list in plan §9 once after the first
production deploy, plus:

- [ ] `https://pokero.dev/join?gameId=<live id>` shows room metadata (CORS header present).
- [ ] `npx wrangler tail pokero-party` shows no errors during a full round.
- [ ] Deep link `https://pokero.dev/game/<id>` in a fresh profile → `/join?gameId=<id>`.

Commit: `ci: check workflow, wrangler deploy, readme`.

---

## Old files superseded by this milestone

| Old                                                                                             | Action                                                                  |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `.github/workflows/deploy.yml`                                                                  | Rewritten (Wrangler instead of `partykit deploy`; no `.env.production`) |
| Secrets `PARTYKIT_TOKEN`, `PARTYKIT_LOGIN`, `VITE_PARTYKIT_HOST`, `VITE_SESSION_ENCRYPTION_KEY` | Remove from the repo settings                                           |
| README "PartyKit" sections                                                                      | Rewritten                                                               |
