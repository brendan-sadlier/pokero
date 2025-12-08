/**
 * @fileoverview Statistics display components for round results.
 */

import { memo, useMemo } from 'react';
import { Handshake, Scale, Trophy } from 'lucide-react';

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
    <div className="flex items-center gap-4 group">
      {/* Icon Container */}
      <div className="shrink-0 p-3 bg-primary/20 rounded-lg transition-all duration-300">
        <div className="text-primary">
          <Scale />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-muted-foreground/80 text-sm font-medium truncate">Average</p>
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold">{displayValue}</p>
        </div>
      </div>
    </div>
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

  return (
    <div className="flex items-center gap-4 group">
      {/* Icon Container */}
      <div className="shrink-0 p-3 bg-primary/20 rounded-lg transition-all duration-300">
        <div className="text-primary">
          <Trophy />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-muted-foreground/80 text-sm font-medium truncate">Winning Vote</p>
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold">{displayValue}</p>
        </div>
      </div>
    </div>
  );
}

export const WinningVote = memo(WinningVoteComponent);
WinningVote.displayName = 'WinningVote';

interface AgreeabilityVoteProps {
  agreeability: number | null;
  hasVotes: boolean;
}

/**
 * Displays the agreeability percentage of votes.
 */
function AgreeabilityVoteComponent({ agreeability, hasVotes }: AgreeabilityVoteProps) {
  const displayValue = hasVotes && agreeability !== null ? `${agreeability.toFixed(1)}%` : '—';

  return (
    <div className="flex items-center gap-4 group">
      {/* Icon Container */}
      <div className="shrink-0 p-3 bg-primary/20 rounded-lg transition-all duration-300">
        <div className="text-primary">
          <Handshake />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-muted-foreground/80 text-sm font-medium truncate">Agreeability</p>
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold">{displayValue}</p>
        </div>
      </div>
    </div>
  );
}

export const AgreeabilityVote = memo(AgreeabilityVoteComponent);
AgreeabilityVote.displayName = 'AgreeabilityVote';
