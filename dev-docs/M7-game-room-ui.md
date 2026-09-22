# M7 — Game room UI

> Source plan: [IMPLEMENTATION_PLAN.md §5 M7, §2.2–§2.4](../IMPLEMENTATION_PLAN.md) · Size: L
> Outcome: the complete `/game/$gameId` experience — connection screens, header with dialogs,
> vote cards, deck, countdown overlay, stats bar, history sheet, admin actions — reading from
> `gameStore` and sending through `gameClient`.

Prerequisites: M3, M5, M6.

---

## 1. Files

```
src/features/game/
├─ game-page.tsx                 # composition + event wiring (replaces src/pages/GamePage.tsx)
├─ use-game-connection.ts        # from M6
├─ use-game-events.ts            # toasts + navigation for side events
├─ game-header.tsx
├─ vote-status-cards.tsx
├─ voting-cards.tsx
├─ spectator-view.tsx
├─ countdown-overlay.tsx
├─ round-stats.tsx
├─ game-history-sheet.tsx
├─ game-settings-dialog.tsx
├─ invite-dialog.tsx
├─ leave-game-dialog.tsx
├─ player-actions-menu.tsx
├─ screens/
│  ├─ connecting-screen.tsx      # from M5
│  ├─ error-screen.tsx
│  └─ loading-screen.tsx
└─ __tests__/…
```

Global porting rules (apply to every file below):

| Old                                                                           | New                                                                                                  |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `../../types` imports                                                         | `@shared/constants`, `@shared/schema`, `@shared/stats`                                               |
| `lucide-react` `CircleCheck/Eye/Scale/Trophy/Handshake/AlertCircle/RefreshCw` | Tabler `IconCircleCheck/IconEye/IconScale/IconTrophy/IconHeartHandshake/IconAlertCircle/IconRefresh` |
| `framer-motion`                                                               | `motion/react`                                                                                       |
| `text-white`                                                                  | `text-primary-foreground`                                                                            |
| `bg-base-100`, `dark:bg-base-800`, `dark:bg-base-600`, `dark:border-base-800` | Undefined in the token set → `bg-card`, drop the rest                                                |
| `hover:cursor-pointer` sprinkled on buttons                                   | Remove — base layer already sets cursor on enabled buttons                                           |
| `memo(...)` + `displayName` boilerplate                                       | Keep `memo` only on `VoteStatusCard` and `VotingCard` (list items); drop elsewhere                   |

---

## 2. Screens

`screens/error-screen.tsx`

```tsx
import { IconAlertCircle, IconRefresh } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';

export function ErrorScreen({
  message,
  onRetry,
  onGoHome,
}: {
  message: string;
  onRetry: () => void;
  onGoHome: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4 text-center">
        <IconAlertCircle className="mx-auto size-12 text-destructive" />
        <h2 className="text-xl font-semibold">Connection Error</h2>
        <p className="text-muted-foreground">{message}</p>
        <div className="flex justify-center gap-2">
          <Button onClick={onRetry} variant="outline" icon={IconRefresh} iconPlacement="left">
            Retry
          </Button>
          <Button onClick={onGoHome}>Back to Home</Button>
        </div>
      </div>
    </div>
  );
}
```

`screens/loading-screen.tsx`

```tsx
export function LoadingScreen({ message = 'Loading game...' }: { message?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="mb-4 size-12 animate-spin rounded-full border-b-2 border-primary" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}
```

---

## 3. `use-game-events.ts` — side events → toasts / navigation

Copy from plan §2.4, exhaustively.

```ts
import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { gameClient } from '@/lib/game-client';
import { clearSession } from '@/lib/session';

const REDIRECT_MS = 1500;

export function useGameEvents(gameId: string, playerId: string): void {
  const navigate = useNavigate();

  useEffect(() => {
    const goHomeSoon = () => setTimeout(() => void navigate({ to: '/' }), REDIRECT_MS);

    const offs = [
      gameClient.on('gameEnded', ({ endedBy }) => {
        clearSession(gameId);
        toast.info(`${endedBy} has ended the game.`, {
          description: 'You will be redirected to the home page.',
          duration: 3000,
        });
        goHomeSoon();
      }),
      gameClient.on('playerLeft', ({ playerName }) => {
        toast.info(`${playerName} has left the game.`);
      }),
      gameClient.on('playerKicked', ({ playerId: kickedId, playerName, kickedBy }) => {
        if (kickedId === playerId) {
          clearSession(gameId);
          toast.error(`You were kicked from the game by ${kickedBy}.`, {
            description: 'You will be redirected to the home page.',
            duration: 3000,
          });
          goHomeSoon();
        } else {
          toast.info(`${playerName} was kicked from the game.`);
        }
      }),
      gameClient.on('adminTransferred', ({ fromPlayerName, toPlayerId, toPlayerName }) => {
        if (toPlayerId === playerId) toast.success(`${fromPlayerName} made you the admin!`);
        else toast.info(`${fromPlayerName} transferred admin to ${toPlayerName}.`);
      }),
      gameClient.on('reconnected', () => {
        toast.success('Reconnected to the game!');
      }),
      gameClient.on('serverError', ({ message }) => {
        console.warn('[server]', message);
      }),
    ];
    return () => offs.forEach((off) => off());
  }, [gameId, playerId, navigate]);
}
```

