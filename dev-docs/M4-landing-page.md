# M4 — Landing page

> Source plan: [IMPLEMENTATION_PLAN.md §5 M4, §2.1 `/`](../IMPLEMENTATION_PLAN.md) · Size: S
> Outcome: `/` renders Navbar, Hero, Why Pokero, How it works, CTA and Footer with the exact copy
> of the current site, typed router links, `motion/react` animations and Tabler icons only.

Prerequisite: M3.

---

## 1. Files

```
src/features/landing/
├─ landing-page.tsx
├─ navbar.tsx
├─ hero-section.tsx
├─ why-pokero-section.tsx
├─ how-it-works-section.tsx
├─ cta-section.tsx
├─ footer.tsx
├─ motion.ts                     # shared variants
└─ __tests__/landing-page.test.tsx
src/routes/index.tsx             # → LandingPage
```

Porting rules for every file in this milestone:

| Old                                        | New                                                          |
| ------------------------------------------ | ------------------------------------------------------------ |
| `import { Link } from 'react-router-dom'`  | `import { Link } from '@tanstack/react-router'` (typed `to`) |
| `import { motion } from 'framer-motion'`   | `import { motion } from 'motion/react'`                      |
| `import X from '../logo'` (default export) | `import { PokeroLogo } from '@/components/logo'`             |
| relative `../ui/button` imports            | `@/components/ui/button`                                     |
| `font-ruska` class                         | remove (never defined)                                       |
| `lucide-react` icons                       | none are used on the landing page — nothing to map           |

---

## 2. `src/features/landing/motion.ts`

```ts
import type { Variants } from 'motion/react';

export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
};
```

---

## 3. `src/features/landing/navbar.tsx`

Port `src/components/layout/navbar.tsx`:

```tsx
import { Link } from '@tanstack/react-router';
import { motion } from 'motion/react';
import { IconChevronRight } from '@tabler/icons-react';
import { PokeroLogo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';

export function Navbar() {
  return (
    <header className="fixed top-0 right-0 left-0 z-50 bg-background/80 backdrop-blur-md transition-all duration-300 ease-in-out">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center"
          >
            <Link to="/" className="flex items-center gap-2.5 text-xl">
              <PokeroLogo className="size-6 text-primary" />
              <span className="font-display font-extrabold">Pokero</span>
            </Link>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center space-x-4"
          >
            <ThemeToggle />
            <Button variant="ghost" asChild>
              <Link to="/join">Join Game</Link>
            </Button>
            <Button asChild effect="expandIcon" icon={IconChevronRight} iconPlacement="right">
              <Link to="/create">Create Game</Link>
            </Button>
          </motion.div>
        </div>
      </div>
    </header>
  );
}
```

---

## 4. `src/features/landing/hero-section.tsx`

Port `src/components/landing/hero-section.tsx`; copy is unchanged:

```tsx
import { Link } from '@tanstack/react-router';
import { motion } from 'motion/react';
import { IconChevronRight } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { fadeIn, fadeInUp } from './motion';

export function HeroSection() {
  return (
    <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8">
      <motion.div
        initial="initial"
        animate="animate"
        variants={fadeInUp}
        transition={{ duration: 0.8 }}
        className="mx-auto max-w-4xl text-center"
      >
        <h1 className="font-display text-4xl font-extrabold tracking-normal md:text-5xl lg:text-6xl">
          <motion.span
            className="mb-2 pb-2"
            variants={fadeInUp}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            Planning Poker,
          </motion.span>
          <br />
          <motion.span
            className="text-primary"
            variants={fadeInUp}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            Simplified
          </motion.span>
        </h1>
        <motion.p
          className="mx-auto mt-6 max-w-2xl text-xl text-foreground/80"
          variants={fadeIn}
          transition={{ delay: 0.6, duration: 0.8 }}
        >
          Free, instant estimation. No sign-up. Just share a link and play.
        </motion.p>
        <motion.div
          className="mt-10 flex flex-col justify-center gap-4 sm:flex-row"
          variants={fadeIn}
          transition={{ delay: 0.8, duration: 0.8 }}
        >
          <Button
            size="lg"
            effect="expandIcon"
            icon={IconChevronRight}
            iconPlacement="right"
            asChild
            className="z-50 w-full text-lg sm:w-auto"
          >
            <Link to="/create">Start a Session</Link>
          </Button>
          <Button variant="outline" size="lg" asChild className="w-full text-lg sm:w-auto">
            <Link to="/join">Join Game</Link>
          </Button>
        </motion.div>
        <motion.p
          className="mt-4 text-sm text-foreground/70"
          variants={fadeIn}
          transition={{ delay: 0.8, duration: 0.8 }}
        >
          No account needed. Seriously.
        </motion.p>
      </motion.div>
    </div>
  );
}
```

