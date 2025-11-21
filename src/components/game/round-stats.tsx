import { Scale, Trophy } from 'lucide-react';
import type { RoundStats as RoundStatsType } from '../../types';
import { Card, CardContent } from '../ui/card';
import { cn } from '../../lib/utils';
import { VoteDistributionChart } from '../charts/vote-distribution-chart';

interface RoundStatsProps {
  stats: RoundStatsType;
}

function getWinningVote(distribution: Record<string, number>): string | null {
  let winningVote: string | null = null;
  let maxCount = 0;

  for (const [vote, count] of Object.entries(distribution)) {
    if (count > maxCount) {
      maxCount = count;
      winningVote = vote;
    }
  }

  return winningVote;
}

export default function RoundStats({ stats }: RoundStatsProps) {
  return (
    <div className="flex items-center justify-center">
      <div className="container w-xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="w-full col-span-1 md:col-span-2 bg-background items-center">
            <CardContent className="overflow-visible">
              <VoteDistributionChart distribution={stats.distribution} />
            </CardContent>
          </Card>
          <Card className="bg-background">
            <CardContent className="flex flex-col items-center pt-4 -pb-1">
              {/* Icon */}
              <div
                className={cn(
                  `rounded-xl flex items-center justify-center size-12 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400`,
                )}
              >
                <Trophy className="size-6" />
              </div>
              <div className="space-y-0.5">
                <div className="text-3xl font-bold text-foreground leading-none">
                  {getWinningVote(stats.distribution) ?? '-'}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-background">
            <CardContent className="flex flex-col items-start gap-6">
              {/* Icon */}
              <div
                className={cn(
                  `rounded-xl flex items-center justify-center size-12 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400`,
                )}
              >
                <Scale className="size-6" />
              </div>
              <div className="space-y-0.5">
                <div className="text-2xl font-bold text-foreground leading-none">
                  {stats.average !== null ? stats.average.toFixed(1) : '-'}
                </div>
                <div className="text-sm text-muted-foreground">Average</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
