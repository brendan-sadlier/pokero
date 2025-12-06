/**
 * @fileoverview Dialog for leaving a game.
 * Allows players to leave the game or end it if they are the admin.
 */

import { Crown, DoorOpen } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../ui/alert-dialog';
import { Button } from '../ui/button';
import { memo } from 'react';

type LeaveGameDialogProps = {
  // Callback when the player chooses to leave the game
  onLeave: () => void;
  // Callback when the admin chooses to end the game
  onEndGame?: () => void;
  // Whether the current player is the game admin
  isAdmin: boolean;
};

function LeaveGameDialogComponent({ onLeave, onEndGame, isAdmin }: LeaveGameDialogProps) {
  const renderDialogDescription = () => {
    if (isAdmin) {
      return (
        <>
          You are the admin of this game. If you leave, admin privileges will be transferred to
          another player. Are you sure you want to leave?
        </>
      );
    } else {
      return (
        <>Are you sure you want to leave this game? You can region later using the same link.</>
      );
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="destructive"
          size="icon"
          aria-label="Leave game"
          className="hover:cursor-pointer"
        >
          <DoorOpen />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Leaving so Soon?</AlertDialogTitle>
          <AlertDialogDescription>{renderDialogDescription()}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className={isAdmin ? 'flex-col sm:flex-row gap-2' : ''}>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          {isAdmin && onEndGame && (
            <AlertDialogAction
              onClick={onEndGame}
              className="bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60 hover:cursor-pointer"
            >
              <Crown />
              End Game
            </AlertDialogAction>
          )}
          <AlertDialogAction
            onClick={onLeave}
            className="bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60 hover:cursor-pointer"
          >
            Leave Game
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export const LeaveGameDialog = memo(LeaveGameDialogComponent);
LeaveGameDialog.displayName = 'LeaveGameDialog';

export default LeaveGameDialog;
