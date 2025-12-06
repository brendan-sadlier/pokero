/**
 * @fileoverview Round statistics display component.
 * Shows the winning vote and average after votes are revealed.
 */

import { memo } from 'react';
import type { RoundStats as RoundStatsType } from '../../types';
import { AverageVote, WinningVote } from './stats';

interface RoundStatsProps {
  stats: RoundStatsType;
}

/**
 * Displays round statistics after votes are revealed.
 *
 * @example
 * {gameState.votesRevealed && stats && <RoundStats stats={stats} />}
 */
function RoundStatsComponent({ stats }: RoundStatsProps) {
  const hasVotes = Object.values(stats.distribution).length > 0;
  return (
    <div className="w-full py-2">
      <div className="container max-w-2xl mx-auto">
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4"
          role="region"
          aria-label="Round statistics"
        >
          <WinningVote distribution={stats.distribution} hasVotes={hasVotes} />
          <AverageVote average={stats.average} hasVotes={hasVotes} />
        </div>
      </div>
    </div>
  );
}

export const RoundStats = memo(RoundStatsComponent);
RoundStats.displayName = 'RoundStats';

export default RoundStats;
