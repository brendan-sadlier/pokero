import PokeroLogo from '../logo';
import { ThemeToggle } from '../theme-toggle';
import GameSettings from './game-settings';
import type { GameSettings as GameSettingsType } from '../../types';
import GameShareDialog from './game-share-dialog';
import LeaveGameDialog from './leave-game-dialog';

type GameHeaderProps = {
  gameName: string;
  playerName: string;
  gameId: string;
  isAdmin: boolean;
  settings: GameSettingsType;
  onUpdate: (settings: Partial<GameSettingsType>) => void;
  onLeave: () => void;
};

export default function GameHeader({
  gameName,
  playerName,
  gameId,
  isAdmin,
  settings,
  onUpdate,
  onLeave,
}: GameHeaderProps) {
  return (
    <header className="border-b border-border">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <PokeroLogo className="h-8 w-8" />
            <div>
              <h1 className="text-xl font-bold text-foreground">{gameName}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-lg text-foreground">{playerName}</span>
          </div>

          <div className="flex items-center gap-2">
            <GameShareDialog gameId={gameId} />
            <ThemeToggle />
            {isAdmin && <GameSettings settings={settings} onUpdate={onUpdate} />}
            <LeaveGameDialog onLeave={onLeave} isAdmin={isAdmin} />
          </div>
        </div>
      </div>
    </header>
  );
}
