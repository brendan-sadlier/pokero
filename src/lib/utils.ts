import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { GameState, RoundStats } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calculateRoundStats(gameState: GameState): RoundStats {
  const votes = Object.values(gameState.players)
    .filter((p) => !p.isSpectator && p.vote !== null)
    .map((p) => p.vote as string);

  const distribution: Record<string, number> = {};
  const numericVotes: number[] = [];
  const nonNumericVotes: string[] = [];

  votes.forEach((vote) => {
    distribution[vote] = (distribution[vote] || 0) + 1;

    const numValue = parseFloat(vote);
    if (!isNaN(numValue)) {
      numericVotes.push(numValue);
    } else {
      nonNumericVotes.push(vote);
    }
  });

  const average =
    numericVotes.length > 0
      ? numericVotes.reduce((sum, val) => sum + val, 0) / numericVotes.length
      : null;

  return {
    average,
    distribution,
    numericVotes,
    nonNumericVotes,
  };
}

export function generateGameId(): string {
  return Math.random().toString(36).substring(2, 9);
}
