import PokeroLogo from '../logo';
import { ThemeToggle } from '../theme-toggle';
import GameSettings from './game-settings';
import type { GameSettings as GameSettingsType, RoundHistoryEntry } from '../../types';
import GameShareDialog from './game-share-dialog';
import LeaveGameDialog from './leave-game-dialog';
import { memo } from 'react';
import GameHistory from './game-history';

type GameHeaderProps = {
  // Name of the game
  gameName: string;
  // Name of the current player
  playerName: string;
  // Unique game identifier
  gameId: string;
  // Whether the current player is the game admin
  isAdmin: boolean;
  // Current game settings
  settings: GameSettingsType;
  // Callback to update game settings
  onUpdate: (settings: Partial<GameSettingsType>) => void;
  // Callback when the player chooses to leave the game
  onLeave: () => void;
  // Callback when the admin chooses to end the game
  onEndGame: () => void;
  // History of completed rounds
  history: RoundHistoryEntry[];
};

/**
 * Header displayed during gameplay.
 * Shows game name, player info, and action buttons.
 *
 * @example
 * <GameHeader
 *   gameName={gameState.settings.gameName}
 *   playerName={currentPlayer.name}
 *   gameId={gameId}
 *   isAdmin={isPlayerAdmin}
 *   settings={gameState.settings}
 *   onUpdate={handleUpdateSettings}
 *   history={gameState.history}
 * />
 */
function GameHeaderComponent({
  gameName,
  playerName,
  gameId,
  isAdmin,
  settings,
  onUpdate,
  onLeave,
  onEndGame,
  history,
}: GameHeaderProps) {
  return (
    <header className="border-b border-border">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Game Name */}
          <div className="flex items-center gap-3">
            <PokeroLogo className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold text-foreground">{gameName}</h1>
          </div>

          {/* Player Name */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-lg text-foreground">{playerName}</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <GameShareDialog gameId={gameId} />
            <ThemeToggle />
            <GameHistory history={history} />
            {isAdmin && <GameSettings settings={settings} onUpdate={onUpdate} />}
            <LeaveGameDialog
              onLeave={onLeave}
              onEndGame={isAdmin ? onEndGame : undefined}
              isAdmin={isAdmin}
            />
          </div>
        </div>
      </div>
    </header>
  );
}

export const GameHeader = memo(GameHeaderComponent);
GameHeader.displayName = 'GameHeader';

export default GameHeader;