---

## 5. `src/features/landing/why-pokero-section.tsx`

Port `why-poker-section.tsx` (note the filename typo is fixed). Copy fix: "You sessions" →
"Your sessions".

```tsx
import {
  IconBolt,
  IconCloudX,
  IconFreeRights,
  IconUserX,
  type TablerIcon,
} from '@tabler/icons-react';
import Balancer from 'react-wrap-balancer';

const reasons: { icon: TablerIcon; title: string; description: string }[] = [
  {
    icon: IconUserX,
    title: 'No Accounts',
    description: 'Jump right in. No sign-up, no passwords, no hassle.',
  },
  {
    icon: IconCloudX,
    title: 'No Stored Data',
    description: "Your sessions vanish when you're done. We don't track, log or remember a thing.",
  },
  {
    icon: IconFreeRights,
    title: '100% Free',
    description:
      'No premium tier, no feature gates, no surprise invoices. The whole thing is yours.',
  },
  {
    icon: IconBolt,
    title: 'Instant Setup',
    description: 'Create a game and share a link in seconds. No waiting, no friction.',
  },
];

export function WhyPokeroSection() {
  return (
    <section className="flex items-center justify-center py-16">
      <div className="mx-auto w-full max-w-(--breakpoint-xl) px-6 py-12 xl:px-0">
        <h2 className="text-center font-display text-4xl font-extrabold text-primary md:text-5xl">
          <Balancer>Built for teams who hate unnecessary setup.</Balancer>
        </h2>
        <div className="mt-16 grid justify-center gap-x-10 gap-y-16 text-center sm:mt-24 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {reasons.map(({ icon: Icon, title, description }) => (
            <div key={title}>
              <Icon className="mx-auto size-12 text-primary" />
              <p className="mt-6 font-display text-xl font-extrabold">{title}</p>
              <p className="mt-2 text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

---

## 6. `src/features/landing/how-it-works-section.tsx`

Port as-is (already Tabler + Balancer). Replace the `AnimatedBackground` import path with
`@/components/animated-background` and `Card` with `@/components/ui/card`. Copy: "Three Steps. Zero
Friction." / cards "Create a Room" · "Invite Your Team" · "Play your Cards" with their descriptions.

---

## 7. `src/features/landing/cta-section.tsx`

Port `cta-section.tsx`; swap `Link` import. Copy: "Your Next Estimation Session is One Click Away" /
"No sign-up. No credit card. No nonsense." / button "Start a Session" → `/create`.

---

## 8. `src/features/landing/footer.tsx`

Port `footer.tsx`. External links get `target="_blank" rel="noreferrer"`. Logo link → `<Link to="/">`.

```tsx
const links = [
  { title: 'GitHub', href: 'https://github.com/brendan-sadlier/pokero' },
  {
    title: 'Request Features',
    href: 'https://github.com/brendan-sadlier/pokero/discussions/categories/ideas',
  },
  { title: 'Report Bugs', href: 'https://github.com/brendan-sadlier/pokero/issues' },
  { title: 'Buy Me a Coffee', href: 'https://buymeacoffee.com/brendansadlier' },
];
```

Copyright: `© {new Date().getFullYear()} Brendan Sadlier, All rights reserved`.

---

## 9. `src/features/landing/landing-page.tsx`

```tsx
import { AnimatedBackground } from '@/components/animated-background';
import { Navbar } from './navbar';
import { HeroSection } from './hero-section';
import { WhyPokeroSection } from './why-pokero-section';
import { HowItWorksSection } from './how-it-works-section';
import { CtaSection } from './cta-section';
import { Footer } from './footer';

