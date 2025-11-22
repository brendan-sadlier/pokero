/* eslint-disable no-undef */
import { useCallback, useState } from 'react';
import type { GameSettings as GameSettingsType } from '../../types';
import {
  Dialog,
  DialogClose,
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
  settings: GameSettingsType;
  onUpdate: (settings: Partial<GameSettingsType>) => void;
}

export default function GameSettings({ settings, onUpdate }: GameSettingsProps) {
  const [gameName, setGameName] = useState(settings.gameName);
  const [allowPlayersToReveal, setAllowPlayersToReveal] = useState(settings.allowPlayersToReveal);
  const [adminCanSpectate, setAdminCanSpectate] = useState(settings.adminCanSpectate);

  const handleSave = useCallback(() => {
    const updates: Partial<GameSettingsType> = {};

    if (gameName !== settings.gameName) {
      if (!gameName.trim()) {
        toast.error('Game name cannot be empty.');
        return;
      }
      if (gameName.length > 100) {
        toast.error('Game name cannot exceed 100 characters.');
        return;
      }
      updates.gameName = gameName.trim();
    }

    if (allowPlayersToReveal !== settings.allowPlayersToReveal) {
      updates.allowPlayersToReveal = allowPlayersToReveal;
    }
    if (adminCanSpectate !== settings.adminCanSpectate) {
      updates.adminCanSpectate = adminCanSpectate;
    }

    if (Object.keys(updates).length > 0) {
      onUpdate(updates);
      toast.success('Game settings updated successfully.');
    }
  }, [gameName, allowPlayersToReveal, adminCanSpectate, onUpdate, settings]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className="hover:cursor-pointer hover:scale-110 transition-transform hover:text-primary"
          aria-label="Open Game Settings"
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
        <form className="grid gap-4">
          <div className="grid gap-3">
            <Label htmlFor="settingsGameName">Name</Label>
            <Input
              id="settingsGameName"
              name="name"
              type="text"
              defaultValue={gameName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGameName(e.target.value)}
              maxLength={100}
            />
          </div>
          <div className="flex items-center gap-3">
            <Switch
              id="playerReveal"
              checked={allowPlayersToReveal}
              onCheckedChange={(checked) => setAllowPlayersToReveal(checked)}
            />
            <Label htmlFor="playerReveal">Allow All Players to Reveal Cards</Label>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              id="spectatorMode"
              checked={adminCanSpectate}
              onCheckedChange={(checked) => setAdminCanSpectate(checked)}
            />
            <Label htmlFor="spectatorMode">Spectator Mode</Label>
          </div>
        </form>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button type="submit" onClick={handleSave}>
              Save Changes
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
