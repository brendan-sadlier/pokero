import { memo, useCallback, useState } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { Button } from '../ui/button';
import { IconCrown, IconUserX } from '@tabler/icons-react';
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
  const [, setMenuOpen] = useState(false);
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
      <div
        className="flex items-center gap-1 opacity-0 group-hover/player:opacity-100 focus-within:opacity-100 transition-opacity duration-150"
        role="toolbar"
        aria-label={`Actions for ${playerName}`}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              className="size-7 rounded-full hover:bg-primary/15 hover:text-primary hover:cursor-pointer transition-colors"
              onClick={handleTransferClick}
              aria-label={`Make ${playerName} admin`}
            >
              <IconCrown className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Make Admin
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              className="size-7 rounded-full hover:bg-destructive/15 hover:text-destructive hover:cursor-pointer transition-colors"
              onClick={handleKickClick}
              aria-label={`Kick ${playerName}`}
            >
              <IconUserX className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Kick Player
          </TooltipContent>
        </Tooltip>
      </div>

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
              <IconUserX className="size-4" />
              Kick Player
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
              <IconCrown className="size-4" />
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
