# M3 — Design system & app shell

> Source plan: [IMPLEMENTATION_PLAN.md §5 M3, §2.7](../IMPLEMENTATION_PLAN.md) · Size: M
> Outcome: tokens, fonts, shadcn primitives, custom `Button`, theme provider/toggle, Toaster wired to
> the app theme, logo, animated background, and a root route with providers, 404 and error screens.

Prerequisite: M0. (M1/M2 are independent of this milestone.)

---

## 1. Files

```
src/
├─ styles/index.css                 # tokens + Tailwind v4 theme (rewritten)
├─ main.tsx                         # fonts, css, RouterProvider (rewritten)
├─ routes/__root.tsx                # providers, Outlet, NotFound, RouteError, devtools
├─ components/
│  ├─ ui/…                          # shadcn output (+ custom button.tsx, sonner.tsx)
│  ├─ logo.tsx
│  ├─ theme-provider.tsx
│  ├─ theme-toggle.tsx
│  ├─ animated-background.tsx
│  ├─ error-boundary.tsx
│  ├─ not-found.tsx
│  └─ route-error.tsx
└─ components/__tests__/…
```

---

## 2. `src/styles/index.css`

Copy the old `src/index.css` token blocks verbatim (`:root`, `.dark`, `@theme inline`) with these
changes:

