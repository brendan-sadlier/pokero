# M0 — Scaffold & toolchain

> Source plan: [IMPLEMENTATION_PLAN.md §5 M0](../IMPLEMENTATION_PLAN.md) · Size: S
> Outcome: an empty Vite + React 19 + TS app with Tailwind v4, shadcn config, TanStack Router plugin,
> a stub Cloudflare Worker, Vitest (3 projects), ESLint 9 + Prettier + Husky, and a green `npm run check`.

Everything in this document happens in a **fresh directory**. Nothing is copied from the old repo yet;
the old repo is referenced only in the "Do not carry over" section at the end.

---

## 0. Prerequisites

- Node ≥ 22 (LTS), npm ≥ 10.
- A Cloudflare account (free tier is enough) — needed for `wrangler login` in M9, not before.
- `git` initialised in the new directory (`git init -b main`).

---

## 1. Create the Vite app

```bash
npm create vite@latest pokero -- --template react-ts
cd pokero
npm install
```

Delete the template's demo content — it will be replaced in M3:

```bash
rm -f src/App.tsx src/App.css src/index.css src/assets/react.svg public/vite.svg
```

Keep `src/main.tsx` for now (it is rewritten in M3) and `index.html` (edited below).

### 1.1 `index.html`

Replace the file with:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta
      name="description"
      content="Pokero — free, instant planning poker. No sign-up. Share a link and play."
    />
    <link rel="icon" type="image/svg+xml" href="/pokero.svg" />
    <title>Pokero</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Copy the static assets from the old repo: `public/pokero.svg` (required), `public/demo-light.png`,
`public/demo-dark.png` (only used by the README). Do **not** copy `public/pokero-screenshot.png` unless
the README references it.

---

## 2. Install dependencies

Runtime:

```bash
npm i react@^19 react-dom@^19 \
  @tanstack/react-router @tanstack/store @tanstack/react-store @tanstack/react-query \
  zod nanoid partysocket \
  motion sonner @tabler/icons-react react-wrap-balancer \
  class-variance-authority clsx tailwind-merge radix-ui \
  @fontsource-variable/outfit @fontsource-variable/bricolage-grotesque
```

Dev / build:

```bash
npm i -D typescript@~5.9 vite @vitejs/plugin-react \
  tailwindcss @tailwindcss/vite tw-animate-css \
  @tanstack/router-plugin @tanstack/react-router-devtools \
  @tanstack/eslint-plugin-router @tanstack/eslint-plugin-query \
  partyserver wrangler @cloudflare/vitest-pool-workers \
  vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom \
  eslint @eslint/js globals typescript-eslint eslint-plugin-react-hooks eslint-plugin-react-refresh eslint-config-prettier \
  prettier husky lint-staged \
  @types/node @types/react @types/react-dom
```

> `partyserver` is listed as a dev dependency because it is bundled by Wrangler, never by Vite.
> `@tanstack/react-query` is installed now so the ESLint plugin resolves; it is first used in M8.

### 2.1 What is intentionally **not** installed (present in the old `package.json`)