---

## 4. `game-page.tsx`

```tsx
import { useCallback, useEffect } from 'react';
import { getRouteApi, useNavigate } from '@tanstack/react-router';
import { useSelector } from '@tanstack/react-store';
import { toast } from 'sonner';
import { getDeck } from '@shared/constants';
import type { GameSettings } from '@shared/schema';
import { gameClient } from '@/lib/game-client';
import { clearSession, updateSessionSettings } from '@/lib/session';
import {
  allVotedStore,
  countingDownStore,
  gameStore,
  playersStore,
  roundStatsStore,
  selectMe,
  votersStore,
} from '@/stores/game-store';
import { Button } from '@/components/ui/button';
import { useGameConnection } from './use-game-connection';
import { useGameEvents } from './use-game-events';
import { ConnectingScreen } from './screens/connecting-screen';
import { ErrorScreen } from './screens/error-screen';
import { LoadingScreen } from './screens/loading-screen';
import { GameHeader } from './game-header';
import { VoteStatusCards } from './vote-status-cards';
import { VotingCards } from './voting-cards';
import { SpectatorView } from './spectator-view';
import { CountdownOverlay } from './countdown-overlay';
import { RoundStats } from './round-stats';

const route = getRouteApi('/game/$gameId');

export function GamePage() {
  const { gameId } = route.useParams();
  const { session } = route.useRouteContext();
  const navigate = useNavigate();

  useGameConnection(gameId, session);
  useGameEvents(gameId, session.playerId);

  const connectionState = useSelector(gameStore, (s) => s.connectionState);
  const error = useSelector(gameStore, (s) => s.error);
  const retryCount = useSelector(gameStore, (s) => s.retryCount);
  const gameState = useSelector(gameStore, (s) => s.gameState);
  const me = useSelector(gameStore, selectMe(session.playerId));
  const players = useSelector(playersStore, (p) => p);
  const voterCount = useSelector(votersStore, (v) => v.length);
  const allVoted = useSelector(allVotedStore, (v) => v);
  const countingDown = useSelector(countingDownStore, (v) => v);
  const stats = useSelector(roundStatsStore, (s) => s);

  // Keep the session's settings snapshot current so an admin refresh recreates the same room.
  useEffect(() => {
    if (gameState?.settings) updateSessionSettings(gameId, gameState.settings);
  }, [gameId, gameState?.settings]);

  const isAdmin = me?.isAdmin ?? false;
  const isSpectator = me?.isSpectator ?? false;
  const canReveal = isAdmin || (gameState?.settings.allowPlayersToReveal ?? false);

  // Courtesy checks only — the server enforces every rule regardless.
  const vote = useCallback(
    (value: string) => {
      if (isSpectator) return toast.warning('Spectators cannot vote');
      if (countingDown) return toast.warning('Voting is locked during countdown');
      gameClient.send({ type: 'vote', vote: value });
    },
    [isSpectator, countingDown],
  );
  const reveal = useCallback(() => {
    if (!canReveal) return toast.warning('Only the admin can reveal votes');
    gameClient.send({ type: 'reveal' });
  }, [canReveal]);
  const newRound = useCallback(() => {
    if (!isAdmin) return toast.warning('Only the admin can start a new round');
    gameClient.send({ type: 'newRound' });
  }, [isAdmin]);
  const updateSettings = useCallback(
    (patch: Partial<GameSettings>) => {
      if (!isAdmin) return toast.warning('Only the admin can update settings');
      gameClient.send({ type: 'updateSettings', settings: patch });
    },
    [isAdmin],
  );
  const kick = useCallback(
    (targetPlayerId: string) => {
      if (!isAdmin) return toast.warning('Only the admin can kick players');
      gameClient.send({ type: 'kickPlayer', targetPlayerId });
    },
    [isAdmin],
  );
  const transferAdmin = useCallback(
    (targetPlayerId: string) => {
      if (!isAdmin) return toast.warning('Only the admin can transfer admin rights');
      gameClient.send({ type: 'transferAdmin', targetPlayerId });
    },
    [isAdmin],
  );
  const leave = useCallback(() => {
    gameClient.send({ type: 'leave' });
    clearSession(gameId);
    toast.success('You have left the game.');
    void navigate({ to: '/' });
  }, [gameId, navigate]);
  const endGame = useCallback(() => {
    if (!isAdmin) return;
    gameClient.send({ type: 'endGame' });
    clearSession(gameId);
    toast.success('You have ended the game.');
    void navigate({ to: '/' });
  }, [gameId, isAdmin, navigate]);
  const goHome = useCallback(() => void navigate({ to: '/' }), [navigate]);

  // ---------- render branches (plan §2.2) ----------
  if (error || connectionState === 'FAILED') {
    return (
      <ErrorScreen
        message={error?.userMessage ?? 'Connection failed.'}
        onRetry={gameClient.reconnect}
        onGoHome={goHome}
      />
    );
  }
  if (connectionState !== 'CONNECTED') {
    return <ConnectingScreen attempt={retryCount} />;
  }
  if (!gameState || !me) {
    return <LoadingScreen />;
  }

  const deck = getDeck(gameState.settings.votingType);

  return (
    <div className="min-h-screen">
      {countingDown && gameState.countdownEnd !== null && (
        <CountdownOverlay countdownEnd={gameState.countdownEnd} />
      )}

      <GameHeader
        gameName={gameState.settings.gameName}
        playerName={me.name}
        gameId={gameId}
        isAdmin={isAdmin}
        settings={gameState.settings}
        history={gameState.history}
        onUpdateSettings={updateSettings}
        onLeave={leave}
        onEndGame={endGame}
      />

      <div className="flex min-h-[calc(100vh-80px)] flex-col items-center justify-between px-4">
        <div className="flex w-full grow flex-col items-center justify-center">
          <div className="sticky bottom-0 flex w-full justify-center pb-4">
            <VoteStatusCards
              players={players}
              votesRevealed={gameState.votesRevealed}
              isCurrentUserAdmin={isAdmin}
              currentPlayerId={me.id}
              onKickPlayer={kick}
              onTransferAdmin={transferAdmin}
            />
          </div>

          {!gameState.votesRevealed && (
            <>
              {allVoted && canReveal && voterCount > 1 && (
                <Button className="mb-4" onClick={reveal}>
                  Reveal Votes
                </Button>
              )}
              {isSpectator ? (
                <SpectatorView />
              ) : (
                <VotingCards
                  deck={deck}
                  selectedVote={me.vote}
                  disabled={countingDown}
                  onVote={vote}
                />
              )}
              {allVoted && !canReveal && (
                <p className="p-6 text-center text-muted-foreground">
                  Waiting for admin to reveal votes...
                </p>
              )}
            </>
          )}
        </div>

        {gameState.votesRevealed && stats && (
          <div className="flex flex-col items-center pb-40">
            {isAdmin && (
              <Button onClick={newRound} className="mb-4" size="lg">
                Start New Round
              </Button>
            )}
            <RoundStats stats={stats} />
          </div>
        )}
      </div>
    </div>
  );
}
```