1. **Remove** the two Google Fonts `@import url(...)` lines (fonts are self-hosted, plan §8 #7).
2. Font family names become the Fontsource variable names.
3. Move the `slideUp` keyframes into `@theme` as an `--animate-*` token so `animate-slide-up` is a
   real utility (it was in `@layer utilities` before — that worked, but the token form is idiomatic
   for v4 and lets `motion`-free components use it).
4. Drop the `--sidebar-*` tokens (no sidebar in this app).

```css
@import 'tailwindcss';
@import 'tw-animate-css';

@custom-variant dark (&:is(.dark *));

:root {
  --background: oklch(0.99 0 0);
  --foreground: oklch(0 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0 0 0);
  --popover: oklch(0.99 0 0);
  --popover-foreground: oklch(0 0 0);
  --primary: oklch(0.6036 0.1618 141.6819);
  --primary-foreground: oklch(1 0 0);
  --secondary: oklch(0.922 0 0);
  --secondary-foreground: oklch(0 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.44 0 0);
  --accent: oklch(0.9382 0.0405 141.8653);
  --accent-foreground: oklch(0 0 0);
  --destructive: oklch(0.63 0.19 23.03);
  --destructive-foreground: oklch(1 0 0);
  --border: oklch(0.92 0 0);
  --input: oklch(0.94 0 0);
  --ring: oklch(0.6036 0.1618 141.6819);
  --chart-1: oklch(0.6036 0.1618 141.6819);
  --chart-2: oklch(0.4992 0.1292 253.3007);
  --chart-3: oklch(0.7563 0.1424 65.0231);
  --chart-4: oklch(0.587 0.2006 327.4128);
  --chart-5: oklch(0.6609 0.1027 193.3022);
  --font-sans: 'Outfit Variable', ui-sans-serif, system-ui, sans-serif;
  --font-display: 'Bricolage Grotesque Variable', ui-sans-serif, system-ui, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, monospace;
  --radius: 1rem;
  --shadow-2xs: 0px 0px 2px 0px hsl(0 0% 0% / 0.05);
  --shadow-xs: 0px 0px 2px 0px hsl(0 0% 0% / 0.05);
  --shadow-sm: 0px 0px 2px 0px hsl(0 0% 0% / 0.1), 0px 1px 2px -1px hsl(0 0% 0% / 0.1);
  --shadow: 0px 0px 2px 0px hsl(0 0% 0% / 0.1), 0px 1px 2px -1px hsl(0 0% 0% / 0.1);
  --shadow-md: 0px 0px 2px 0px hsl(0 0% 0% / 0.1), 0px 2px 4px -1px hsl(0 0% 0% / 0.1);
  --shadow-lg: 0px 0px 2px 0px hsl(0 0% 0% / 0.1), 0px 4px 6px -1px hsl(0 0% 0% / 0.1);
  --shadow-xl: 0px 0px 2px 0px hsl(0 0% 0% / 0.1), 0px 8px 10px -1px hsl(0 0% 0% / 0.1);
  --shadow-2xl: 0px 0px 2px 0px hsl(0 0% 0% / 0.25);
}

.dark {
  --background: oklch(0.205 0 0);
  --foreground: oklch(1 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(1 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(1 0 0);
  --primary: oklch(0.7111 0.1929 141.6155);
  --primary-foreground: oklch(0 0 0);
  --secondary: oklch(0.27 0 0);
  --secondary-foreground: oklch(1 0 0);
  --muted: oklch(0.23 0 0);
  --muted-foreground: oklch(0.72 0 0);
  --accent: oklch(0.3021 0.093 141.7);
  --accent-foreground: oklch(1 0 0);
  --destructive: oklch(0.69 0.2 23.91);
  --destructive-foreground: oklch(0 0 0);
  --border: oklch(0.26 0 0);
  --input: oklch(0.32 0 0);
  --ring: oklch(0.7111 0.1929 141.6155);
  --chart-1: oklch(0.7111 0.1929 141.6155);
  --chart-2: oklch(0.4992 0.1292 253.3007);
  --chart-3: oklch(0.5385 0.1186 303.584);
  --chart-4: oklch(0.7307 0.1596 65.9948);
  --chart-5: oklch(0.8043 0.0958 191.211);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);

  --font-sans: var(--font-sans);
  --font-display: var(--font-display);
  --font-mono: var(--font-mono);

  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);

  --shadow-2xs: var(--shadow-2xs);
  --shadow-xs: var(--shadow-xs);
  --shadow-sm: var(--shadow-sm);
  --shadow: var(--shadow);
  --shadow-md: var(--shadow-md);
  --shadow-lg: var(--shadow-lg);
  --shadow-xl: var(--shadow-xl);
  --shadow-2xl: var(--shadow-2xl);

  --animate-slide-up: slide-up 0.6s ease-out;

  @keyframes slide-up {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  html {
    color-scheme: light dark;
  }
  body {
    @apply bg-background font-sans text-foreground antialiased;
  }
  button:not(:disabled),
  [role='button']:not(:disabled) {
    cursor: pointer;
  }
}
```

Dropped from the old file: `--font-serif`, `--tracking-normal`, `--spacing`, `--shadow-x/y/blur/…`
(unused), `--sidebar-*`, the `.animate-slide-up` utility class (now generated from the token),
`animate-shine` / `animate-gradient-flow` (were never defined, plan §3.4 #13), `font-ruska` usages.

---

## 3. `src/main.tsx`

```tsx
import '@fontsource-variable/outfit';
import '@fontsource-variable/bricolage-grotesque';
import './styles/index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import { router } from './router';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
```

(M5 adds `clearExpiredSessions()` before `createRoot`; M8 adds the `QueryClientProvider`.)

### 3.1 Prevent dark-mode flash — `index.html`

Add inside `<head>`, before the module script (mirrors `ThemeProvider` logic so the class exists at
first paint):

```html
<script>
  (function () {
    try {
      var t = localStorage.getItem('vite-ui-theme') || 'dark';
      if (t === 'system') t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      document.documentElement.classList.add(t);
    } catch (e) {}
  })();
</script>
```

---

## 4. shadcn primitives

```bash
npx shadcn@latest add accordion alert-dialog button button-group card dialog dropdown-menu field input label select sheet sonner switch tooltip
```

Accept overwrites. Then:

1. **Icons**: if any generated file imports from `lucide-react`, replace with Tabler equivalents
   (`XIcon → IconX`, `ChevronDownIcon → IconChevronDown`, `CheckIcon → IconCheck`,
   `ChevronUpIcon → IconChevronUp`, `MoreHorizontalIcon → IconDots`, `CircleIcon → IconCircle`).
2. **`button.tsx`** — overwrite with §4.1.
3. **`sonner.tsx`** — overwrite with §4.2.
4. **Do not add** `checkbox`, `collapsible`, `separator` (present in the old repo but unused). If
   `button-group` pulls in `separator` as a dependency, keep it.

### 4.1 `src/components/ui/button.tsx` (custom)

Keeps shadcn's base + `size` set, adds the `effect: expandIcon` variant and `icon`/`iconPlacement`
props used by the landing page. All other `effect` variants from the old file (`ringHover`,
`shine`, `shineHover`, `gooeyRight`, `gooeyLeft`, `underline`, `hoverUnderline`,
`gradientSlideShow`) are **removed** — unused, and two relied on animations that were never defined.

```tsx
import type * as React from 'react';
import { Slot } from 'radix-ui';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 active:scale-95 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90',
        destructive:
          'bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40',
        outline:
          'border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50',
        secondary: 'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      effect: {
        expandIcon: 'group relative gap-0',
      },
      size: {
        default: 'h-10 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-9 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5',
        lg: 'h-11 rounded-md px-8 has-[>svg]:px-4',
        icon: 'size-9',
        'icon-xs':
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        'icon-sm':
          'size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg',
        'icon-lg': 'size-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

type IconProps =
  | { icon: React.ElementType; iconPlacement: 'left' | 'right' }
  | { icon?: never; iconPlacement?: never };

export type ButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean } & IconProps;

function ExpandingIcon({ Icon, side }: { Icon: React.ElementType; side: 'left' | 'right' }) {
  return (
    <span
      className={cn(
        'w-0 opacity-0 transition-all duration-200 group-hover:w-5 group-hover:opacity-100',
        side === 'left'
          ? 'translate-x-0 pr-0 group-hover:pr-2'
          : 'translate-x-full pl-0 group-hover:translate-x-0 group-hover:pl-2',
      )}
    >
      <Icon />
    </span>
  );
}

function Button({
  className,
  variant,
  effect,
  size,
  icon: Icon,
  iconPlacement,
  asChild = false,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button';
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, effect, size, className }))}
      {...props}
    >
      {Icon &&
        iconPlacement === 'left' &&
        (effect === 'expandIcon' ? <ExpandingIcon Icon={Icon} side="left" /> : <Icon />)}
      <Slot.Slottable>{children}</Slot.Slottable>
      {Icon &&
        iconPlacement === 'right' &&
        (effect === 'expandIcon' ? <ExpandingIcon Icon={Icon} side="right" /> : <Icon />)}
    </Comp>
  );
}

export { Button, buttonVariants };
```

### 4.2 `src/components/ui/sonner.tsx` (reads the app theme — fixes plan §3.4 #12)

```tsx
import type { CSSProperties } from 'react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';
import {
  IconCircleCheck,
  IconInfoCircle,
  IconAlertTriangle,
  IconExclamationCircle,
  IconLoader2,
} from '@tabler/icons-react';
import { useTheme } from '@/components/theme-provider';

export function Toaster(props: ToasterProps) {
  const { theme } = useTheme();
  return (
    <Sonner
      theme={theme}
      className="toaster group"
      icons={{
        success: <IconCircleCheck className="size-4" />,
        info: <IconInfoCircle className="size-4" />,
        warning: <IconAlertTriangle className="size-4" />,
        error: <IconExclamationCircle className="size-4" />,
        loading: <IconLoader2 className="size-4 animate-spin" />,
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
        } as CSSProperties
      }
      {...props}
    />
  );
}
```

The old file imported `useTheme` from `next-themes`, which was never provided, so toasts were always
rendered with `theme="system"`.

---

## 5. Theme

### 5.1 `src/components/theme-provider.tsx`

Port the old file unchanged except: default theme is passed by the caller (`__root.tsx` passes
`"dark"`), and export the `Theme` type.

```tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Theme = 'dark' | 'light' | 'system';

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'vite-ui-theme',
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme | null) ?? defaultTheme,
  );

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    const resolved =
      theme === 'system'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : theme;
    root.classList.add(resolved);
  }, [theme]);

  const setTheme = (next: Theme) => {
    localStorage.setItem(storageKey, next);
    setThemeState(next);
  };

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
```

### 5.2 `src/components/theme-toggle.tsx`

Port as-is (already Tabler). Change `size="icon"` classes only if the new `Button` size names differ.

```tsx
import { IconMoon, IconSun } from '@tabler/icons-react';
import { useTheme } from '@/components/theme-provider';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      className="group"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      aria-label="Toggle theme"
    >
      <IconSun className="size-[1.2rem] scale-100 rotate-0 transition-all group-hover:scale-110 dark:scale-0 dark:-rotate-90" />
      <IconMoon className="absolute size-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0 dark:group-hover:scale-110" />
    </Button>
  );
}
```

---

## 6. Brand & motion components

### 6.1 `src/components/logo.tsx`

Copy the SVG paths from the old `src/components/logo.tsx` verbatim; only the component signature changes:

```tsx
export function PokeroLogo({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 500 500"
      className={className}
      aria-hidden="true"
    >
      {/* …paths from old file… */}
    </svg>
  );
}
```

### 6.2 `src/components/animated-background.tsx`

Port the old file; change `import { motion } from 'framer-motion'` → `from 'motion/react'` (the
dependency is `motion`; the old import only worked through a transitive package). Keep the four
circles and their transitions exactly. Export `AnimatedBackground` (memoised).

### 6.3 `src/components/error-boundary.tsx`

Port the old class component with: `AlertTriangle` → `IconAlertTriangle` (Tabler), remove the
`useErrorHandler` hook (it only `console.error`ed global events and required `react-router-dom`), and
expose the fallback UI as a standalone component so the router's `errorComponent` can reuse it:

```tsx
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { IconAlertTriangle } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';

export function ErrorScreen({
  error,
  componentStack,
  onReset,
}: {
  error?: Error;
  componentStack?: string | null;
  onReset?: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-destructive/10 p-4">
            <IconAlertTriangle className="size-12 text-destructive" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
          <p className="text-muted-foreground">
            We encountered an unexpected error. This has been logged and we&apos;ll look into it.
          </p>
        </div>
        {error && (
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <p className="text-left font-mono text-sm break-all text-destructive">
              {error.message}
            </p>
          </div>
        )}
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          {onReset && (
            <Button onClick={onReset} variant="outline" className="w-full sm:w-auto">
              Try Again
            </Button>
          )}
          <Button onClick={() => window.location.reload()} className="w-full sm:w-auto">
            Reload Page
          </Button>
        </div>
        {import.meta.env.DEV && componentStack && (
          <details className="mt-4 text-left">
            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
              Show error details (dev only)
            </summary>
            <pre className="mt-2 overflow-auto rounded-lg bg-muted p-4 text-xs">
              {componentStack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

interface State {
  error?: Error;
  info?: ErrorInfo;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = {};

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Error caught by boundary:', error, info);
    this.setState({ info });
  }

  render() {
    if (this.state.error) {
      return (
        <ErrorScreen
          error={this.state.error}
          componentStack={this.state.info?.componentStack}
          onReset={() => this.setState({})}
        />
      );
    }
    return this.props.children;
  }
}
```

### 6.4 `src/components/not-found.tsx` (new — plan §2.1 `*` route)

```tsx
import { Link } from '@tanstack/react-router';
import { IconArrowLeft } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { PokeroLogo } from '@/components/logo';

export function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-4 text-center">
      <PokeroLogo className="size-12 text-primary" />
      <div className="space-y-2">
        <h1 className="font-display text-4xl font-extrabold">Page not found</h1>
        <p className="text-muted-foreground">
          That link doesn&apos;t lead anywhere. Let&apos;s get you back to the table.
        </p>
      </div>
      <Button asChild icon={IconArrowLeft} iconPlacement="left">
        <Link to="/">Back to Home</Link>
      </Button>
    </main>
  );
}
```

### 6.5 `src/components/route-error.tsx`

```tsx
import { useRouter, type ErrorComponentProps } from '@tanstack/react-router';
import { ErrorScreen } from '@/components/error-boundary';

export function RouteError({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  return (
    <ErrorScreen
      error={error instanceof Error ? error : new Error(String(error))}
      onReset={() => {
        reset();
        void router.invalidate();
      }}
    />
  );
}
```

---

## 7. `src/routes/__root.tsx`

Replaces `src/App.tsx` (BrowserRouter + providers) and the placeholder from M0.

```tsx
import { Outlet, createRootRoute } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { ThemeProvider } from '@/components/theme-provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { ErrorBoundary } from '@/components/error-boundary';
import { NotFound } from '@/components/not-found';
import { RouteError } from '@/components/route-error';

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFound,
  errorComponent: RouteError,
});

function RootLayout() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <TooltipProvider>
          <Outlet />
          <Toaster position="top-center" richColors closeButton />
        </TooltipProvider>
        {import.meta.env.DEV && <TanStackRouterDevtools position="bottom-right" />}
      </ThemeProvider>
    </ErrorBoundary>
  );
}
```

> The root `notFoundComponent` is rendered in place of `<Outlet />`, so it sits inside `RootLayout`
> and inherits the theme, tooltip and toaster providers.

---

## 8. Tests (`src` project)

`src/components/__tests__/theme-provider.test.tsx`

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ThemeProvider, useTheme } from '@/components/theme-provider';

function Probe() {
  const { theme, setTheme } = useTheme();
  return <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme}</button>;
}