| Old dependency                                                          | Reason                                                                  |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `react-router-dom`                                                      | Replaced by `@tanstack/react-router`.                                   |
| `partykit`                                                              | Legacy runtime; replaced by `partyserver` + `wrangler`.                 |
| `crypto-js`, `@types/crypto-js`                                         | Session "encryption" dropped (plan §3.4 #11).                           |
| `lucide-react`                                                          | Single icon set: Tabler (plan §3.4 #14).                                |
| `next-themes`                                                           | Only used by `sonner.tsx`; Toaster will read the app's `ThemeProvider`. |
| `recharts`, `http`, `ws`                                                | Unused.                                                                 |
| `@radix-ui/react-*` (10 packages)                                       | The `radix-ui` meta-package covers all primitives.                      |
| `eslint-plugin-react`, `eslint-plugin-prettier`, `@typescript-eslint/*` | Replaced by `typescript-eslint` + `eslint-config-prettier` (flat).      |

---

## 3. TypeScript configuration

Three projects referenced from a solution-style root config. `tsc -b` type-checks all three.

### 3.1 `tsconfig.json`

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.worker.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

### 3.2 `tsconfig.app.json` — browser code (`src/`) + `shared/`

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "types": ["vite/client"],
    "skipLibCheck": true,

    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",

    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true,

    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@shared/*": ["./shared/*"]
    }
  },
  "include": ["src", "shared"]
}
```

> The old repo had `baseUrl`/`paths` **outside** `compilerOptions`, which silently disabled the `@/`
> alias. Keep them inside.

### 3.3 `tsconfig.worker.json` — Cloudflare Worker (`party/`) + `shared/`

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.worker.tsbuildinfo",
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "types": ["@cloudflare/vitest-pool-workers"],
    "skipLibCheck": true,

    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,

    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["party", "shared", "worker-configuration.d.ts"]
}
```

> `worker-configuration.d.ts` is generated by `wrangler types` (step 7) and contains both the `Env`
> interface and the Workers runtime types, so `@cloudflare/workers-types` is not needed.
> Code in `party/` imports `shared/` with **relative paths** (`../shared/schema`) — Wrangler's esbuild
> does not read `tsconfig.app.json` paths.

### 3.4 `tsconfig.node.json` — config files

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "ES2023",
    "lib": ["ES2023"],
    "module": "ESNext",
    "types": ["node"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["vite.config.ts", "vitest.config.ts", "vitest.workers.config.ts"]
}
```

---

## 4. Vite + Tailwind + TanStack Router plugin

### 4.1 `vite.config.ts`

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import { fileURLToPath, URL } from 'node:url';

export const alias = {
  '@': fileURLToPath(new URL('./src', import.meta.url)),
  '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
};

export default defineConfig({
  // Order matters: the router plugin must run before react().
  plugins: [tanstackRouter({ target: 'react', autoCodeSplitting: true }), react(), tailwindcss()],
  server: { port: 3000 },
  resolve: { alias },
});
```

The router plugin generates `src/routeTree.gen.ts` on `vite dev`/`vite build`. **Commit that file**:
`npm run build` runs `tsc -b` first, which needs it to exist.

### 4.2 Placeholder route tree (so `tsc -b` passes before M3)

```bash
mkdir -p src/routes src/styles shared party
```

`src/routes/__root.tsx`

```tsx
import { createRootRoute, Outlet } from '@tanstack/react-router';

export const Route = createRootRoute({
  component: () => <Outlet />,
});
```

`src/routes/index.tsx`

```tsx
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: () => <p>Pokero</p>,
});
```

`src/styles/index.css`

```css
@import 'tailwindcss';
@import 'tw-animate-css';
```

`src/router.tsx`

```tsx
import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  scrollRestoration: true,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
```

`src/main.tsx`

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import './styles/index.css';
import { router } from './router';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
```

Run `npx vite build` once now to generate `src/routeTree.gen.ts`, then commit it.

### 4.3 `components.json` (shadcn)

Create by hand — do not run `shadcn init` (it would recreate `src/index.css`):

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/styles/index.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "tabler",
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

> If your shadcn CLI version does not accept `"tabler"` for `iconLibrary`, leave `"lucide"` and swap
> the icon imports by hand when adding components in M3 (mapping table in plan §2.7).

`src/lib/utils.ts` (shadcn expects it to exist):

```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## 5. Vitest — three projects

### 5.1 `vitest.config.ts`

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { alias } from './vite.config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'shared',
          include: ['shared/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        plugins: [react()],
        resolve: { alias },
        test: {
          name: 'src',
          include: ['src/**/*.test.{ts,tsx}'],
          environment: 'jsdom',
          setupFiles: ['./src/test/setup.ts'],
        },
      },
      './vitest.workers.config.ts',
    ],
    coverage: {
      provider: 'v8',
      include: ['shared/**', 'src/lib/**', 'src/stores/**'],
      exclude: ['**/*.test.*', 'src/test/**'],
      thresholds: {
        'shared/**': { lines: 95 },
        'src/lib/**': { lines: 90 },
        'src/stores/**': { lines: 90 },
      },
    },
  },
});
```

> Vitest ≥ 3 uses `test.projects`; the separate `vitest.workspace.ts` file mentioned in the plan is
> deprecated, so it is folded into `vitest.config.ts`.

### 5.2 `vitest.workers.config.ts`

```ts
import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
  test: {
    name: 'party',
    include: ['party/**/*.test.ts'],
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.jsonc' },
        isolatedStorage: true,
      },
    },
  },
});
```

### 5.3 `src/test/setup.ts`

```ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
});
```

### 5.4 Smoke tests (one per project, deleted later or kept as canaries)

`shared/smoke.test.ts`

```ts
import { expect, it } from 'vitest';

it('runs in node', () => {
  expect(typeof window).toBe('undefined');
});
```

`src/smoke.test.tsx`

```tsx
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';

it('runs in jsdom', () => {
  render(<p>hello</p>);
  expect(screen.getByText('hello')).toBeInTheDocument();
});
```

`party/smoke.test.ts`

```ts
import { SELF } from 'cloudflare:test';
import { expect, it } from 'vitest';

