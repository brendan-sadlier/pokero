/**
 * @fileoverview Voting cards component for selecting story point estimates.
 * Displays clickable cards for each available voting option.
 */

import { memo, useCallback } from 'react';
import { cn } from '../../lib/utils';
import { CARD_VALUES, type CardValue } from '../../types';

interface VotingCardsProps {
  // Callback when a vote is selected
  onVote: (vote: string) => void;
  // Currently selected vote
  selectedVote: string | null;
  // Whether voting is disabled
  disabled: boolean;
}

interface VotingCardProps {
  // Card value to display
  value: CardValue;
  // Whether this card is currently selected
  isSelected: boolean;
  // Whether this card is disabled
  disabled: boolean;
  // Callback when this card is clicked
  onClick: () => void;
}

/**
 * Individual voting card button.
 */
const VotingCard = memo(function VotingCard({
  value,
  isSelected,
  disabled,
  onClick,
}: VotingCardProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={isSelected}
      aria-label={`Vote ${value}`}
      className={cn(
        'w-16 h-24 rounded-lg border-2 flex items-center justify-center font-semibold text-sm transition-all',
        disabled && 'opacity-40 cursor-not-allowed',
        isSelected
          ? 'bg-primary text-white border-primary scale-110 -translate-y-2'
          : 'border-muted-foreground bg-base-100 dark:bg-base-800 hover:border-primary/80 hover:text-primary hover:scale-105 cursor-pointer',
      )}
    >
      {value}
    </button>
  );
});

VotingCard.displayName = 'VotingCard';

/**
 * Grid of voting cards for story point estimation.
 *
 * @example
 * <VotingCards
 *   onVote={handleVote}
 *   selectedVote={currentPlayer.vote}
 *   disabled={votesRevealed}
 * />
 */
function VotingCardComponent({ onVote, selectedVote, disabled }: VotingCardsProps) {
  const handleCardClick = useCallback(
    (value: CardValue) => {
      if (!disabled) {
        onVote(value);
      }
    },
    [disabled, onVote],
  );

  return (
    <div className="px-6 py-8">
      <div className="flex flex-col items-center gap-6">
        <p className="text-foreground">Choose your card 👇</p>

        <div
          className="flex gap-3 flex-wrap justify-center"
          role="radiogroup"
          aria-label="Vote selection"
        >
          {CARD_VALUES.map((value) => (
            <VotingCard
              key={value}
              value={value}
              isSelected={selectedVote === value}
              disabled={disabled}
              onClick={() => handleCardClick(value)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export const VotingCards = memo(VotingCardComponent);
VotingCards.displayName = 'VotingCards';

export default VotingCards;
