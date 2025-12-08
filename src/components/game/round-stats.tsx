/**
 * @fileoverview Round statistics display component.
 * Shows the winning vote and average after votes are revealed.
 */

import { memo } from 'react';
import type { RoundStats as RoundStatsType } from '../../types';
import { AgreeabilityVote, AverageVote, WinningVote } from './stats';

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
    <div className="fixed bottom-0 left-0 right-0 shadow-2xl border-t border-primary/20 animate-slide-up">
      <div className="max-w-full flex justify-center px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 py-8 mx-auto">
          <AverageVote average={stats.average} hasVotes={hasVotes} />
          <WinningVote distribution={stats.distribution} hasVotes={hasVotes} />
          <AgreeabilityVote agreeability={stats.agreeability ?? null} hasVotes={hasVotes} />
        </div>
      </div>
    </div>
  );
}

export const RoundStats = memo(RoundStatsComponent);
RoundStats.displayName = 'RoundStats';

export default RoundStats;