What is **gone** compared with the old `GamePage.tsx`: `usePlayerSession`, `usePlayerInfo`,
`hasJoined`, `isReconnecting`, `settingsApplied`, the `beforeunload` clearing effect, the
"Please enter your name" redirect, the two `savePlayerSession`/`updateSettings` diff effects, the
`history.replaceState` effect, and ~10 `useMemo`s (now derived stores).

---

## 5. Components

### 5.1 `game-header.tsx`

Port; prop `onUpdate` → `onUpdateSettings`; import paths.

```tsx
import type { GameSettings, RoundHistoryEntry } from '@shared/schema';
import { PokeroLogo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { InviteDialog } from './invite-dialog';
import { GameHistorySheet } from './game-history-sheet';
import { GameSettingsDialog } from './game-settings-dialog';
import { LeaveGameDialog } from './leave-game-dialog';

export interface GameHeaderProps {
  gameName: string;
  playerName: string;
  gameId: string;
  isAdmin: boolean;
  settings: GameSettings;
  history: RoundHistoryEntry[];
  onUpdateSettings: (patch: Partial<GameSettings>) => void;
  onLeave: () => void;
  onEndGame: () => void;
}

export function GameHeader({
  gameName,
  playerName,
  gameId,
  isAdmin,
  settings,
  history,
  onUpdateSettings,
  onLeave,
  onEndGame,
}: GameHeaderProps) {
  return (
    <header className="border-b border-border">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <PokeroLogo className="size-6 text-primary" />
          <h1 className="text-xl font-bold text-foreground">{gameName}</h1>
        </div>
        <span className="text-lg font-semibold text-foreground">{playerName}</span>
        <div className="flex items-center gap-2">
          <InviteDialog gameId={gameId} />
          <ThemeToggle />
          <GameHistorySheet history={history} />
          {isAdmin && <GameSettingsDialog settings={settings} onUpdate={onUpdateSettings} />}
          <LeaveGameDialog
            isAdmin={isAdmin}
            onLeave={onLeave}
            onEndGame={isAdmin ? onEndGame : undefined}
          />
        </div>
      </div>
    </header>
  );
}
```

