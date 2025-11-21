import PokeroLogo from '../logo';
import { ThemeToggle } from '../theme-toggle';
import GameSettings from './game-settings';
import type { GameSettings as GameSettingsType } from '../../types';
import GameShareDialog from './game-share-dialog';

type GameHeaderProps = {
  gameName?: string;
  playerName?: string;
  gameId?: string;
  handleSettingsClick?: () => void;
  handleCopyLink?: () => void;
  onCopyId?: () => void;
  isAdmin?: boolean;
  showSettings?: boolean;
  settings: GameSettingsType;
  onUpdate: (settings: Partial<GameSettingsType>) => void;
};

export default function GameHeader({
  gameName,
  playerName,
  gameId,
  handleCopyLink,
  isAdmin,
  settings,
  onUpdate,
}: GameHeaderProps) {
  return (
    <header className="border-b border-border">
      <div className="px-6 py-4">
        {/* Top Row: Game Info */}
        <div className="flex items-center justify-between gap-4">
          {/* Left: Game Icon & Name */}
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
            <GameShareDialog gameId={gameId || ''} handleCopyLink={handleCopyLink} />
            <ThemeToggle />
            {isAdmin && <GameSettings settings={settings} onUpdate={onUpdate} />}
          </div>
        </div>
      </div>
    </header>
  );
}
