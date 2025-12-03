/* eslint-disable no-redeclare */
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
  | { type: 'updateSettings'; settings: Partial<GameSettings> }
  | { type: 'leave' };

export type ServerMessage =
  | { type: 'gameState'; state: GameState }
  | { type: 'error'; message: string }
  | { type: 'playerLeft'; playerId: string; playerName: string };

export interface CreateGameLocationState {
  playerName: string;
  isAdmin: boolean;
  settings?: GameSettings;
}

export interface JoinGameLocationState {
  playerName: string;
  isAdmin: boolean;
}

export interface PlayerSession {
  playerId: string;
  playerName: string;
  gameId: string;
  isAdmin: boolean;
  timestamp: number;
}

export const ConnectionState = {
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  DISCONNECTED: 'DISCONNECTED',
  RECONNECTING: 'RECONNECTING',
  FAILED: 'FAILED',
} as const;

export type ConnectionState = (typeof ConnectionState)[keyof typeof ConnectionState];

export const ErrorCode = {
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  INVALID_GAME_ID: 'INVALID_GAME_ID',
  MAX_RETRIES_REACHED: 'MAX_RETRIES_REACHED',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export interface GameError {
  code: ErrorCode;
  message: string;
  userMessage: string;
  timestamp: number;
}

export const CARD_VALUES = ['0', '1', '2', '3', '5', '8', '13', '21', '34', '?'] as const;

export type CardValue = (typeof CARD_VALUES)[number];

export const RECONNECTION_CONFIG = {
  MAX_RETRIES: 5,
  INITIAL_DELAY_MS: 1000,
  MAX_DELAY_MS: 30000,
  BACKOFF_MULTIPLIER: 2,
} as const;

export const SESSION_CONFIG = {
  TIMEOUT_MS: 24 * 60 * 60 * 1000, // 24 hours
  KEY_PREFIX: 'pokero_session_',
} as const;

export interface CreateGameFormData {
  playerName: string;
  gameName: string;
  allowPlayersToReveal: boolean;
  adminCanSpectate: boolean;
}

export interface JoinGameFormData {
  playerName: string;
  gameId: string;
}