### 5.2 `vote-status-cards.tsx`

Port `vote-status-card.tsx`. Props take `Player[]` directly (no separate `PlayerVoteStatus`).

```tsx
import { memo } from 'react';
import { IconCircleCheck, IconCrown, IconEye } from '@tabler/icons-react';
import type { Player } from '@shared/schema';
import { cn } from '@/lib/utils';
import { PlayerActionsMenu } from './player-actions-menu';

export interface VoteStatusCardsProps {
  players: Player[];
  votesRevealed: boolean;
  isCurrentUserAdmin: boolean;
  currentPlayerId: string;
  onKickPlayer: (playerId: string) => void;
  onTransferAdmin: (playerId: string) => void;
}

const VoteStatusCard = memo(function VoteStatusCard({
  player,
  votesRevealed,
  showActions,
  onKickPlayer,
  onTransferAdmin,
}: {
  player: Player;
  votesRevealed: boolean;
  showActions: boolean;
  onKickPlayer: (id: string) => void;
  onTransferAdmin: (id: string) => void;
}) {
  const { name, vote, hasVoted, isSpectator, isAdmin } = player;
  const status = votesRevealed
    ? (vote ?? 'no vote')
    : hasVoted
      ? 'voted'
      : isSpectator
        ? 'spectating'
        : 'waiting';

  return (
    <div className="group/player relative flex flex-col items-center">
      <div
        role="status"
        aria-label={`${name}: ${status}`}
        className={cn(
          'flex h-32 w-20 items-center justify-center rounded-xl text-xl font-bold shadow-md transition-all',
          hasVoted
            ? 'bg-primary text-primary-foreground'
            : 'border-2 border-dashed border-primary bg-transparent',
          isSpectator && 'opacity-70',
        )}
      >
        {votesRevealed ? (
          <span>{vote ?? '?'}</span>
        ) : hasVoted ? (
          <IconCircleCheck aria-hidden="true" />
        ) : isSpectator ? (
          <IconEye className="text-primary" aria-hidden="true" />
        ) : null}
      </div>

      <div className="mt-2 flex max-w-24 flex-col items-center justify-center gap-1">
        <div className="flex items-center gap-1">
          {isAdmin && <IconCrown className="size-4 shrink-0 text-primary" aria-label="Admin" />}
          <span className="truncate font-bold" title={name}>
            {name}
          </span>
        </div>
        {showActions && (
          <div className="flex h-8 items-center justify-center">
            <PlayerActionsMenu
              playerId={player.id}
              playerName={name}
              onKick={onKickPlayer}
              onTransferAdmin={onTransferAdmin}
            />
          </div>
        )}
      </div>
    </div>
  );
});

export function VoteStatusCards({
  players,
  votesRevealed,
  isCurrentUserAdmin,
  currentPlayerId,
  onKickPlayer,
  onTransferAdmin,
}: VoteStatusCardsProps) {
  return (
    <div
      className="flex flex-wrap justify-center gap-5 py-4"
      role="group"
      aria-label="Player voting status"
    >
      {players.map((player) => (
        <VoteStatusCard
          key={player.id}
          player={player}
          votesRevealed={votesRevealed}
          showActions={isCurrentUserAdmin && player.id !== currentPlayerId}
          onKickPlayer={onKickPlayer}
          onTransferAdmin={onTransferAdmin}
        />
      ))}
    </div>
  );
}
```

### 5.3 `voting-cards.tsx`

Port; takes the resolved `deck` instead of `votingType`.

