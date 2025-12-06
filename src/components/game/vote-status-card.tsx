/**
 * @fileoverview Vote status cards showing each player's voting state.
 * Displays cards that indicate whether players have voted and their votes when revealed.
 */

import { CircleCheck, Eye } from 'lucide-react';
import { memo } from 'react';
import { cn } from '../../lib/utils';

export interface PlayerVoteStatus {
  // Unique player identifier
  id: string;
  // Player display name
  name: string;
  // Player's current vote value
  vote?: string | null;
  // Whether the player has voted
  hasVoted: boolean;
  // Whether the player is a spectator
  isSpectator?: boolean;
}

interface VoteStatusCardsProps {
  // List of players and their vote statuses
  players: PlayerVoteStatus[];
  // Whether votes have been revealed
  votesRevealed: boolean;
}

interface VoteStatusCardProps {
  // Player's vote status
  player: PlayerVoteStatus;
  // Whether votes are revealed
  votesRevealed: boolean;
}

/**
 * Single player's vote status card.
 */

const VoteStatusCard = memo(function VoteStatusCard({
  player,
  votesRevealed,
}: VoteStatusCardProps) {
  const { name, vote, hasVoted, isSpectator } = player;

  const renderCardContent = () => {
    if (votesRevealed) {
      return <span className="text-white">{vote ?? '?'}</span>;
    }

    if (hasVoted) {
      return (
        <span className="text-white">
          <CircleCheck aria-label="Has voted" />
        </span>
      );
    }

    if (isSpectator) {
      return (
        <span className="text-primary">
          <Eye aria-label="Spectating" />
        </span>
      );
    }

    return <span className="text-transparent">x</span>;
  };

  return (
    <div className="flex flex-col items-center">
      <div
        className={cn(
          'flex items-center justify-center w-20 h-32 rounded-xl shadow-md text-xl font-bold transition-all',
          hasVoted
            ? 'bg-primary text-foreground'
            : 'bg-transparent border-2 border-dashed border-primary text-transparent',
          isSpectator && 'dark:bg-base-600 opacity-70 dark:border-base-800',
        )}
        role="status"
        aria-label={`${name}: ${votesRevealed ? vote || 'no vote' : hasVoted ? 'voted' : isSpectator ? 'spectating' : 'waiting'}`}
      >
        {renderCardContent()}
      </div>
      <span className="mt-2 text-md font-bold">{name}</span>
    </div>
  );
});

VoteStatusCard.displayName = 'VoteStatusCard';

/**
 * Displays all players' voting status in a grid.
 *
 * @example
 * <VoteStatusCards
 *   players={Object.values(gameState.players)}
 *   votesRevealed={gameState.votesRevealed}
 * />
 */
function VoteStatusCardsComponent({ players, votesRevealed }: VoteStatusCardsProps) {
  return (
    <div
      className="flex flex-wrap justify-center gap-5 py-4"
      role="group"
      aria-label="Player voting status"
    >
      {players.map((player) => (
        <VoteStatusCard key={player.id} player={player} votesRevealed={votesRevealed} />
      ))}
    </div>
  );
}

export const VoteStatusCards = memo(VoteStatusCardsComponent);
VoteStatusCards.displayName = 'VoteStatusCards';

export default VoteStatusCards;
