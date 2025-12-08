/**
 * @fileoverview Session management for Pokero player sessions.
 * Handles encrypted storage and retrieval of player session data
 * with automatic expiration and fallback mechanisms.
 */

import CryptoJS from 'crypto-js';
import { SESSION_CONFIG, type GameSettings, type PlayerSession } from '../types';
import { generatePlayerId as generateId } from './utils';

const ENCRYPTION_KEY = import.meta.env.VITE_SESSION_ENCRYPTION_KEY;

/**
 * Encrypts a string using AES encryption.
 * Falls back to base64 encoding if encryption fails.
 *
 * @param text - Plain text to encrypt
 * @returns Encrypted string
 */
function encrypt(text: string): string {
  try {
    return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
  } catch (error) {
    console.warn('AES encryption failed, using base64 fallback:', error);
    return btoa(encodeURIComponent(text));
  }
}

/**
 * Decrypts an encrypted string.
 * Handles both AES and base64 encoded strings.
 *
 * @param encryptedText - Text to decrypt
 * @returns Decrypted string
 * @throws Error if decryption fails
 */
function decrypt(encryptedText: string): string {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    if (decrypted) {
      return decrypted;
    }
  } catch {
    // Ignore and try fallback
  }

  try {
    return decodeURIComponent(atob(encryptedText));
  } catch {
    throw new Error('Failed to decrypt session data');
  }
}

/**
 * Gets the storage key for a game session.
 */
function getStorageKey(gameId: string): string {
  return `${SESSION_CONFIG.KEY_PREFIX}${gameId}`;
}

/**
 * Checks if a session has expired.
 */
function isSessionExpired(timestamp: number): boolean {
  return Date.now() - timestamp > SESSION_CONFIG.TIMEOUT_MS;
}

/**
 * Safely parses JSON with type validation.
 */
function parseSession(json: string): PlayerSession | null {
  try {
    const data = JSON.parse(json);

    // Validate required fields
    if (
      typeof data.playerId === 'string' &&
      typeof data.playerName === 'string' &&
      typeof data.gameId === 'string' &&
      typeof data.isAdmin === 'boolean' &&
      typeof data.timestamp === 'number'
    ) {
      return data as PlayerSession;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Generates a unique player ID.
 * Re-exported from utils for convenience.
 */
export const generatePlayerId = generateId;

/**
 * Saves a player session to storage.
 *
 * @param gameId - Game identifier
 * @param playerId - Player identifier
 * @param playerName - Player's display name
 * @param isAdmin - Whether the player is an admin
 * @param settings - Optional game settings to store
 *
 * @example
 * savePlayerSession('abc123', 'player_123', 'John', true, gameSettings);
 */
export function savePlayerSession(
  gameId: string,
  playerId: string,
  playerName: string,
  isAdmin: boolean,
  settings?: GameSettings,
): void {
  if (!gameId || !playerId || !playerName) {
    console.error('Invalid parameters to save player session');
    return;
  }
  const session: PlayerSession = {
    playerId,
    playerName,
    gameId,
    isAdmin,
    timestamp: Date.now(),
    settings,
  };

  const key = getStorageKey(gameId);
  const sessionJson = JSON.stringify(session);

  try {
    const encrypted = encrypt(sessionJson);
    localStorage.setItem(key, encrypted);
    return;
  } catch (error) {
    console.warn('localStorage save failed, trying sessionStorage:', error);
  }

  try {
    sessionStorage.setItem(key, sessionJson);
  } catch (error) {
    console.error('Failed to save player session to any storage', error);
  }
}

/**
 * Retrieves a player session from storage.
 *
 * @param gameId - Game identifier
 * @returns Player session or null if not found/expired
 *
 * @example
 * const session = getPlayerSession('abc123');
 * if (session) {
 *   console.log(`Welcome back, ${session.playerName}!`);
 * }
 */
export function getPlayerSession(gameId: string): PlayerSession | null {
  if (!gameId) return null;

  const key = getStorageKey(gameId);

  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const decrypted = decrypt(stored);
      const session = parseSession(decrypted);

      if (session && !isSessionExpired(session.timestamp)) {
        return session;
      }

      clearPlayerSession(gameId);
      return null;
    }
  } catch (error) {
    console.warn('localStorage retrieval failed:', error);
  }

  try {
    const stored = sessionStorage.getItem(key);
    if (stored) {
      const session = parseSession(stored);

      if (session && !isSessionExpired(session.timestamp)) {
        return session;
      }

      clearPlayerSession(gameId);
      return null;
    }
  } catch (error) {
    console.warn('sessionStorage retrieval failed:', error);
  }

  return null;
}

/**
 * Updates the settings for an existing session.
 *
 * @param gameId - Game identifier
 * @param settings - New game settings
 */
export function updateSessionSettings(gameId: string, settings: GameSettings): void {
  if (!gameId) return;

  const session = getPlayerSession(gameId);
  if (session) {
    savePlayerSession(gameId, session.playerId, session.playerName, session.isAdmin, settings);
  }
}

/**
 * Clears a player session from storage.
 *
 * @param gameId - Game identifier
 */
export function clearPlayerSession(gameId: string): void {
  if (!gameId) return;

  const key = getStorageKey(gameId);

  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore
  }

  try {
    sessionStorage.removeItem(key);
  } catch {
    // Ignore
  }
}

/**
 * Clears all expired sessions from storage.
 * Should be called on application startup.
 */
export function clearAllExpiredSessions(): void {
  const storages = [localStorage, sessionStorage];

  for (const storage of storages) {
    try {
      const keys = Object.keys(storage);

      for (const key of keys) {
        if (!key.startsWith(SESSION_CONFIG.KEY_PREFIX)) {
          continue;
        }

        try {
          const stored = storage.getItem(key);
          if (!stored) continue;

          let session: PlayerSession | null = null;

          try {
            const decrypted = decrypt(stored);
            session = parseSession(decrypted);
          } catch {
            session = parseSession(stored);
          }

          if (!session || isSessionExpired(session.timestamp)) {
            storage.removeItem(key);
          }
        } catch {
          storage.removeItem(key);
        }
      }
    } catch (error) {
      console.warn('Failed to clear expired sessions from storage:', error);
    }
  }
}

/**
 * Updates the timestamp on an existing session to extend its lifetime.
 *
 * @param gameId - Game identifier
 */
export function updateSessionTimestamp(gameId: string): void {
  if (!gameId) return;

  const session = getPlayerSession(gameId);
  if (session) {
    savePlayerSession(
      gameId,
      session.playerId,
      session.playerName,
      session.isAdmin,
      session.settings,
    );
  }
}
