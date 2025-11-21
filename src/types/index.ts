export interface Player {
  id: string;
  name: string;
  isAdmin: boolean;
  isSpectator: boolean;
  vote: string | null;
  hasVoted: boolean;
}

export interface GameSettings {
  gameName: string;
  allowPlayersToReveal: boolean;
  adminCanSpectate: boolean;
}

export interface GameState {
  gameId: string;
  settings: GameSettings;
  players: Record<string, Player>;
  roundActive: boolean;
  votesRevealed: boolean;
  adminId: string;
}

export interface RoundStats {
  average: number | null;
  distribution: Record<string, number>;
  numericVotes: number[];
  nonNumericVotes: string[];
}

export type ClientMessage =
  | { type: 'join'; name: string; isAdmin?: boolean }
  | { type: 'vote'; vote: string }
  | { type: 'reveal' }
  | { type: 'newRound' }
  | { type: 'updateSettings'; settings: Partial<GameSettings> };

export type ServerMessage =
  | { type: 'gameState'; state: GameState }
  | { type: 'error'; message: string };
