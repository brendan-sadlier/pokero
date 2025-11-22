import type { RoundStats as RoundStatsType } from '../../types';
import { AverageVote, WinningVote } from './stats';

interface RoundStatsProps {
  stats: RoundStatsType;
}

export default function RoundStats({ stats }: RoundStatsProps) {
  const hasVotes = Object.values(stats.distribution).length > 0;
  return (
    <div className="w-full py-2">
      <div className="container max-w-2xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
          <WinningVote distribution={stats.distribution} hasVotes={hasVotes} />
          <AverageVote average={stats.average} hasVotes={hasVotes} />
        </div>
      </div>
    </div>
  );
}
