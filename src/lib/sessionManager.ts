import { default as CryptoJS } from 'crypto-js';

interface PlayerSession {
  playerId: string;
  playerName: string;
  gameId: string;
  isAdmin: boolean;
  timestamp: number;
}

const SESSION_KEY_PREFIX = 'pokero_session_';
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
const ENCRYPTION_KEY = import.meta.env.VITE_SESSION_ENCRYPTION_KEY;

function encrypt(text: string): string {
  try {
    const encrypted = CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
    return encrypted;
  } catch (error) {
    console.error('Encryption failed:', error);
    try {
      return btoa(encodeURIComponent(text));
    } catch (error) {
      console.error('Fallback encoding failed:', error);
      return text;
    }
  }
}

function decrypt(encryptedText: string): string {
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY).toString(
      CryptoJS.enc.Utf8,
    );
    const plaintext = decrypted.toString();
    if (!plaintext) {
      try {
        return decodeURIComponent(atob(encryptedText));
      } catch (fallbackError) {
        throw new Error('Failed to decrypt and decode text');
      }
    }

    return plaintext;
  } catch (error) {
    try {
      return decodeURIComponent(atob(encryptedText));
    } catch (fallbackError) {
      console.error('Decryption and fallback decoding failed:', error, fallbackError);
      return encryptedText;
    }
  }
}

export function generatePlayerId(): string {
  return `player_${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function savePlayerSession(
  gameId: string,
  playerId: string,
  playerName: string,
  isAdmin: boolean,
): void {
  if (!gameId || !playerId || !playerName) {
    console.error('Invalid parameters to save player session');
    return;
  }
  try {
    const session: PlayerSession = {
      playerId,
      playerName,
      gameId,
      isAdmin,
      timestamp: Date.now(),
    };
    const encrypted = encrypt(JSON.stringify(session));
    localStorage.setItem(SESSION_KEY_PREFIX + gameId, encrypted);
  } catch (error) {
    console.error('Failed to save player session:', error);
    try {
      const session: PlayerSession = {
        playerId,
        playerName,
        gameId,
        isAdmin,
        timestamp: Date.now(),
      };
      sessionStorage.setItem(SESSION_KEY_PREFIX + gameId, JSON.stringify(session));
    } catch (storageError) {
      console.error('Failed to save player session in sessionStorage as fallback:', storageError);
    }
  }
}

export function getPlayerSession(gameId: string): PlayerSession | null {
  if (!gameId) {
    return null;
  }

  try {
    const stored = localStorage.getItem(SESSION_KEY_PREFIX + gameId);
    if (stored) {
      const decrypted = decrypt(stored);
      const session: PlayerSession = JSON.parse(decrypted);
      if (Date.now() - session.timestamp > SESSION_TIMEOUT) {
        clearPlayerSession(gameId);
        return null;
      }

      return session;
    }

    const sessionStored = sessionStorage.getItem(SESSION_KEY_PREFIX + gameId);
    if (sessionStored) {
      const session: PlayerSession = JSON.parse(sessionStored);
      if (Date.now() - session.timestamp > SESSION_TIMEOUT) {
        clearPlayerSession(gameId);
        return null;
      }

      return session;
    }
    return null;
  } catch (error) {
    console.error('Failed to get player session:', error);
    return null;
  }
}

export function clearPlayerSession(gameId: string): void {
  if (!gameId) {
    return;
  }

  try {
    localStorage.removeItem(SESSION_KEY_PREFIX + gameId);
    sessionStorage.removeItem(SESSION_KEY_PREFIX + gameId);
  } catch (error) {
    console.error('Failed to clear player session:', error);
  }
}

export function clearAllExpiredSessions(): void {
  try {
    const now = Date.now();

    const localKeys = Object.keys(localStorage);
    localKeys.forEach((key) => {
      if (key.startsWith(SESSION_KEY_PREFIX)) {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const decrypted = decrypt(stored);
            const session: PlayerSession = JSON.parse(decrypted);
            if (now - session.timestamp > SESSION_TIMEOUT) {
              localStorage.removeItem(key);
            }
          }
        } catch (error) {
          localStorage.removeItem(key);
        }
      }
    });

    const sessionKeys = Object.keys(sessionStorage);
    sessionKeys.forEach((key) => {
      if (key.startsWith(SESSION_KEY_PREFIX)) {
        try {
          const sessionStored = sessionStorage.getItem(key);
          if (sessionStored) {
            const session: PlayerSession = JSON.parse(sessionStored);
            if (now - session.timestamp > SESSION_TIMEOUT) {
              sessionStorage.removeItem(key);
            }
          }
        } catch (error) {
          sessionStorage.removeItem(key);
        }
      }
    });
  } catch (error) {
    console.error('Failed to clear expired sessions:', error);
  }
}

export function updateSessionTimestamp(gameId: string): void {
  if (!gameId) {
    return;
  }

  const session = getPlayerSession(gameId);
  if (session) {
    savePlayerSession(gameId, session.playerId, session.playerName, session.isAdmin);
  }
}