export function LandingPage() {
  return (
    <div className="flex flex-col">
      <Navbar />
      <div className="relative flex min-h-screen flex-1 items-center justify-center overflow-hidden bg-background">
        <HeroSection />
        <AnimatedBackground />
      </div>
      <WhyPokeroSection />
      <HowItWorksSection />
      <CtaSection />
      <Footer />
    </div>
  );
}
```

## 10. `src/routes/index.tsx`

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { LandingPage } from '@/features/landing/landing-page';

export const Route = createFileRoute('/')({
  component: LandingPage,
});
```

`/create` and `/join` do not exist until M5; TanStack's typed `Link` will error at type-check time
until those route files are added. Either land M4 and M5 in the same branch or temporarily add
placeholder `routes/create.tsx` / `routes/join.tsx` (each `component: () => null`).

---

## 11. Tests — `src/features/landing/__tests__/landing-page.test.tsx`

Use a real router with memory history so `Link` resolves.

```tsx
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { routeTree } from '@/routeTree.gen';

function renderAt(path: string) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  render(<RouterProvider router={router} />);
  return router;
}

describe('LandingPage', () => {
  it('renders hero copy and CTAs', async () => {
    renderAt('/');
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
      'Planning Poker,Simplified',
    );
    expect(
      screen.getByText('Free, instant estimation. No sign-up. Just share a link and play.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Start a Session' })).toHaveAttribute(
      'href',
      '/create',
    );
    expect(screen.getAllByRole('link', { name: 'Join Game' })[0]).toHaveAttribute('href', '/join');
  });

  it('renders the four reasons and three steps', async () => {
    renderAt('/');
    for (const t of ['No Accounts', 'No Stored Data', '100% Free', 'Instant Setup']) {
      expect(await screen.findByText(t)).toBeInTheDocument();
    }
    for (const t of ['Create a Room', 'Invite Your Team', 'Play your Cards']) {
      expect(screen.getByText(t)).toBeInTheDocument();
    }
  });

  it('footer external links open in a new tab', async () => {
    renderAt('/');
    const gh = await screen.findByRole('link', { name: 'GitHub' });
    expect(gh).toHaveAttribute('target', '_blank');
    expect(gh).toHaveAttribute('rel', expect.stringContaining('noreferrer'));
  });
});
```

`motion` in jsdom: animations resolve instantly; no mocking required. If `matchMedia` errors appear,
add a stub to `src/test/setup.ts`:

```ts
window.matchMedia ??= () =>
  ({ matches: false, addEventListener() {}, removeEventListener() {} }) as never;
```

---

## 12. Verify

- `npm run dev` → `/` matches the current production landing page section by section (copy, order,
  animations, theme toggle).
- Lighthouse (Chrome DevTools) accessibility ≥ 95.
- `npm run build` then inspect `dist/assets`: the `index` route chunk must not contain strings such as
  `Reveal Votes` or `partysocket` (game code is code-split by the router plugin).
- `npm run check` green.

Commit: `feat(landing): port landing page to tanstack router + motion/react`.

---

## Old code superseded by this milestone

| Old file                                         | Action                                           |
| ------------------------------------------------ | ------------------------------------------------ |
| `src/pages/Home.tsx`                             | → `features/landing/landing-page.tsx`            |
| `src/components/layout/navbar.tsx`, `footer.tsx` | → `features/landing/navbar.tsx`, `footer.tsx`    |
| `src/components/landing/*.tsx`                   | → `features/landing/*`                           |
| `src/components/landing/features-section.tsx`    | **Dropped** — not rendered anywhere (plan §8 #6) |
