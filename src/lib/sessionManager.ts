interface PlayerSession {
  playerId: string;
  playerName: string;
  gameId: string;
  isAdmin: boolean;
  timestamp: number;
}

const SESSION_KEY_PREFIX = 'pokero_session_';
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

export function generatePlayerId(): string {
  return `player_${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function savePlayerSession(
  gameId: string,
  playerId: string,
  playerName: string,
  isAdmin: boolean,
): void {
  try {
    const session: PlayerSession = {
      playerId,
      playerName,
      gameId,
      isAdmin,
      timestamp: Date.now(),
    };
    sessionStorage.setItem(SESSION_KEY_PREFIX + gameId, JSON.stringify(session));
  } catch (error) {
    console.error('Failed to save player session:', error);
  }
}

export function getPlayerSession(gameId: string): PlayerSession | null {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY_PREFIX + gameId);
    if (!stored) return null;

    const session: PlayerSession = JSON.parse(stored);
    if (Date.now() - session.timestamp > SESSION_TIMEOUT) {
      clearPlayerSession(gameId);
      return null;
    }

    return session;
  } catch (error) {
    console.error('Failed to get player session:', error);
    return null;
  }
}

export function clearPlayerSession(gameId: string): void {
  try {
    sessionStorage.removeItem(SESSION_KEY_PREFIX + gameId);
  } catch (error) {
    console.error('Failed to clear player session:', error);
  }
}

export function clearAllExpiredSessions(): void {
  try {
    const keys = Object.keys(sessionStorage);
    keys.forEach((key) => {
      if (key.startsWith(SESSION_KEY_PREFIX)) {
        sessionStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error('Failed to clear expired sessions:', error);
  }
}
