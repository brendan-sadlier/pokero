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

type LeaveGameDialogProps = {
  onLeave: () => void;
  onEndGame?: () => void;
  isAdmin: boolean;
};

export default function LeaveGameDialog({ onLeave, onEndGame, isAdmin }: LeaveGameDialogProps) {
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
          <AlertDialogDescription>
            {isAdmin ? (
              <>
                You are the admin of this game. If you leave, admin privileges will be transferred
                to another player. Are you sure you want to leave?
              </>
            ) : (
              <>
                Are you sure you want to leave this game? You can region later using the same link.
              </>
            )}
          </AlertDialogDescription>
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
