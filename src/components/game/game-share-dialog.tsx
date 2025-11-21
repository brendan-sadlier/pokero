import { Copy, UserPlus } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';

type GameShareDialogProps = {
  gameId: string;
  handleCopyLink?: () => void;
  handleCopyId?: () => void;
};

export default function GameShareDialog({
  gameId,
  handleCopyLink,
  handleCopyId,
}: GameShareDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="hover:cursor-pointer">
          <UserPlus className="" />
          Invite Players
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Players</DialogTitle>
          <DialogDescription className="flex gap-2 items-center">
            Game ID: <code>{gameId}</code>
            <Button
              className="hover:cursor-pointer"
              variant="ghost"
              size="icon"
              onClick={handleCopyId}
            >
              <Copy className="" />
              {/* {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} */}
            </Button>
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Input type="text" value={gameId} readOnly className="flex-1" />
        </div>

        <div className="flex flex-col gap-2 justify-end">
          <DialogClose onClick={handleCopyLink}>
            <Button className="w-full hover:cursor-pointer">Copy Invite Link</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
