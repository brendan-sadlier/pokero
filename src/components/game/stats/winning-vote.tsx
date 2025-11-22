import { Equal, Trophy } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Card, CardContent } from '../../ui/card';

interface WinningVoteProps {
  distribution: Record<string, number>;
  hasVotes: boolean;
}

function getWinningVote(distribution: Record<string, number>): {
  winners: string[];
  count: number;
  isDraw: boolean;
} {
  const entries = Object.entries(distribution);

  if (entries.length === 0) {
    return { winners: [], count: 0, isDraw: false };
  }

  const maxCount = Math.max(...entries.map(([, count]) => count));
  const winners = entries.filter(([, count]) => count === maxCount).map(([vote]) => vote);

  return {
    winners,
    count: maxCount,
    isDraw: winners.length > 1,
  };
}

export function WinningVote({ distribution, hasVotes }: WinningVoteProps) {
  const { winners, isDraw } = getWinningVote(distribution);

  const displayValue = !hasVotes
    ? '—'
    : isDraw
      ? winners.slice(0, 3).join(', ')
      : winners[0] || '—';

  const label = !hasVotes ? 'Winner' : isDraw ? 'Draw' : 'Winner';

  return (
    <Card className="bg-background">
      <CardContent className="flex flex-col items-center justify-center gap-4 py-6">
        <div
          className={cn(
            'rounded-xl flex items-center justify-center size-12',
            `border transition-colors`,
            hasVotes
              ? isDraw
                ? 'border-secondary/30 bg-secondary/10 text-secondary'
                : 'border-primary/30 bg-primary/10 text-primary'
              : 'border-muted-foreground/30 bg-muted text-muted-foreground',
          )}
        >
          {isDraw ? <Equal className="size-6" /> : <Trophy className="size-6" />}
        </div>
        <div className="space-y-1 text-center">
          <div className="text-3xl font-bold text-foreground leading-none">{displayValue}</div>
          <div className="text-sm text-muted-foreground font-medium">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}
