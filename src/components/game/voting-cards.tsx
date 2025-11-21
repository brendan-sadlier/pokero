import { Coffee } from 'lucide-react';
import { cn } from '../../lib/utils';

interface VotingCardsProps {
  onVote: (vote: string) => void;
  selectedVote: string | null;
  disabled: boolean;
}

const CARD_VALUES = ['1', '2', '3', '5', '8', '13', '21', '34'];

export default function VotingCards({ onVote, selectedVote, disabled }: VotingCardsProps) {
  return (
    <div className="px-6 py-8">
      <div className="flex flex-col items-center gap-6">
        <p className="">Choose your card 👇</p>

        <div className="flex gap-3 flex-wrap justify-center">
          {CARD_VALUES.map((value) => {
            const isSelected = selectedVote === value;

            return (
              <button
                key={value}
                disabled={disabled}
                onClick={() => !disabled && onVote(value)}
                className={cn(
                  'w-16 h-24 rounded-lg border-2 flex items-center justify-center font-semibold text-sm transition-all',
                  disabled && 'opacity-40 cursor-not-allowed',
                  isSelected
                    ? `
                      bg-primary text-white border-primary scale-110 -translate-y-2
                    `
                    : `
                      border-muted-foreground bg-base-100 dark:bg-base-800
                      hover:border-primary/80 hover:text-primary hover:scale-105 cursor-pointer
                    `,
                )}
              >
                {value}
              </button>
            );
          })}

          {/* Coffee Card */}
          <button
            disabled={disabled}
            onClick={() => !disabled && onVote('coffee')}
            className={cn(
              'w-16 h-24 rounded-lg border-2 flex items-center justify-center text-2xl transition-all',
              disabled && 'opacity-40 cursor-not-allowed',
              selectedVote === 'coffee'
                ? `
                  bg-primary text-white border-primary scale-110 -translate-y-2
                  `
                : `
                    border-muted-foreground bg-base-100 dark:bg-base-800
                    hover:border-primary/80 hover:text-primary hover:scale-105 cursor-pointer
                  `,
            )}
          >
            <Coffee />
          </button>
        </div>
      </div>
    </div>
  );
}
