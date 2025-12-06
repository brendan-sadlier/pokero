/**
 * @fileoverview Custom React hook for PartyKit WebSocket connection management.
 * Provides real-time game state synchronization with automatic reconnection.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import PartySocket from 'partysocket';
import {
  ConnectionState,
  createGameError,
  ErrorCode,
  RECONNECTION_CONFIG,
  type ClientMessage,
  type GameError,
  type GameState,
  type ServerMessage,
} from '../types';
import { calculateBackoffDelay } from './utils';

const PARTYKIT_HOST = import.meta.env.VITE_PARTYKIT_HOST || 'localhost:1999';

/**
 * Options for the usePartyKit hook.
 */
export interface UsePartyKitOptions {
  playerId?: string;
  onConnectionChange?: (state: ConnectionState) => void;
  onGameEnded?: (endedBy: string) => void;
  onPlayerLeft?: (playerName: string) => void;
}

/**
 * Return value from the usePartyKit hook.
 */
export interface UsePartyKitReturn {
  // Current game state from the server
  gameState: GameState | null;
  // Whether the client is currently connected
  connected: boolean;
  // Current connection state
  connectionState: ConnectionState;
  // Any connection error encountered
  error: GameError | null;
  // Function to send a message to the server
  sendMessage: (message: ClientMessage) => void;
  // Current connection ID assigned by PartyKit
  connectionId: string | null;
  // Number of reconnection attempts made
  retryCount: number;
  // Function to manually trigger a reconnection
  reconnect: () => void;
}

/**
 * React hook for managing PartyKit WebSocket connections.
 *
 * @param roomId - The game room ID to connect to
 * @param options - Optional configuration
 * @returns Connection state and control functions
 *
 * @example
 * const { gameState, connected, sendMessage, error } = usePartyKit(gameId, {
 *   playerId,
 *   onConnectionChange: (state) => console.log('Connection:', state),
 * });
 */
export function usePartyKit(
  roomId: string | null,
  options?: UsePartyKitOptions,
): UsePartyKitReturn {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    ConnectionState.DISCONNECTED,
  );
  const [error, setError] = useState<GameError | null>(null);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const socketRef = useRef<PartySocket | null>(null);
  const optionsRef = useRef<UsePartyKitOptions | undefined>(options);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  /**
   * Cleans up socket and timeouts.
   */
  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
  }, []);

  /**
   * Updates connection state and notifies callback.
   */
  const updateConnectionState = useCallback((state: ConnectionState) => {
    setConnectionState(state);
    optionsRef.current?.onConnectionChange?.(state);
  }, []);

  /**
   * Handles incoming WebSocket messages.
   */
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: ServerMessage = JSON.parse(event.data);

      switch (message.type) {
        case 'gameState':
          setGameState(message.state);
          break;
        case 'error':
          setError(createGameError(ErrorCode.UNKNOWN_ERROR, message.message, message.message));
          break;
        case 'playerLeft':
          optionsRef.current?.onPlayerLeft?.(message.playerName);
          break;
        case 'gameEnded':
          optionsRef.current?.onGameEnded?.(message.endedBy);
          break;
      }
    } catch (err) {
      console.error('Failed to parse message:', err);
      setError(
        createGameError(
          ErrorCode.UNKNOWN_ERROR,
          `Failed to parse message: ${err}`,
          'Received invalid data from server',
        ),
      );
    }
  }, []);

  /**
   * Schedules a reconnection attempt.
   */
  const scheduleReconnect = useCallback(
    (currentRetryCount: number, connectFn: () => void) => {
      if (currentRetryCount >= RECONNECTION_CONFIG.MAX_RETRIES) {
        setError(
          createGameError(
            ErrorCode.MAX_RETRIES_REACHED,
            'Maximum reconnection attempts reached',
            'Unable to reconnect to the game. Please refresh the page.',
          ),
        );
        updateConnectionState(ConnectionState.FAILED);
        return;
      }

      const delay = calculateBackoffDelay(
        currentRetryCount,
        RECONNECTION_CONFIG.INITIAL_DELAY_MS,
        RECONNECTION_CONFIG.MAX_DELAY_MS,
        RECONNECTION_CONFIG.BACKOFF_MULTIPLIER,
      );

      console.log(`Reconnecting in ${delay}ms (attempt ${currentRetryCount + 1})`);
      updateConnectionState(ConnectionState.RECONNECTING);
      reconnectTimeoutRef.current = setTimeout(() => {
        setRetryCount((prev) => prev + 1);
        connectFn();
      }, delay);
    },
    [updateConnectionState],
  );

  /**
   * Establishes connection to PartyKit server.
   */
  const connect = useCallback(() => {
    if (!roomId) {
      updateConnectionState(ConnectionState.DISCONNECTED);
      return;
    }

    cleanup();
    updateConnectionState(ConnectionState.CONNECTING);
    setError(null);

    try {
      const partySocket = new PartySocket({
        host: PARTYKIT_HOST,
        room: roomId,
        id: optionsRef.current?.playerId,
      });

      partySocket.addEventListener('open', () => {
        console.log('Connected to PartyKit');
        updateConnectionState(ConnectionState.CONNECTED);
        setError(null);
        setConnectionId(partySocket.id);
        setRetryCount(0);
      });

      partySocket.addEventListener('message', handleMessage);

      partySocket.addEventListener('close', () => {
        console.log('Disconnected from PartyKit');
        updateConnectionState(ConnectionState.DISCONNECTED);

        setRetryCount((currentRetryCount) => {
          // eslint-disable-next-line react-hooks/immutability
          scheduleReconnect(currentRetryCount, connect);
          return currentRetryCount;
        });
      });

      partySocket.addEventListener('error', (err) => {
        console.error('PartyKit error:', err);
        setError(
          createGameError(
            ErrorCode.CONNECTION_FAILED,
            `Connection error: ${err}`,
            'Connection error occurred. Attempting to reconnect...',
          ),
        );
      });

      socketRef.current = partySocket;
    } catch (err) {
      console.error('Failed to create socket:', err);
      setError(
        createGameError(
          ErrorCode.CONNECTION_FAILED,
          `Failed to create socket: ${err}`,
          'Failed to establish connection. Please try again.',
        ),
      );
      updateConnectionState(ConnectionState.FAILED);
    }
  }, [roomId, cleanup, handleMessage, scheduleReconnect, updateConnectionState]);

  /**
   * Manual reconnection function.
   */
  const reconnect = useCallback(() => {
    setRetryCount(0);
    setError(null);
    connect();
  }, [connect]);

  /**
   * Sends a message to the server.
   */
  const sendMessage = useCallback(
    (message: ClientMessage) => {
      const socket = socketRef.current;

      if (!socket || connectionState !== ConnectionState.CONNECTED) {
        console.warn('Cannot send message: not connected', { connectionState });
        return;
      }

      try {
        socket.send(JSON.stringify(message));
      } catch (err) {
        console.error('Failed to send message:', err);
        setError(
          createGameError(
            ErrorCode.UNKNOWN_ERROR,
            `Failed to send message: ${err}`,
            'Failed to send message. Please try again.',
          ),
        );
      }
    },
    [connectionState],
  );

  // Connect on mount and when roomId or playerId changes
  useEffect(() => {
    connect();
    return cleanup;
  }, [roomId, options?.playerId]); // eslint-disable-line react-hooks/exhaustive-deps

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
