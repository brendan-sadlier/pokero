import { UserPlus } from 'lucide-react';
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
import { useCallback } from 'react';
import { toast } from 'sonner';

type GameShareDialogProps = {
  gameId: string;
};

export default function GameShareDialog({ gameId }: GameShareDialogProps) {
  const handleCopyLink = useCallback(() => {
    const url = `${window.location.origin}/join?gameId=${gameId}`;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        toast.success('Game link copied to clipboard!');
      })
      .catch(() => {
        toast.error('Failed to copy link');
      });
  }, [gameId]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="hover:cursor-pointer">
          <UserPlus />
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
            value={`${window.location.origin}/join?gameId=${gameId}`}
            readOnly
            className="flex-1 font-mono"
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
