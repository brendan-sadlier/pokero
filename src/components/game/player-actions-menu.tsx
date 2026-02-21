import { memo, useCallback, useState } from 'react';
import { Button } from '../ui/button';
import { Crown, EllipsisVertical, UserX } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';

interface PlayerActionsMenuProps {
  playerId: string;
  playerName: string;
  onKick: (playerId: string) => void;
  onTransferAdmin: (playerId: string) => void;
}

function PlayerActionsMenuComponent({
  playerId,
  playerName,
  onKick,
  onTransferAdmin,
}: PlayerActionsMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [kickDialogOpen, setKickDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);

  const handleKickClick = useCallback(() => {
    setMenuOpen(false);
    setKickDialogOpen(true);
  }, []);

  const handleTransferClick = useCallback(() => {
    setMenuOpen(false);
    setTransferDialogOpen(true);
  }, []);

  const handleConfirmKick = useCallback(() => {
    onKick(playerId);
    setKickDialogOpen(false);
  }, [onKick, playerId]);

  const handleConfirmTransfer = useCallback(() => {
    onTransferAdmin(playerId);
    setTransferDialogOpen(false);
  }, [onTransferAdmin, playerId]);

  return (
    <>
      {/* Trigger button */}
      <Button
        variant="ghost"
        size="icon-xs"
        className="opacity-0 group-hover/player:opacity-100 transition-opacity hover:cursor-pointer hover:bg-muted"
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen(true);
        }}
        aria-label={`Actions for ${playerName}`}
      >
        <EllipsisVertical className="size-4" />
      </Button>

      {/* Actions menu dialog */}
      <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogContent className="sm:max-w-[300px]" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="text-center">{playerName}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 hover:cursor-pointer"
              onClick={handleTransferClick}
            >
              <Crown className="size-4 text-primary" />
              Make Admin
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:cursor-pointer"
              onClick={handleKickClick}
            >
              <UserX className="size-4" />
              Kick Player
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Kick confirmation dialog */}
      <AlertDialog open={kickDialogOpen} onOpenChange={setKickDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kick {playerName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {playerName} from the game. They can rejoin using the same invite
              link.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmKick}
              className="bg-destructive text-white hover:bg-destructive/90 hover:cursor-pointer"
            >
              <UserX className="size-4" />
              Kick Player
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Transfer admin confirmation dialog */}
      <AlertDialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Transfer Admin to {playerName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will make {playerName} the new admin of this game. You will become a regular
              player and lose access to admin controls like settings, ending the game, and starting
              new rounds.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmTransfer} className="hover:cursor-pointer">
              <Crown className="size-4" />
              Transfer Admin
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export const PlayerActionsMenu = memo(PlayerActionsMenuComponent);
PlayerActionsMenu.displayName = 'PlayerActionsMenu';

export default PlayerActionsMenu;
