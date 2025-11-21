import { CircleCheck, Eye } from 'lucide-react';

export type Player = {
  id: string;
  name: string;
  vote?: string | null;
  hasVoted: boolean;
  isSpectator?: boolean;
};

type VoteStatusCardsProps = {
  players: Player[];
  votesRevealed: boolean;
};

export default function VoteStatusCards({ players, votesRevealed }: VoteStatusCardsProps) {
  return (
    <div className="flex flex-wrap justify-center gap-5 py-4">
      {players.map((p) => (
        <div key={p.id} className="flex flex-col items-center">
          <div
            className={`flex items-center justify-center w-20 h-32 rounded-xl shadow-md text-xl font-bold transition-all
            ${p.hasVoted ? 'bg-primary text-foreground' : 'bg-transparent border-2 border-dashed border-primary text-transparent'}
            ${p.isSpectator ? 'dark:bg-base-600 opacity-70 dark:border-base-800' : ''}`}
          >
            {votesRevealed ? (
              <span className="text-white">{p.vote ?? '?'}</span>
            ) : p.hasVoted ? (
              <span className="text-white">
                <CircleCheck />
              </span>
            ) : p.isSpectator ? (
              <span className="text-primary">
                <Eye />
              </span>
            ) : (
              <span className="text-transparent">x</span>
            )}
          </div>
          <span className="mt-2 text-md font-bold">{p.name}</span>
        </div>
      ))}
    </div>
  );
}
