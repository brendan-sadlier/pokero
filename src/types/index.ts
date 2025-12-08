/* eslint-disable no-redeclare */

/**
 * @fileoverview Core type definitions for the Poker Planning application.
 * This module provides TypeScript interfaces and types for game state management,
 * player interactions, and WebSocket communication.
 */

/*
 * Represents a player in a Pokero game session
 */
export interface Player {
  // Unique identifier for the player
  readonly id: string;
  // Display name of the player
  name: string;
  // Whether the player has admin privileges
  isAdmin: boolean;
  // Whether the player is a spectator (not participating in voting)
  isSpectator: boolean;
  // The player's current vote; null if not voted yet
  vote: string | null;
  // Whether the player has voted in the current round
  hasVoted: boolean;
}

/*
 * Type guard to check if a player can vote
 */
export function canPlayerVote(player: Player): boolean {
  return !player.isSpectator;
}

/**
 * Available voting types for the game.
 */
export const VotingType = {
  FIBONACCI: 'fibonacci',
  T_SHIRT: 't-shirt',
  POWERS_OF_2: 'powers-of-2',
} as const;

export type VotingType = (typeof VotingType)[keyof typeof VotingType];

/**
 * Display names for voting types.
 */
export const VOTING_TYPE_LABELS: Record<VotingType, string> = {
  [VotingType.FIBONACCI]: 'Fibonacci',
  [VotingType.T_SHIRT]: 'T-Shirt Sizing',
  [VotingType.POWERS_OF_2]: 'Powers of 2',
} as const;

/**
 * Card values for each voting type.
 */
export const CARD_VALUES_BY_TYPE: Record<VotingType, readonly string[]> = {
  [VotingType.FIBONACCI]: ['0', '1', '2', '3', '5', '8', '13', '21', '34', '?'],
  [VotingType.T_SHIRT]: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '?'],
  [VotingType.POWERS_OF_2]: ['0', '1', '2', '4', '8', '16', '32', '64', '?'],
} as const;

/**
 * Default card values (Fibonacci) for backward compatibility.
 */
export const CARD_VALUES = CARD_VALUES_BY_TYPE[VotingType.FIBONACCI];

export type CardValue = string;

/**
 * Check if a value is a valid card value for a given voting type
 */
export function isValidCardValue(
  value: string,
  votingType: VotingType = VotingType.FIBONACCI,
): boolean {
  const validValues = CARD_VALUES_BY_TYPE[votingType];
  return validValues.includes(value);
}

/**
 * Get card values for a voting type
 */
export function getCardValues(votingType: VotingType): readonly string[] {
  return CARD_VALUES_BY_TYPE[votingType];
}

/**
 * Configuration settings for a Pokero game.
 */
export interface GameSettings {
  // Display name of the game session
  gameName: string;
  // Whether non-admin players are allowed to reveal votes
  allowPlayersToReveal: boolean;
  // Whether the admin is in spectator mode
  adminCanSpectate: boolean;
  // Type of voting to use
  votingType: VotingType;
}

/**
 * Default game settings used when creating a new game.
 */
export const DEFAULT_GAME_SETTINGS: Readonly<GameSettings> = {
  gameName: 'Planning Poker',
  allowPlayersToReveal: true,
  adminCanSpectate: false,
  votingType: VotingType.FIBONACCI,
} as const;

/**
 * Complete state of a Pokero game session.
 */
export interface GameState {
  // Unique identifier for the game session
  readonly gameId: string;
  // Current settings of the game
  settings: GameSettings;
  // Map of player IDs to Player objects
  players: Record<string, Player>;
  // Whether the current round is active
  roundActive: boolean;
  // Whether the votes have been revealed
  votesRevealed: boolean;
  // ID of the admin player
  adminId: string;
}

/**
 * Statistics calculated after votes are revealed.
 */
export interface RoundStats {
  // Average of numeric votes; null if no numeric votes
  average: number | null;
  // Distribution of votes (vote value -> count)
  distribution: Record<string, number>;
  // List of numeric votes
  numericVotes: number[];
  // List of non-numeric votes
  nonNumericVotes: string[];
  // Agreeability percentage (0-100); null if no votes
  agreeability?: number | null;
}

/**
 * Messages sent from client to server.
 * Uses discriminated union for type-safe message handling.
 */
export type ClientMessage =
  | JoinMessage
  | VoteMessage
  | RevealMessage
  | NewRoundMessage
  | UpdateSettingsMessage
  | LeaveMessage
  | EndGameMessage;

// Message to join a game
export interface JoinMessage {
  readonly type: 'join';
  name: string;
  isAdmin?: boolean;
}

// Message to submit a vote
export interface VoteMessage {
  readonly type: 'vote';
  vote: string;
}

// Message to reveal votes
export interface RevealMessage {
  readonly type: 'reveal';
}

// Message to start a new round
export interface NewRoundMessage {
  readonly type: 'newRound';
}

// Message to update game settings
export interface UpdateSettingsMessage {
  readonly type: 'updateSettings';
  settings: Partial<GameSettings>;
}

