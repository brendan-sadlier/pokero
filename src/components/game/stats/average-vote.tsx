import { Scale } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Card, CardContent } from '../../ui/card';

interface AverageVoteProps {
  average: number | null;
  hasVotes: boolean;
}

export function AverageVote({ average, hasVotes }: AverageVoteProps) {
  return (
    <Card className="bg-background">
      <CardContent className="flex flex-col items-center justify-center gap-4 py-6">
        <div
          className={cn(
            'rounded-xl flex items-center justify-center size-12',
            `border transition-colors`,
            hasVotes
              ? 'border-primary/30 bg-primary/10 text-primary'
              : 'border-muted-foreground/30 bg-muted text-muted-foreground',
          )}
        >
          <Scale className="size-6" />
        </div>
        <div className="space-y-1 text-center">
          <div className="text-3xl font-bold text-foreground leading-none">
            {hasVotes && average !== null ? average.toFixed(1) : '—'}
          </div>
          <div className="text-sm text-muted-foreground font-medium">Average</div>
        </div>
      </CardContent>
    </Card>
  );
}