```tsx
import { memo } from 'react';
import { IconCaretDownFilled } from '@tabler/icons-react';
import { cn } from '@/lib/utils';

export interface VotingCardsProps {
  deck: readonly string[];
  selectedVote: string | null;
  disabled: boolean;
  onVote: (value: string) => void;
}

const VotingCard = memo(function VotingCard({
  value,
  isSelected,
  disabled,
  onClick,
}: {
  value: string;
  isSelected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={isSelected}
      aria-label={`Vote ${value}`}
      className={cn(
        'flex h-24 w-16 items-center justify-center rounded-lg border-2 text-sm font-semibold transition-all',
        disabled && 'cursor-not-allowed opacity-40',
        isSelected
          ? 'scale-110 -translate-y-2 border-primary bg-primary text-primary-foreground'
          : 'border-muted-foreground bg-card hover:scale-105 hover:border-primary/80 hover:text-primary',
      )}
    >
      {value}
    </button>
  );
});

export function VotingCards({ deck, selectedVote, disabled, onVote }: VotingCardsProps) {
  return (
    <div className="px-6 py-8">
      <div className="flex flex-col items-center gap-6">
        <p className="flex items-center gap-1 font-display font-extrabold text-muted-foreground">
          Choose Your Card
          <IconCaretDownFilled className="size-4" />
        </p>
        <div
          className="flex flex-wrap justify-center gap-3"
          role="radiogroup"
          aria-label="Vote selection"
        >
          {deck.map((value) => (
            <VotingCard
              key={value}
              value={value}
              isSelected={selectedVote === value}
              disabled={disabled}
              onClick={() => !disabled && onVote(value)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
```

### 5.4 `spectator-view.tsx`

```tsx
export function SpectatorView({ message = 'You are observing this round' }: { message?: string }) {
  return (
    <div className="p-6 text-center">
      <h2 className="mb-2 text-xl font-semibold">👁️ Spectating</h2>
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}
```

### 5.5 `countdown-overlay.tsx`

Port; only the motion import changes.

```tsx
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

const clampSeconds = (end: number) =>
  Math.max(0, Math.min(Math.ceil((end - Date.now()) / 1000), 3));

export function CountdownOverlay({ countdownEnd }: { countdownEnd: number }) {
  const [secondsLeft, setSecondsLeft] = useState(() => clampSeconds(countdownEnd));

  useEffect(() => {
    const id = setInterval(() => {
      const s = clampSeconds(countdownEnd);
      setSecondsLeft(s);
      if (s <= 0) clearInterval(id);
    }, 50);
    return () => clearInterval(id);
  }, [countdownEnd]);

  if (secondsLeft <= 0) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      role="status"
      aria-live="assertive"
    >
      <AnimatePresence>
        <motion.div
          key={secondsLeft}
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 2, opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="flex flex-col items-center gap-4"
        >
          <span className="text-9xl font-bold text-primary drop-shadow-lg">{secondsLeft}</span>
          <span className="text-xl font-medium text-muted-foreground">Revealing votes...</span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
```

### 5.6 `round-stats.tsx`

Merges `round-stats.tsx` + `stats/index.tsx`. Winner/draw come from `RoundStats` (computed in
`shared/stats.ts`) instead of being recomputed in the component.

```tsx
import type { ReactNode } from 'react';
import { IconHeartHandshake, IconScale, IconTrophy } from '@tabler/icons-react';
import type { RoundStats as RoundStatsType } from '@shared/stats';

function StatTile({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-4">
      <div className="shrink-0 rounded-lg bg-primary/20 p-3 text-primary">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-muted-foreground/80">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  );
}

export function formatAverage(stats: RoundStatsType): string {
  return stats.voterCount > 0 && stats.average !== null ? stats.average.toFixed(1) : '—';
}
export function formatWinner(stats: RoundStatsType): string {
  if (stats.voterCount === 0) return '—';
  return stats.isDraw ? stats.winners.slice(0, 3).join(', ') : (stats.winners[0] ?? '—');
}
export function formatAgreeability(stats: RoundStatsType, digits = 1): string {
  return stats.voterCount > 0 && stats.agreeability !== null
    ? `${stats.agreeability.toFixed(digits)}%`
    : '—';
}

export function RoundStats({ stats }: { stats: RoundStatsType }) {
  return (
    <div className="fixed right-0 bottom-0 left-0 animate-slide-up border-t border-primary/20 bg-background shadow-2xl">
      <div className="flex max-w-full justify-center px-4 sm:px-6 lg:px-8">
        <div className="mx-auto grid grid-cols-1 gap-8 py-8 sm:grid-cols-3">
          <StatTile icon={<IconScale />} label="Average" value={formatAverage(stats)} />
          <StatTile icon={<IconTrophy />} label="Winning Vote" value={formatWinner(stats)} />
          <StatTile
            icon={<IconHeartHandshake />}
            label="Agreeability"
            value={formatAgreeability(stats)}
          />
        </div>
      </div>
    </div>
  );
}
```

