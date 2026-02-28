import {
  IconHeartHandshake,
  IconHistory,
  IconScale,
  IconTrophy,
  IconUsers,
} from '@tabler/icons-react';
import { VOTING_TYPE_LABELS, type RoundHistoryEntry } from '../../types';
import { memo, useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../ui/sheet';
import { Button } from '../ui/button';

interface GameHistoryProps {
  history: RoundHistoryEntry[];
}

interface RoundCardProps {
  entry: RoundHistoryEntry;
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

const RoundCard = memo(function RoundCard({ entry }: RoundCardProps) {
  const winnerDisplay = entry.isDraw
    ? entry.winners.slice(0, 3).join(', ') + ' (tie)'
    : entry.winners[0] || '-';

  const averageDisplay = entry.average !== null ? entry.average.toFixed(1) : '—';

  const agreeabilityDisplay =
    entry.agreeability !== null ? `${entry.agreeability.toFixed(0)}%` : '—';

  const sortedPlayerVotes = useMemo(
    () => Object.entries(entry.playerVotes).sort(([a], [b]) => a.localeCompare(b)),
    [entry.playerVotes],
  );

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      {/* Round header */}
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-foreground">Round {entry.roundNumber}</h4>
        <span className="text-xs text-muted-foreground">{formatTime(entry.completedAt)}</span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="flex items-center gap-2">
          <IconScale className="size-3.5 text-primary shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">Avg</p>
            <p className="text-sm font-semibold">{averageDisplay}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <IconTrophy className="size-3.5 text-primary shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">Winner</p>
            <p className="text-sm font-semibold">{winnerDisplay}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <IconHeartHandshake className="size-3.5 text-primary shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">Agree</p>
            <p className="text-sm font-semibold">{agreeabilityDisplay}</p>
          </div>
        </div>
      </div>

      {/* Player votes */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <IconUsers className="size-3" />
          <span>
            {entry.voterCount} voter{entry.voterCount !== 1 ? 's' : ''} &middot;{' '}
            {VOTING_TYPE_LABELS[entry.votingType] ?? entry.votingType}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {sortedPlayerVotes.map(([name, vote]: [string, string]) => (
            <span
              key={name}
              className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs"
            >
              <span className="text-muted-foreground">{name}</span>
              <span className="font-semibold text-foreground">{vote}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
});

RoundCard.displayName = 'RoundCard';

function GameHistoryComponent({ history }: GameHistoryProps) {
  // Show most recent rounds first
  const reversedHistory = useMemo(() => [...history].reverse(), [history]);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" aria-label="View round history" className="relative">
          <IconHistory className="size-4" />
          {history.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {history.length}
            </span>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Round History</SheetTitle>
          <SheetDescription>
            {history.length === 0
              ? 'No rounds completed yet. Results will appear here after each reveal.'
              : `${history.length} round${history.length !== 1 ? 's' : ''} completed`}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-3 px-4 pb-6">
          {reversedHistory.map((entry) => (
            <RoundCard key={entry.roundNumber} entry={entry} />
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export const GameHistory = memo(GameHistoryComponent);
GameHistory.displayName = 'GameHistory';

export default GameHistory;
