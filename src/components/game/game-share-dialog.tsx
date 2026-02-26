/**
 * @fileoverview Dialog for sharing game invite links.
 */

import { Input } from '../ui/input';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { memo, useCallback } from 'react';
import { toast } from 'sonner';
import { generateShareUrl } from '../../lib/utils';
import { IconUserPlus } from '@tabler/icons-react';

type GameShareDialogProps = {
  // Game identifier
  gameId: string;
};

/**
 * Dialog for inviting players to a game.
 *
 * @example
 * <GameShareDialog gameId={gameId} />
 */
function GameShareDialogComponent({ gameId }: GameShareDialogProps) {
  const shareUrl = generateShareUrl(gameId);

  /**
   * Copies the game invite URL to clipboard.
   */
  const handleCopyLink = useCallback(() => {
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        toast.success('Game link copied to clipboard!');
      })
      .catch(() => {
        toast.error('Failed to copy link');
      });
  }, [shareUrl]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="hover:cursor-pointer">
          <IconUserPlus />
          Invite Players
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Players</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            type="text"
            value={shareUrl}
            readOnly
            className="flex-1 font-mono"
            aria-label="Game invite URL"
          />
        </div>

        <div className="flex flex-col gap-2 justify-center">
          <DialogClose asChild>
            <Button className="w-full hover:cursor-pointer" onClick={handleCopyLink}>
              Copy Invite Link
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export const GameShareDialog = memo(GameShareDialogComponent);
GameShareDialog.displayName = 'GameShareDialog';

export default GameShareDialog;
