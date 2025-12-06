/**
 * @fileoverview Statistics display components for round results.
 */

import { memo, useMemo } from 'react';
import { Card, CardContent } from '../../ui/card';
import { cn } from '../../../lib/utils';
import { Equal, Scale, Trophy } from 'lucide-react';

interface AverageVoteProps {
  // Calculated average vote
  average: number | null;
  // Whether there were any votes cast
  hasVotes: boolean;
}

/**
 * Displays the average of all numeric votes.
 */
function AverageVoteComponent({ average, hasVotes }: AverageVoteProps) {
  const displayValue = hasVotes && average !== null ? average.toFixed(1) : '—';

  return (
    <Card className="bg-background">
      <CardContent className="flex flex-col items-center justify-center gap-4 py-6">
        <div
          className={cn(
            'rounded-xl flex items-center justify-center size-12 border transition-colors',
            hasVotes
              ? 'border-primary/30 bg-primary/10 text-primary'
              : 'border-muted-foreground/30 bg-muted text-muted-foreground',
          )}
          aria-hidden="true"
        >
          <Scale className="size-6" />
        </div>
        <div className="space-y-1 text-center">
          <div
            className="text-3xl font-bold text-foreground leading-none"
            aria-label={`Average: ${displayValue}`}
          >
            {displayValue}
          </div>
          <div className="text-sm text-muted-foreground font-medium">Average</div>
        </div>
      </CardContent>
    </Card>
  );
}

export const AverageVote = memo(AverageVoteComponent);
AverageVote.displayName = 'AverageVote';

interface WinningVoteProps {
  /** Distribution of votes (vote value -> count) */
  distribution: Record<string, number>;
  /** Whether any votes were cast */
  hasVotes: boolean;
}

interface WinningVoteResult {
  /** Array of winning vote values */
  winners: string[];
  /** Number of votes for winner(s) */
  count: number;
  /** Whether there's a tie */
  isDraw: boolean;
}

/**
 * Calculates the winning vote(s) from a distribution.
 */
function getWinningVote(distribution: Record<string, number>): WinningVoteResult {
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

/**
 * Displays the winning vote or indicates a draw.
 */
function WinningVoteComponent({ distribution, hasVotes }: WinningVoteProps) {
  const { winners, isDraw } = useMemo(() => getWinningVote(distribution), [distribution]);

  const displayValue = !hasVotes
    ? '—'
    : isDraw
      ? winners.slice(0, 3).join(', ')
      : winners[0] || '—';

  const label = !hasVotes ? 'Winner' : isDraw ? 'Draw' : 'Winner';

  const iconStyles = cn(
    'rounded-xl flex items-center justify-center size-12 border transition-colors',
    hasVotes
      ? isDraw
        ? 'border-secondary/30 bg-secondary/10 text-secondary'
        : 'border-primary/30 bg-primary/10 text-primary'
      : 'border-muted-foreground/30 bg-muted text-muted-foreground',
  );

  return (
    <Card className="bg-background">
      <CardContent className="flex flex-col items-center justify-center gap-4 py-6">
        <div className={iconStyles} aria-hidden="true">
          {isDraw ? <Equal className="size-6" /> : <Trophy className="size-6" />}
        </div>
        <div className="space-y-1 text-center">
          <div
            className="text-3xl font-bold text-foreground leading-none"
            aria-label={`${label}: ${displayValue}`}
          >
            {displayValue}
          </div>
          <div className="text-sm text-muted-foreground font-medium">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export const WinningVote = memo(WinningVoteComponent);
WinningVote.displayName = 'WinningVote';
