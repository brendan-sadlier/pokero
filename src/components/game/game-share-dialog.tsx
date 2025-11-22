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

type GameShareDialogProps = {
  gameId: string;
  handleCopyLink?: () => void;
};

export default function GameShareDialog({ gameId, handleCopyLink }: GameShareDialogProps) {
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
          <Input type="text" value={gameId} readOnly className="flex-1 font-mono" />
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
