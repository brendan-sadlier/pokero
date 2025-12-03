/* eslint-disable react-hooks/immutability */
import { useEffect, useState, useCallback, useRef } from 'react';
import PartySocket from 'partysocket';
import {
  ConnectionState,
  ErrorCode,
  RECONNECTION_CONFIG,
  type ClientMessage,
  type GameError,
  type GameState,
  type ServerMessage,
} from '../types';

const PARTYKIT_HOST = import.meta.env.VITE_PARTYKIT_HOST || 'localhost:1999';

interface UsePartyKitOptions {
  playerId?: string;
  onConnectionChange?: (state: ConnectionState) => void;
  onGameEnded?: (endedBy: string) => void;
  onPlayerLeft?: (playerName: string) => void;
}

interface UsePartyKitReturn {
  gameState: GameState | null;
  connected: boolean;
  connectionState: ConnectionState;
  error: GameError | null;
  sendMessage: (message: ClientMessage) => void;
  connectionId: string | null;
  retryCount: number;
  reconnect: () => void;
}

function createGameError(code: ErrorCode, message: string, userMessage: string): GameError {
  return {
    code,
    message,
    userMessage,
    timestamp: Date.now(),
  };
}

export function usePartyKit(
  roomId: string | null,
  options?: UsePartyKitOptions,
): UsePartyKitReturn {
  const [socket, setSocket] = useState<PartySocket | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    ConnectionState.DISCONNECTED,
  );
  const [error, setError] = useState<GameError | null>(null);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const socketRef = useRef<PartySocket | null>(null);

  const calculateBackoffDelay = useCallback((attempt: number): number => {
    const delay = Math.min(
      RECONNECTION_CONFIG.INITIAL_DELAY_MS *
        Math.pow(RECONNECTION_CONFIG.BACKOFF_MULTIPLIER, attempt),
      RECONNECTION_CONFIG.MAX_DELAY_MS,
    );
    return delay;
  }, []);

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    setSocket(null);
  }, []);

  const connect = useCallback(() => {
    if (!roomId) {
      setConnectionState(ConnectionState.DISCONNECTED);
      return;
    }

    cleanup();

    try {
      setConnectionState(ConnectionState.CONNECTING);
      setError(null);

      const partySocket = new PartySocket({
        host: PARTYKIT_HOST,
        room: roomId,
        id: options?.playerId,
      });

      partySocket.addEventListener('open', () => {
        console.log('Connected to PartyKit');
        setConnectionState(ConnectionState.CONNECTED);
        setError(null);
        setConnectionId(partySocket.id);
        setRetryCount(0);
        options?.onConnectionChange?.(ConnectionState.CONNECTED);
      });

      partySocket.addEventListener('message', (event) => {
        try {
          const message: ServerMessage = JSON.parse(event.data);

          switch (message.type) {
            case 'gameState':
              setGameState(message.state);
              break;
            case 'error':
              console.error('Server error:', message.message);
              break;
            case 'playerLeft':
              console.log(`Player ${message.playerName} left the game`);
              options?.onPlayerLeft?.(message.playerName);
              break;
            case 'gameEnded':
              console.log(`Game ended by ${message.endedBy}`);
              options?.onGameEnded?.(message.endedBy);
              break;
          }
        } catch (err) {
          console.error('Failed to parse message:', err);
          const parseError = createGameError(
            ErrorCode.UNKNOWN_ERROR,
            `Failed to parse message: ${err}`,
            'Received invalid data from server',
          );
          setError(parseError);
        }
      });

      partySocket.addEventListener('close', () => {
        console.log('Disconnected from PartyKit');
        setConnectionState(ConnectionState.DISCONNECTED);
        options?.onConnectionChange?.(ConnectionState.DISCONNECTED);

        // Attempt to reconnect if we haven't exceeded max retries
        if (retryCount < RECONNECTION_CONFIG.MAX_RETRIES) {
          const delay = calculateBackoffDelay(retryCount);
          console.log(`Reconnecting in ${delay}ms (attempt ${retryCount + 1})`);

          setConnectionState(ConnectionState.RECONNECTING);
          options?.onConnectionChange?.(ConnectionState.RECONNECTING);

          reconnectTimeoutRef.current = setTimeout(() => {
            setRetryCount((prev) => prev + 1);
            connect();
          }, delay);
        } else {
          const maxRetriesError = createGameError(
            ErrorCode.MAX_RETRIES_REACHED,
            'Maximum reconnection attempts reached',
            'Unable to reconnect to the game. Please refresh the page.',
          );
          setError(maxRetriesError);
          setConnectionState(ConnectionState.FAILED);
          options?.onConnectionChange?.(ConnectionState.FAILED);
        }
      });

      partySocket.addEventListener('error', (err) => {
        console.error('PartyKit error:', err);
        const connectionError = createGameError(
          ErrorCode.CONNECTION_FAILED,
          `Connection error: ${err}`,
          'Connection error occurred. Attempting to reconnect...',
        );
        setError(connectionError);
        setConnectionState(ConnectionState.DISCONNECTED);
        options?.onConnectionChange?.(ConnectionState.DISCONNECTED);
      });

      socketRef.current = partySocket;
      setSocket(partySocket);
    } catch (err) {
      console.error('Failed to create socket:', err);
      const setupError = createGameError(
        ErrorCode.CONNECTION_FAILED,
        `Failed to create socket: ${err}`,
        'Failed to establish connection. Please try again.',
      );
      setError(setupError);
      setConnectionState(ConnectionState.FAILED);
      options?.onConnectionChange?.(ConnectionState.FAILED);
    }
  }, [roomId, options, retryCount, calculateBackoffDelay, cleanup]);

  const reconnect = useCallback(() => {
    setRetryCount(0);
    setError(null);
    connect();
  }, [connect]);

  useEffect(() => {
    connect();

    return () => {
      cleanup();
    };
  }, [roomId, options?.playerId]); // Intentionally limited deps

  const sendMessage = useCallback(
    (message: ClientMessage) => {
      if (socket && connectionState === ConnectionState.CONNECTED) {
        try {
          socket.send(JSON.stringify(message));
        } catch (err) {
          console.error('Failed to send message:', err);
          const sendError = createGameError(
            ErrorCode.UNKNOWN_ERROR,
            `Failed to send message: ${err}`,
            'Failed to send message. Please try again.',
          );
          setError(sendError);
        }
      } else {
        console.warn('Cannot send message: not connected', { connectionState });
      }
    },
    [socket, connectionState],
  );

  return {
    gameState,
    connected: connectionState === ConnectionState.CONNECTED,
    connectionState,
    error,
    sendMessage,
    connectionId,
    retryCount,
    reconnect,
  };
}