it('worker answers 404 for unknown paths', async () => {
  const res = await SELF.fetch('http://example.com/nope');
  expect(res.status).toBe(404);
});
```

---

## 6. ESLint 9 (flat) + Prettier + Husky

### 6.1 `eslint.config.js`

```js
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import pluginRouter from '@tanstack/eslint-plugin-router';
import pluginQuery from '@tanstack/eslint-plugin-query';
import prettier from 'eslint-config-prettier/flat';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores([
    'dist',
    'coverage',
    'node_modules',
    '.wrangler',
    'src/routeTree.gen.ts',
    'worker-configuration.d.ts',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      pluginRouter.configs['flat/recommended'],
      pluginQuery.configs['flat/recommended'],
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    // Worker code has no DOM; react-refresh rule is irrelevant there.
    files: ['party/**/*.ts', 'shared/**/*.ts'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  prettier,
]);
```

> If your `eslint-plugin-react-hooks` version exposes `configs['recommended-latest']` instead of
> `configs.flat.recommended`, use that.

### 6.2 `.prettierrc`

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100
}
```

`.prettierignore`

```
dist
coverage
.wrangler
src/routeTree.gen.ts
worker-configuration.d.ts
```

### 6.3 Husky + lint-staged

```bash
npx husky init
```

Replace `.husky/pre-commit` content with:

```sh
npx lint-staged
```

Add to `package.json`:

```jsonc
"lint-staged": {
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.{json,jsonc,md,css,yml,yaml}": ["prettier --write"]
}
```

---

## 7. Cloudflare Worker stub + Wrangler

### 7.1 `wrangler.jsonc`

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "pokero-party",
  "main": "party/index.ts",
  "compatibility_date": "2026-09-01",
  "observability": { "enabled": true },
  "vars": {
    // Comma-separated list of allowed browser origins for HTTP + WS. localhost is always allowed.
    "ALLOWED_ORIGINS": "https://pokero.dev",
  },
  "durable_objects": {
    "bindings": [{ "name": "PokeroServer", "class_name": "PokeroServer" }],
  },
  "migrations": [{ "tag": "v1", "new_sqlite_classes": ["PokeroServer"] }],
}
```

### 7.2 Stub `party/index.ts` (replaced in M2)

```ts
import { Server, routePartykitRequest } from 'partyserver';

export class PokeroServer extends Server<Env> {}

export default {
  async fetch(request, env) {
    return (await routePartykitRequest(request, env)) ?? new Response('Not Found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;
```

### 7.3 Generate types

```bash
npx wrangler types
```

This writes `worker-configuration.d.ts` (declares `Env` with `PokeroServer: DurableObjectNamespace`
and `ALLOWED_ORIGINS: string`). **Commit it**; re-run whenever `wrangler.jsonc` changes.

---

## 8. `package.json` scripts

```jsonc
"scripts": {
  "dev": "vite",
  "party": "wrangler dev",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "types": "wrangler types",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage",
  "lint": "eslint .",
  "lint:fix": "eslint . --fix",
  "format": "prettier --write .",
  "format:check": "prettier --check .",
  "typecheck": "tsc -b",
  "check": "npm run lint && npm run typecheck && npm run test",
  "deploy:party": "wrangler deploy",
  "prepare": "husky"
}
```

`package.json` top-level: `"type": "module"`, `"private": true`, `"engines": { "node": ">=22" }`.

---

## 9. Vercel + Git hygiene

`vercel.json` (identical to the old repo):

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

Append to `.gitignore`:

```
coverage
.wrangler
.dev.vars
.env*.local
```

Do **not** ignore `src/routeTree.gen.ts` or `worker-configuration.d.ts`.

---

## 10. Verify

```bash
npm run check          # lint + tsc -b + 3 smoke tests green
npm run dev            # http://localhost:3000 renders "Pokero"
npm run party          # wrangler dev boots on :8787; GET / → 404 "Not Found"
npx wrangler deploy --dry-run
```

Commit: `chore: scaffold pokero (vite, tailwind, tanstack router, wrangler, vitest, eslint)`.

---

## Do not carry over from the old repo

| Old file / config                                        | Action                                                     |
| -------------------------------------------------------- | ---------------------------------------------------------- |
| `tailwind.config.ts`                                     | Drop — dead under Tailwind v4 (no `content`/`theme` read). |
| `partykit.json`                                          | Drop — replaced by `wrangler.jsonc`.                       |
| `eslint.config.js` (legacy plugin wiring)                | Drop — rewritten above.                                    |
| `tsconfig.app.json` (`paths` outside `compilerOptions`)  | Drop — rewritten above.                                    |
| `.github/workflows/deploy.yml` (PartyKit deploy)         | Drop — rewritten in M9.                                    |
| `VITE_PARTYKIT_HOST`, `VITE_SESSION_ENCRYPTION_KEY` envs | Drop — only `VITE_PARTY_HOST` remains (M5).                |
