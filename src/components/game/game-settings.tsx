/**
 * @fileoverview Game settings dialog component.
 * Allows administrators to modify game configuration.
 */

import { useState, useCallback, useEffect, memo } from 'react';
import { VALIDATION_CONFIG, type GameSettings as GameSettingsType } from '../../types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { Settings } from 'lucide-react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';
import { toast } from 'sonner';

interface GameSettingsProps {
  // Current game settings
  settings: GameSettingsType;
  // Callback to update game settings
  onUpdate: (settings: Partial<GameSettingsType>) => void;
}

/**
 * Settings dialog for game administrators.
 *
 * @example
 * {isAdmin && <GameSettings settings={gameState.settings} onUpdate={handleUpdateSettings} />}
 */
function GameSettingsComponent({ settings, onUpdate }: GameSettingsProps) {
  // Local state for form inputs
  const [isOpen, setIsOpen] = useState(false);
  const [gameName, setGameName] = useState(settings.gameName);
  const [allowPlayersToReveal, setAllowPlayersToReveal] = useState(settings.allowPlayersToReveal);
  const [adminCanSpectate, setAdminCanSpectate] = useState(settings.adminCanSpectate);

  // Sync local state with settings prop when it changes
  useEffect(() => {
    setGameName(settings.gameName);
    setAllowPlayersToReveal(settings.allowPlayersToReveal);
    setAdminCanSpectate(settings.adminCanSpectate);
  }, [settings]);

  /**
   * Validates and saves settings changes.
   */
  const handleSave = useCallback(() => {
    const updates: Partial<GameSettingsType> = {};

    if (gameName !== settings.gameName) {
      const trimmedName = gameName.trim();
      if (!trimmedName) {
        toast.error('Game name cannot be empty');
        return;
      }
      if (trimmedName.length > VALIDATION_CONFIG.MAX_GAME_NAME_LENGTH) {
        toast.error(
          `Game name must be ${VALIDATION_CONFIG.MAX_GAME_NAME_LENGTH} characters or less`,
        );
        return;
      }

      updates.gameName = trimmedName;
    }

    if (allowPlayersToReveal !== settings.allowPlayersToReveal) {
      updates.allowPlayersToReveal = allowPlayersToReveal;
    }

    if (adminCanSpectate !== settings.adminCanSpectate) {
      updates.adminCanSpectate = adminCanSpectate;
    }

    if (Object.keys(updates).length > 0) {
      onUpdate(updates);
      toast.success('Settings updated successfully');
      setIsOpen(false);
    } else {
      toast.info('No changes to save');
    }
  }, [gameName, allowPlayersToReveal, adminCanSpectate, settings, onUpdate]);

  /**
   * Resets local state and closes dialog.
   */
  const handleCancel = useCallback(() => {
    // Reset to current settings when canceling
    setGameName(settings.gameName);
    setAllowPlayersToReveal(settings.allowPlayersToReveal);
    setAdminCanSpectate(settings.adminCanSpectate);
    setIsOpen(false);
  }, [settings]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className="hover:cursor-pointer hover:scale-110 transition-transform hover:text-primary"
          aria-label="Open game settings"
        >
          <Settings />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Game Settings</DialogTitle>
          <DialogDescription>
            Make changes to your game here. Click save when you&apos;re done.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-3">
            <Label htmlFor="settingsGameName">Name</Label>
            <Input
              id="settingsGameName"
              name="name"
              type="text"
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
              maxLength={VALIDATION_CONFIG.MAX_GAME_NAME_LENGTH}
            />
          </div>

          {/* Allow Players to Reveal Cards Setting */}
          <div className="flex items-center gap-3">
            <Switch
              id="playerReveal"
              checked={allowPlayersToReveal}
              onCheckedChange={setAllowPlayersToReveal}
            />
            <Label htmlFor="playerReveal">Allow All Players to Reveal Cards</Label>
          </div>

          {/* Admin Can Spectate Setting */}
          <div className="flex items-center gap-3">
            <Switch
              id="spectatorMode"
              checked={adminCanSpectate}
              onCheckedChange={setAdminCanSpectate}
            />
            <Label htmlFor="spectatorMode">Spectator Mode</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const GameSettings = memo(GameSettingsComponent);
GameSettings.displayName = 'GameSettings';

export default GameSettings;
