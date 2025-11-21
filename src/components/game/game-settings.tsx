/* eslint-disable no-undef */
import { useState } from 'react';
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

interface GameSettingsProps {
  settings: GameSettingsType;
  onUpdate: (settings: Partial<GameSettingsType>) => void;
}

export default function GameSettings({ settings, onUpdate }: GameSettingsProps) {
  const [gameName, setGameName] = useState(settings.gameName);
  const [allowPlayersToReveal, setAllowPlayersToReveal] = useState(settings.allowPlayersToReveal);
  const [adminCanSpectate, setAdminCanSpectate] = useState(settings.adminCanSpectate);

  const handleSave = () => {
    const updates: Partial<GameSettingsType> = {};

    if (gameName !== settings.gameName) {
      updates.gameName = gameName;
    }
    if (allowPlayersToReveal !== settings.allowPlayersToReveal) {
      updates.allowPlayersToReveal = allowPlayersToReveal;
    }
    if (adminCanSpectate !== settings.adminCanSpectate) {
      updates.adminCanSpectate = adminCanSpectate;
    }

    if (Object.keys(updates).length > 0) {
      onUpdate(updates);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className="hover:cursor-pointer hover:scale-110 transition-transform hover:text-primary"
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
    // <div className="settings-overlay" onClick={onClose}>
    //   <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
    //     <div className="settings-header">
    //       <h2>Game Settings</h2>
    //       <button className="close-button" onClick={onClose}>
    //         ✕
    //       </button>
    //     </div>

    //     <div className="settings-content">
    //       <div className="form-group">
    //         <label htmlFor="settingsGameName">Game Name</label>
    //         <input
    //           id="settingsGameName"
    //           type="text"
    //           value={gameName}
    //           onChange={(e) => setGameName(e.target.value)}
    //         />
    //       </div>

    //       <div className="form-group checkbox-group">
    //         <label>
    //           <input
    //             type="checkbox"
    //             checked={allowPlayersToReveal}
    //             onChange={(e) => setAllowPlayersToReveal(e.target.checked)}
    //           />
    //           <span>Allow non-admin players to reveal cards</span>
    //         </label>
    //       </div>

    //       <div className="form-group checkbox-group">
    //         <label>
    //           <input
    //             type="checkbox"
    //             checked={adminCanSpectate}
    //             onChange={(e) => setAdminCanSpectate(e.target.checked)}
    //           />
    //           <span>Admin can spectate (not required to vote)</span>
    //         </label>
    //       </div>
    //     </div>

    //     <div className="settings-footer">
    //       <button className="btn btn-secondary" onClick={onClose}>
    //         Cancel
    //       </button>
    //       <button className="btn btn-primary" onClick={handleSave}>
    //         Save Changes
    //       </button>
    //     </div>
    //   </div>
    // </div>
  );
}