describe('ThemeProvider', () => {
  it('applies the default theme class and persists changes', async () => {
    render(
      <ThemeProvider defaultTheme="dark" storageKey="t">
        <Probe />
      </ThemeProvider>,
    );
    expect(document.documentElement).toHaveClass('dark');
    await userEvent.click(screen.getByRole('button'));
    expect(document.documentElement).toHaveClass('light');
    expect(localStorage.getItem('t')).toBe('light');
  });
});
```

`src/components/__tests__/button.test.tsx`

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { IconChevronRight } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('renders a right-placed expanding icon after the label', () => {
    render(
      <Button effect="expandIcon" icon={IconChevronRight} iconPlacement="right">
        Go
      </Button>,
    );
    const btn = screen.getByRole('button', { name: 'Go' });
    expect(btn.lastElementChild?.querySelector('svg')).not.toBeNull();
    expect(btn).toHaveClass('group');
  });

  it('supports asChild', () => {
    render(
      <Button asChild>
        <a href="/x">Link</a>
      </Button>,
    );
    expect(screen.getByRole('link', { name: 'Link' })).toHaveAttribute('data-slot', 'button');
  });
});
```

`src/components/__tests__/not-found.test.tsx` — render inside a memory-history router and assert the
heading and the "Back to Home" link (`href="/"`).

---

## 9. Verify

- `npm run dev` → `/` renders the placeholder inside the dark theme; toggle switches `.dark` and
  persists across reload; `/nope` renders **Page not found** with a working "Back to Home".
- Throw inside the index route component temporarily → `RouteError` screen, "Try Again" recovers.
- `npm run check` green.

Commit: `feat(ui): tokens, fonts, shadcn primitives, theme, toaster, root layout`.

---

## Old code superseded by this milestone

| Old file                                                 | Action                                                                   |
| -------------------------------------------------------- | ------------------------------------------------------------------------ |
| `src/App.tsx`                                            | Deleted — providers live in `routes/__root.tsx`                          |
| `src/index.css`                                          | Rewritten as `src/styles/index.css` (no Google Fonts, no sidebar tokens) |
| `src/components/ui/button.tsx` effects                   | Only `expandIcon` retained                                               |
| `src/components/ui/sonner.tsx` (`next-themes`)           | Rewritten to use `useTheme()`                                            |
| `src/components/ErrorBoundary.tsx` `useErrorHandler`     | Removed                                                                  |
| `src/components/ui/{checkbox,collapsible,separator}.tsx` | Not regenerated (unused)                                                 |
| `tailwind.config.ts`                                     | Not recreated                                                            |
