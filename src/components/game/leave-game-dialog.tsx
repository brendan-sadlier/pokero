/**
 * @fileoverview Dialog for leaving a game.
 * Allows players to leave the game or end it if they are the admin.
 */

import {
  AlertDialog,
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
import { IconChevronDown, IconCrown, IconDoorExit } from '@tabler/icons-react';
import { ButtonGroup } from '../ui/button-group';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

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
        <Button variant="destructive" size="icon" aria-label="Leave game">
          <IconDoorExit />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Leaving so Soon?</AlertDialogTitle>
          <AlertDialogDescription>{renderDialogDescription()}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className={isAdmin ? 'flex-col sm:flex-row gap-2' : ''}>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          {isAdmin && onEndGame ? (
            <ButtonGroup>
              <Button variant="destructive">Leave Game</Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="destructive"
                    className="border-border border-l"
                    onClick={onLeave}
                  >
                    <IconChevronDown />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={onEndGame}
                      className="hover:cursor-pointer"
                    >
                      <IconCrown />
                      End Game
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </ButtonGroup>
          ) : (
            <Button variant="destructive" onClick={onLeave}>
              Leave Game
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export const LeaveGameDialog = memo(LeaveGameDialogComponent);
LeaveGameDialog.displayName = 'LeaveGameDialog';

export default LeaveGameDialog;