// Message to leave the game
export interface LeaveMessage {
  readonly type: 'leave';
}

// Message to end the game
export interface EndGameMessage {
  readonly type: 'endGame';
}

/**
 * Messages sent from server to client.
 * Uses discriminated union for type-safe message handling.
 */
export type ServerMessage = GameStateMessage | ErrorMessage | PlayerLeftMessage | GameEndedMessage;

// Message containing updated game state
export interface GameStateMessage {
  readonly type: 'gameState';
  state: GameState;
}

// Message indicating an error occurred
export interface ErrorMessage {
  readonly type: 'error';
  message: string;
}

// Message indicating a player has left the game
export interface PlayerLeftMessage {
  readonly type: 'playerLeft';
  playerId: string;
  playerName: string;
}

// Message indicating the game has ended
export interface GameEndedMessage {
  readonly type: 'gameEnded';
  endedBy: string;
}

/**
 * State passed when navigating to create a new game.
 */
export interface CreateGameLocationState {
  playerName: string;
  isAdmin: boolean;
  settings?: GameSettings;
}

/**
 * State passed when navigating to join an existing game.
 */
export interface JoinGameLocationState {
  playerName: string;
  isAdmin: boolean;
}

/**
 * Union type for all navigation states to game page.
 */
export type GameLocationState = CreateGameLocationState | JoinGameLocationState;

/**
 * Type guard to check if location state is for creating a game
 */
export function isCreateGameState(
  state: GameLocationState | null,
): state is CreateGameLocationState {
  return state !== null && state.isAdmin === true;
}

/**
 * Stored player session data for reconnection.
 */
export interface PlayerSession {
  // Unique identifier for the player
  readonly playerId: string;
  // Display name of the player
  playerName: string;
  // Unique identifier for the game
  readonly gameId: string;
  // Whether the player has admin privileges
  isAdmin: boolean;
  // Timestamp of when the session was created/updated
  timestamp: number;
  // Optional game settings associated with the session
  settings?: GameSettings;
}

/**
 * Possible states for the WebSocket connection.
 */
export const ConnectionState = {
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  DISCONNECTED: 'DISCONNECTED',
  RECONNECTING: 'RECONNECTING',
  FAILED: 'FAILED',
} as const;

export type ConnectionState = (typeof ConnectionState)[keyof typeof ConnectionState];

/**
 * Check if connection is in a usable state
 */
export function isConnectionUsable(state: ConnectionState): boolean {
  return state === ConnectionState.CONNECTED;
}

/**
 * Error codes for game-related errors.
 */
export const ErrorCode = {
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  INVALID_GAME_ID: 'INVALID_GAME_ID',
  MAX_RETRIES_REACHED: 'MAX_RETRIES_REACHED',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/**
 * Structured error for game operations.
 */
export interface GameError {
  // Error code indicating the type of error
  code: ErrorCode;
  // Detailed error message
  message: string;
  // User-friendly message
  userMessage: string;
  // Timestamp of when the error occurred
  timestamp: number;
}

/**
 * Factory function to create a GameError
 */
export function createGameError(code: ErrorCode, message: string, userMessage: string): GameError {
  return {
    code,
    message,
    userMessage,
    timestamp: Date.now(),
  };
}

/**
 * Configuration for WebSocket reconnection behavior.
 */
export const RECONNECTION_CONFIG = {
  // Maximum number of reconnection attempts
  MAX_RETRIES: 5,
  // Initial delay before first reconnection attempt (in milliseconds)
  INITIAL_DELAY_MS: 1000,
  // Maximum delay between reconnection attempts (in milliseconds)
  MAX_DELAY_MS: 30000,
  // Multiplier for exponential backoff
  BACKOFF_MULTIPLIER: 2,
} as const;

/**
 * Configuration for session storage.
 */
export const SESSION_CONFIG = {
  // Session expiration time (in milliseconds)
  TIMEOUT_MS: 24 * 60 * 60 * 1000, // 24 hours
  // Prefix for session storage keys
  KEY_PREFIX: 'pokero_session_',
} as const;

/**
 * Validation constraints for form inputs.
 */
export const VALIDATION_CONFIG = {
  // Minimum length for player names
  MAX_NAME_LENGTH: 50,
  // Maximum length for game names
  MAX_GAME_NAME_LENGTH: 100,
  // Minimum length for game IDs
  MIN_GAME_ID_LENGTH: 5,
  // Maximum length for game IDs
  MAX_GAME_ID_LENGTH: 15,
  // Pattern for valid game IDs (alphanumeric, 5-15 characters)
  GAME_ID_PATTERN: /^[a-z0-9]{5,15}$/,
} as const;

/**
 * Form data for creating a new game.
 */
export interface CreateGameFormData {
  playerName: string;
  gameName: string;
  allowPlayersToReveal: boolean;
  adminCanSpectate: boolean;
  votingType: VotingType;
}

/**
 * Form data for joining an existing game.
 */
export interface JoinGameFormData {
  playerName: string;
  gameId: string;
}