### 5.7 `game-history-sheet.tsx`

Port `game-history.tsx` (already Tabler). Import `VOTING_TYPE_LABELS` from `@shared/constants` and
`RoundHistoryEntry` from `@shared/schema`. Keep: badge count, "Round History" title, description
copy, newest-first, `HH:MM`, `Avg` / `Winner` (`+ " (tie)"`) / `Agree` (0 dp), "N voter(s) · <label>",
chips sorted by name. Export as `GameHistorySheet`.

### 5.8 `game-settings-dialog.tsx`

Port `game-settings.tsx` with these changes:

- Validation via `GameNameSchema.safeParse` (messages "Game name cannot be empty" / "Game name must
  be 100 characters or less" come from the schema).
- Sync local state from props with a `key` on the dialog content instead of a `useEffect` (React
  re-mounts the form when settings change while the dialog is closed):

```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogTrigger asChild>
    <Button variant="ghost" size="icon" aria-label="Open game settings">
      <IconAdjustments />
    </Button>
  </DialogTrigger>
  <DialogContent className="sm:max-w-[425px]">
    <SettingsForm
      key={JSON.stringify(settings)}
      settings={settings}
      onUpdate={onUpdate}
      onClose={() => setOpen(false)}
    />
  </DialogContent>
</Dialog>
```

`SettingsForm` holds the four fields (`Name`, `Voting Type` with helper "Changing voting type will
reset all current votes", switches "Allow All Players to Reveal Cards" / "Spectator Mode"), and
`handleSave` builds the **diff** exactly as the old file did, toasting "Settings updated
successfully" / "No changes to save". `Cancel` simply calls `onClose` (the `key` reset makes the
manual field resets unnecessary).

### 5.9 `invite-dialog.tsx`

Port `game-share-dialog.tsx`; `generateShareUrl` from `@/lib/share`. Copy unchanged ("Invite
Players", read-only mono input, "Copy Invite Link" → toast "Game link copied to clipboard!" /
"Failed to copy link").

### 5.10 `leave-game-dialog.tsx` — **bug fix** (plan §3.4 #7)

```tsx
import { IconChevronDown, IconCrown, IconDoorExit } from '@tabler/icons-react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface LeaveGameDialogProps {
  isAdmin: boolean;
  onLeave: () => void;
  onEndGame?: () => void;
}

export function LeaveGameDialog({ isAdmin, onLeave, onEndGame }: LeaveGameDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="icon" aria-label="Leave game">
          <IconDoorExit />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Leaving so Soon?</AlertDialogTitle>
          <AlertDialogDescription>
            {isAdmin
              ? 'You are the admin of this game. If you leave, admin privileges will be transferred to another player. Are you sure you want to leave?'
              : 'Are you sure you want to leave this game? You can rejoin later using the same link.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className={isAdmin ? 'flex-col gap-2 sm:flex-row' : undefined}>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          {isAdmin && onEndGame ? (
            <ButtonGroup>
              <Button variant="destructive" onClick={onLeave}>
                Leave Game
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="destructive"
                    size="icon"
                    aria-label="More options"
                    className="border-l border-destructive-foreground/20"
                  >
                    <IconChevronDown />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem variant="destructive" onClick={onEndGame}>
                    <IconCrown />
                    End Game
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </ButtonGroup>
          ) : (
            <Button variant="destructive" onClick={onLeave}>
              Leave Game
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

Old bugs fixed: the admin **Leave Game** button had no `onClick` (the chevron had it); description
typo "You can region later".

### 5.11 `player-actions-menu.tsx`

Port as-is (Tabler already, copy matches §2.3). Remove the unused `setMenuOpen` state. Export
`PlayerActionsMenu`.

---

## 6. Tests

All in `src/features/game/__tests__/`. Component tests render the component directly (props are
serialisable); the page test seeds `gameStore` and mocks `gameClient`.

### 6.1 Component states

| File                            | Assertions                                                                                                                                                                                           |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vote-status-cards.test.tsx`    | not voted → dashed card, `aria-label="Ann: waiting"`; voted → `Ann: voted`; spectator → `Ann: spectating`; revealed → shows value; crown next to admin; actions toolbar only when admin and not self |
| `voting-cards.test.tsx`         | renders every deck value; selected has `aria-pressed="true"`; click calls `onVote('5')`; disabled → no call                                                                                          |
| `countdown-overlay.test.tsx`    | fake timers: `countdownEnd = now + 3000` renders `3`, advances to `2`, `1`, unmounts (returns null) at 0                                                                                             |
| `round-stats.test.tsx`          | `[3,3,5]` → "3.7", "3", "95.1%"; zero voters → "—" ×3; draw → "1, 2"                                                                                                                                 |
| `game-history-sheet.test.tsx`   | badge hidden at 0; description copy for 0 and N; newest first; "(tie)" suffix; chips sorted                                                                                                          |
| `game-settings-dialog.test.tsx` | save with no changes → toast "No changes to save"; empty name → "Game name cannot be empty"; change type → `onUpdate({ votingType: 't-shirt' })` only                                                |
| `invite-dialog.test.tsx`        | input value `${origin}/join?gameId=abc1234`; click → `navigator.clipboard.writeText` called, toast "Game link copied to clipboard!" (mock clipboard with `vi.stubGlobal`)                            |
| `leave-game-dialog.test.tsx`    | non-admin copy + Leave calls `onLeave`; admin copy; **Leave Game half calls `onLeave`**; dropdown → End Game calls `onEndGame`                                                                       |
| `player-actions-menu.test.tsx`  | kick dialog copy "Kick Bob?" … confirm → `onKick('b')`; transfer dialog copy → `onTransferAdmin('b')`                                                                                                |

### 6.2 `game-page.test.tsx` (integration)

```tsx
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { routeTree } from '@/routeTree.gen';
import { saveSession } from '@/lib/session';
import { gameStore, resetGameStore } from '@/stores/game-store';
import type { GameState } from '@shared/schema';

vi.mock('@/lib/game-client', async () => {
  const { createEmitter } = await import('@/lib/emitter');
  const emitter = createEmitter<Record<string, unknown>>();
  return {
    gameClient: {
      connect: vi.fn(),
      disconnect: vi.fn(),
      reconnect: vi.fn(),
      send: vi.fn(),
      on: emitter.on,
      __emit: emitter.emit,
    },
  };
});

const { gameClient } = await import('@/lib/game-client');

const state = (over: Partial<GameState> = {}): GameState => ({
  gameId: 'abc1234',
  settings: {
    gameName: 'Sprint',
    allowPlayersToReveal: true,
    adminCanSpectate: false,
    votingType: 'fibonacci',
  },
  players: {
    me: { id: 'me', name: 'Ann', isAdmin: true, isSpectator: false, vote: null, hasVoted: false },
    bob: {
      id: 'bob',
      name: 'Bob',
      isAdmin: false,
      isSpectator: false,
      vote: null,
      hasVoted: false,
    },
  },
  roundActive: true,
  votesRevealed: false,
  countdownEnd: null,
  adminId: 'me',
  history: [],
  ...over,
});

function renderGame() {
  saveSession({ gameId: 'abc1234', playerId: 'me', playerName: 'Ann', isAdmin: true });
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/game/abc1234'] }),
  });
  render(<RouterProvider router={router} />);
  return router;
}

describe('GamePage', () => {
  beforeEach(() => {
    resetGameStore();
    vi.clearAllMocks();
  });

  it('shows connecting, then the room once connected with state', async () => {
    renderGame();
    expect(await screen.findByText(/Connecting to game/)).toBeInTheDocument();
    gameStore.setState((s) => ({ ...s, connectionState: 'CONNECTED' }));
    expect(await screen.findByText('Loading game...')).toBeInTheDocument();
    gameStore.setState((s) => ({ ...s, gameState: state() }));
    expect(await screen.findByRole('heading', { name: 'Sprint' })).toBeInTheDocument();
    expect(screen.getByText('Choose Your Card')).toBeInTheDocument();
  });

  it('voting sends a vote frame; reveal button appears when all voted', async () => {
    renderGame();
    gameStore.setState((s) => ({ ...s, connectionState: 'CONNECTED', gameState: state() }));
    await userEvent.click(await screen.findByRole('button', { name: 'Vote 5' }));
    expect(gameClient.send).toHaveBeenCalledWith({ type: 'vote', vote: '5' });

    const s = state();
    s.players.me = { ...s.players.me, vote: '5', hasVoted: true };
    s.players.bob = { ...s.players.bob, vote: '8', hasVoted: true };
    gameStore.setState((st) => ({ ...st, gameState: s }));
    await userEvent.click(await screen.findByRole('button', { name: 'Reveal Votes' }));
    expect(gameClient.send).toHaveBeenCalledWith({ type: 'reveal' });
  });

  it('revealed state shows stats and Start New Round for admin', async () => {
    renderGame();
    const s = state({ votesRevealed: true });
    s.players.me = { ...s.players.me, vote: '5', hasVoted: true };
    s.players.bob = { ...s.players.bob, vote: '8', hasVoted: true };
    gameStore.setState((st) => ({ ...st, connectionState: 'CONNECTED', gameState: s }));
    expect(await screen.findByText('Average')).toBeInTheDocument();
    expect(screen.getByText('6.5')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Start New Round' }));
    expect(gameClient.send).toHaveBeenCalledWith({ type: 'newRound' });
  });

  it('being kicked clears the session and navigates home', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const router = renderGame();
    gameStore.setState((s) => ({ ...s, connectionState: 'CONNECTED', gameState: state() }));
    await screen.findByText('Choose Your Card');
    (gameClient as unknown as { __emit: (e: string, p: unknown) => void }).__emit('playerKicked', {
      playerId: 'me',
      playerName: 'Ann',
      kickedBy: 'Bob',
    });
    expect(await screen.findByText(/You were kicked from the game by Bob/)).toBeInTheDocument();
    vi.advanceTimersByTime(1500);
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(localStorage.getItem('pokero_session_abc1234')).toBeNull();
    vi.useRealTimers();
  });

  it('error state offers Retry', async () => {
    renderGame();
    gameStore.setState((s) => ({
      ...s,
      connectionState: 'FAILED',
      error: {
        code: 'MAX_RETRIES_REACHED',
        message: '',
        userMessage: 'Unable to reconnect to the game. Please refresh the page.',
        timestamp: 0,
      },
    }));
    expect(await screen.findByText('Connection Error')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Retry/ }));
    expect(gameClient.reconnect).toHaveBeenCalled();
  });
});
```

---

## 7. Manual verification — full matrix

Run `npm run party` + `npm run dev`, two browser profiles, and walk plan §9 in order. Items specific
to this milestone:

- [ ] Create with custom name, T-Shirt, spectator on → room shows those settings **immediately**
      (no flicker), creator has crown and 👁 card.
- [ ] Invite copies; second profile joins; both see two cards.
- [ ] Non-admin votes → filled ✓ card on both. Admin (spectator) clicking a card is impossible
      (SpectatorView shown); toggling spectator off in Settings shows the deck.
- [ ] All voted + voters > 1 → "Reveal Votes" for whoever may reveal; with "Allow All Players…" off
      the non-admin sees "Waiting for admin to reveal votes...".
- [ ] Reveal → 3-2-1 overlay on both → values → stats bar → history badge 1 → sheet lists round.
- [ ] Start New Round → cards reset, bar gone, badge stays 1.
- [ ] Change voting type mid-round → votes reset; during a countdown → countdown cancelled.
- [ ] Kick → target toast + redirect + session cleared; others toast "was kicked".
- [ ] Transfer admin → crown moves; controls move.
- [ ] Admin **Leave Game** (left half) → auto-transfer; **End Game** → everyone home.
- [ ] Kill `wrangler dev` → "Connecting to game (attempt N)" → restart → "Reconnected to the game!".
- [ ] Kill during countdown → restart → round revealed with history (durable alarm).
- [ ] Refresh → same player identity, no name prompt.

`npm run check` green. Commit: `feat(game): game room UI on gameStore/gameClient`.

---

## Old code superseded by this milestone

| Old                                                 | Action                                                          |
| --------------------------------------------------- | --------------------------------------------------------------- |
| `src/pages/GamePage.tsx`                            | → `features/game/game-page.tsx` + `use-game-events.ts`          |
| `src/components/game/*` (all 11 files + `index.ts`) | → `features/game/*` (renamed as listed in §1)                   |
| `src/components/game/stats/index.tsx`               | Folded into `round-stats.tsx`; maths moved to `shared/stats.ts` |
| `LeaveGameDialog` split-button wiring               | Fixed                                                           |
| `GameSettings` `useEffect` prop-sync                | Replaced by `key`-based remount                                 |
| `PlayerActionsMenu` `setMenuOpen` dead state        | Removed                                                         |
