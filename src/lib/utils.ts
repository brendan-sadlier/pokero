/**
 * @fileoverview Utility functions for the Pokero application.
 * Includes class name merging, game statistics calculation, ID generation,
 * and form validation helpers.
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getCardValues, VALIDATION_CONFIG, type GameState, type RoundStats } from '../types';

/**
 * Combines class names using clsx and tailwind-merge.
 * Handles conditional classes and resolves Tailwind CSS conflicts.
 *
 * @param inputs - Class values to merge
 * @returns Merged class name string
 *
 * @example
 * cn('px-4', 'py-2', isActive && 'bg-primary')
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Calculates statistics for a completed voting round.
 *
 * @param gameState - Current game state with revealed votes
 * @returns Statistics including average, distribution, and vote arrays
 *
 * @example
 * const stats = calculateRoundStats(gameState);
 * console.log(`Average: ${stats.average}`);
 */
export function calculateRoundStats(gameState: GameState): RoundStats {
  const votes = Object.values(gameState.players)
    .filter((player) => !player.isSpectator && player.vote !== null)
    .map((player) => player.vote as string);

  const distribution: Record<string, number> = {};
  const numericVotes: number[] = [];
  const nonNumericVotes: string[] = [];

  for (const vote of votes) {
    distribution[vote] = (distribution[vote] || 0) + 1;

    const numValue = parseFloat(vote);
    if (!isNaN(numValue) && isFinite(numValue)) {
      numericVotes.push(numValue);
    } else {
      nonNumericVotes.push(vote);
    }
  }

  const average =
    numericVotes.length > 0
      ? numericVotes.reduce((sum, val) => sum + val, 0) / numericVotes.length
      : null;

  let agreeability = null;
  const totalVotes = votes.length;
  if (totalVotes !== 0) {
    const choices = getCardValues(gameState.settings.votingType);
    const indexMap = new Map<string, number>();
    choices.forEach((value, idx) => indexMap.set(value, idx));

    let voteCount = 0;
    let weightedIdxSum = 0;

    for (const [vote, count] of Object.entries(distribution)) {
      const idx = indexMap.get(vote);
      if (idx == null) continue;
      voteCount += count;
      weightedIdxSum += idx * count;
    }

    const meanIndex = weightedIdxSum / voteCount;

    let weightedDistanceSum = 0;
    for (const [vote, count] of Object.entries(distribution)) {
      const idx = indexMap.get(vote);
      if (idx == null) continue;
      weightedDistanceSum += Math.abs(idx - meanIndex) * count;
    }

    const avgDistance = weightedDistanceSum / voteCount;
    const maxDistance = Math.max(choices.length - 1, 1);
    const normalized = avgDistance / maxDistance;
    agreeability = Math.max(0, Math.min(1, 1 - normalized)) * 100;
  }

  return {
    average,
    distribution,
    numericVotes,
    nonNumericVotes,
    agreeability,
  };
}

/**
 * Generates a random game ID.
 * IDs are 7 characters long, lowercase alphanumeric.
 *
 * @returns A unique game identifier
 *
 * @example
 * const gameId = generateGameId(); // e.g., "abc1234"
 */
export function generateGameId(): string {
  return Math.random().toString(36).substring(2, 9);
}

/**
 * Generates a unique player ID.
 * Combines timestamp with random string for uniqueness.
 *
 * @returns A unique player identifier
 *
 * @example
 * const playerId = generatePlayerId(); // e.g., "player_1234567890-abc1234"
 */
export function generatePlayerId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `player_${timestamp}-${random}`;
}

/**
 * Result of a validation operation.
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Creates a successful validation result.
 */
function validResult(): ValidationResult {
  return { isValid: true };
}

/**
 * Creates a failed validation result with an error message.
 */
function invalidResult(error: string): ValidationResult {
  return { isValid: false, error };
}

/**
 * Validates a player name.
 *
 * @param name - The name to validate
 * @returns Validation result
 *
 * @example
 * const result = validatePlayerName('John');
 * if (!result.isValid) {
 *   showError(result.error);
 * }
 */
export function validatePlayerName(name: string): ValidationResult {
  const trimmed = name.trim();

  if (!trimmed) {
    return invalidResult('Please enter your name');
  }

  if (trimmed.length > VALIDATION_CONFIG.MAX_NAME_LENGTH) {
    return invalidResult(`Name cannot exceed ${VALIDATION_CONFIG.MAX_NAME_LENGTH} characters`);
  }

  return validResult();
}

/**
 * Validates a game name.
 *
 * @param name - The game name to validate
 * @returns Validation result
 */
export function validateGameName(name: string): ValidationResult {
  if (name.length > VALIDATION_CONFIG.MAX_GAME_NAME_LENGTH) {
    return invalidResult(
      `Game name cannot exceed ${VALIDATION_CONFIG.MAX_GAME_NAME_LENGTH} characters`,
    );
  }

  return validResult();
}

/**
 * Validates a game ID.
 *
 * @param gameId - The game ID to validate
 * @returns Validation result
 */
export function validateGameId(gameId: string): ValidationResult {
  const trimmed = gameId.trim().toLowerCase();

  if (!trimmed) {
    return invalidResult('Please enter a valid Game ID');
  }

  if (!VALIDATION_CONFIG.GAME_ID_PATTERN.test(trimmed)) {
    return invalidResult('Invalid Game ID format');
  }

  return validResult();
}

/**
 * Validates all fields for creating a game.
 *
 * @param playerName - The player's name
 * @param gameName - The game name (optional)
 * @returns Validation result
 */
export function validateCreateGameForm(playerName: string, gameName: string): ValidationResult {
  const nameResult = validatePlayerName(playerName);
  if (!nameResult.isValid) return nameResult;

  const gameNameResult = validateGameName(gameName);
  if (!gameNameResult.isValid) return gameNameResult;

  return validResult();
}

/**
 * Validates all fields for joining a game.
 *
 * @param playerName - The player's name
 * @param gameId - The game ID to join
 * @returns Validation result
 */
export function validateJoinGameForm(playerName: string, gameId: string): ValidationResult {
  const nameResult = validatePlayerName(playerName);
  if (!nameResult.isValid) return nameResult;

  const gameIdResult = validateGameId(gameId);
  if (!gameIdResult.isValid) return gameIdResult;

  return validResult();
}

/**
 * Normalizes a game ID to lowercase.
 *
 * @param gameId - The game ID to normalize
 * @returns Normalized game ID
 */
export function normalizeGameId(gameId: string): string {
  return gameId.trim().toLowerCase();
}

/**
 * Generates a shareable game URL.
 *
 * @param gameId - The game ID
 * @returns Full URL for joining the game
 */
export function generateShareUrl(gameId: string): string {
  const normalizedId = normalizeGameId(gameId);
  return `${window.location.origin}/join?gameId=${normalizedId}`;
}

/**
 * Calculates exponential backoff delay for retries.
 *
 * @param attempt - Current attempt number (0-indexed)
 * @param initialDelay - Initial delay in milliseconds
 * @param maxDelay - Maximum delay in milliseconds
 * @param multiplier - Backoff multiplier
 * @returns Delay in milliseconds
 */
export function calculateBackoffDelay(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  multiplier: number,
): number {
  const delay = initialDelay * Math.pow(multiplier, attempt);
  return Math.min(delay, maxDelay);
}
