/**
 * @fileoverview Vote status cards showing each player's voting state.
 * Displays cards that indicate whether players have voted and their votes when revealed.
 */

import { CircleCheck, Crown, Eye } from 'lucide-react';
import { memo } from 'react';
import { cn } from '../../lib/utils';
import PlayerActionsMenu from './player-actions-menu';

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
  // Whether the player is the admin
  isAdmin?: boolean;
}

interface VoteStatusCardsProps {
  // List of players and their vote statuses
  players: PlayerVoteStatus[];
  // Whether votes have been revealed
  votesRevealed: boolean;
  // Whether the current user is the admin (enables player action menus)
  isCurrentUserAdmin?: boolean;
  // The current user's player ID (to exclude self from actions)
  currentPlayerId?: string;
  // Callback when admin kicks a player
  onKickPlayer?: (playerId: string) => void;
  // Callback when admin transfers admin rights
  onTransferAdmin?: (playerId: string) => void;
}

interface VoteStatusCardProps {
  // Player's vote status
  player: PlayerVoteStatus;
  // Whether votes are revealed
  votesRevealed: boolean;
  // Whether to show admin actions on this card
  showActions: boolean;
  // Callback when admin kicks a player
  onKickPlayer?: (playerId: string) => void;
  // Callback when admin transfers admin rights
  onTransferAdmin?: (playerId: string) => void;
}

/**
 * Single player's vote status card.
 */

const VoteStatusCard = memo(function VoteStatusCard({
  player,
  votesRevealed,
  showActions,
  onKickPlayer,
  onTransferAdmin,
}: VoteStatusCardProps) {
  const { name, vote, hasVoted, isSpectator, isAdmin } = player;

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
    <div className="group/player flex flex-col items-center relative">
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
      <div className="mt-2 flex items-center gap-0.5">
        {isAdmin && <Crown className="size-3.5 text-primary shrink-0" aria-label="Admin" />}
        <span className="text-md font-bold">{name}</span>
        {showActions && onKickPlayer && onTransferAdmin && (
          <PlayerActionsMenu
            playerId={player.id}
            playerName={player.name}
            onKick={onKickPlayer}
            onTransferAdmin={onTransferAdmin}
          />
        )}
      </div>
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
function VoteStatusCardsComponent({
  players,
  votesRevealed,
  isCurrentUserAdmin = false,
  currentPlayerId,
  onKickPlayer,
  onTransferAdmin,
}: VoteStatusCardsProps) {
  return (
    <div
      className="flex flex-wrap justify-center gap-5 py-4"
      role="group"
      aria-label="Player voting status"
    >
      {players.map((player) => (
        <VoteStatusCard
          key={player.id}
          player={player}
          votesRevealed={votesRevealed}
          showActions={isCurrentUserAdmin && player.id !== currentPlayerId}
          onKickPlayer={onKickPlayer}
          onTransferAdmin={onTransferAdmin}
        />
      ))}
    </div>
  );
}

export const VoteStatusCards = memo(VoteStatusCardsComponent);
VoteStatusCards.displayName = 'VoteStatusCards';

export default VoteStatusCards;
