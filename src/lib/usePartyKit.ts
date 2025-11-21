/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState, useCallback } from 'react';
import PartySocket from 'partysocket';
import type { GameState, ClientMessage, ServerMessage } from '../types';

const PARTYKIT_HOST = import.meta.env.VITE_PARTYKIT_HOST || 'localhost:1999';

interface UsePartyKitOptions {
  playerId?: string;
}

export function usePartyKit(roomId: string | null, options?: UsePartyKitOptions) {
  const [socket, setSocket] = useState<PartySocket | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionId, setConnectionId] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId) return;

    const partySocket = new PartySocket({
      host: PARTYKIT_HOST,
      room: roomId,
      id: options?.playerId,
    });

    partySocket.addEventListener('open', () => {
      console.log('Connected to PartyKit');
      setConnected(true);
      setError(null);
      setConnectionId(partySocket.id);
    });

    partySocket.addEventListener('message', (event) => {
      try {
        const message: ServerMessage = JSON.parse(event.data);

        if (message.type === 'gameState') {
          setGameState(message.state);
        } else if (message.type === 'error') {
          setError(message.message);
        }
      } catch (err) {
        console.error('Failed to parse message:', err);
      }
    });

    partySocket.addEventListener('close', () => {
      console.log('Disconnected from PartyKit');
      setConnected(false);
    });

    partySocket.addEventListener('error', (err) => {
      console.error('PartyKit error:', err);
      setError('Connection error');
      setConnected(false);
    });

    setSocket(partySocket);

    return () => {
      partySocket.close();
    };
  }, [roomId, options?.playerId]);

  const sendMessage = useCallback(
    (message: ClientMessage) => {
      if (socket && connected) {
        socket.send(JSON.stringify(message));
      }
    },
    [socket, connected],
  );

  return {
    gameState,
    connected,
    error,
    sendMessage,
    connectionId,
  };
}
