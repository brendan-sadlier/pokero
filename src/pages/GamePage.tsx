/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { calculateRoundStats } from '../lib/utils';
import { usePartyKit } from '../lib/usePartyKit';
import VotingCards from '../components/game/voting-cards';
import RoundStats from '../components/game/round-stats';
import GameHeader from '../components/game/game-header';
import VoteStatusCards, { type Player } from '../components/game/vote-status-card';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { generatePlayerId, getPlayerSession, savePlayerSession } from '../lib/sessionManager';
import type {
  ConnectionState,
  CreateGameLocationState,
  GameSettings,
  JoinGameLocationState,
} from '../types';
import { AlertCircle, RefreshCw } from 'lucide-react';

type LocationState = CreateGameLocationState | JoinGameLocationState;

export default function Game() {
  const { gameId } = useParams<{ gameId: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const existingSession = useMemo(() => (gameId ? getPlayerSession(gameId) : null), [gameId]);

  const [playerId] = useState<string>(existingSession?.playerId || generatePlayerId());
  const [hasJoined, setHasJoined] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);

  const handleConnectionChange = useCallback((state: ConnectionState) => {
    if (state == 'CONNECTED') {
      setIsReconnecting(false);
    } else if (state == 'RECONNECTING') {
      setIsReconnecting(true);
    }
  }, []);

  const { gameState, connected, connectionState, error, sendMessage, retryCount, reconnect } =
    usePartyKit(gameId || null, {
      playerId,
      onConnectionChange: handleConnectionChange,
    });

  const state = location.state as LocationState | null;

  const playerName = useMemo(
    () => existingSession?.playerName || state?.playerName || 'Guest',
    [existingSession, state],
  );

  const isAdmin = useMemo(
    () => existingSession?.isAdmin ?? state?.isAdmin ?? false,
    [existingSession, state],
  );

  useEffect(() => {
    if (!playerName || playerName === 'Guest') {
      toast.error('Please enter your name to join the game.');
      navigate('/');
    }
  }, [playerName, navigate]);

  useEffect(() => {
    if (!connected || hasJoined || !gameId || !playerName) return;

    if (isReconnecting) {
      toast.success('Reconnected to the game!');
    }

    sendMessage({
      type: 'join',
      name: playerName,
      isAdmin: isAdmin,
    });
    savePlayerSession(gameId, playerId, playerName, isAdmin);
    setHasJoined(true);
    setIsReconnecting(false);
  }, [connected, hasJoined, gameId, playerId, playerName, isAdmin, isReconnecting, sendMessage]);

  useEffect(() => {
    if (!gameState || !hasJoined || !isAdmin) return;

    const createGameState = state as CreateGameLocationState | null;
    if (createGameState?.settings) {
      sendMessage({ type: 'updateSettings', settings: createGameState.settings });
    }
  }, [gameState, hasJoined, isAdmin, state, sendMessage]);

  const currentPlayer = useMemo(
    () => (playerId && gameState ? gameState.players[playerId] : null),
    [gameState, playerId],
  );

  const isPlayerAdmin = useMemo(() => currentPlayer?.isAdmin || false, [currentPlayer]);
  const isSpectator = useMemo(() => currentPlayer?.isSpectator || false, [currentPlayer]);

  const players = useMemo(() => (gameState ? Object.values(gameState.players) : []), [gameState]);

  const allVoted = useMemo(
    () =>
      gameState
        ? Object.values(gameState.players)
            .filter((p) => !p.isSpectator)
            .every((p) => p.hasVoted)
        : false,
    [gameState],
  );

  const canReveal = useMemo(
    () => isPlayerAdmin || (gameState?.settings.allowPlayersToReveal ?? false),
    [isPlayerAdmin, gameState],
  );

  const stats = useMemo(
    () => (gameState?.votesRevealed ? calculateRoundStats(gameState) : null),
    [gameState],
  );

  // Event Handlers
  const handleVote = useCallback(
    (vote: string) => {
      if (isSpectator) {
        toast.warning('Spectators cannot vote');
        return;
      }
      sendMessage({ type: 'vote', vote });
    },
    [isSpectator, sendMessage],
  );

  const handleReveal = useCallback(() => {
    if (!canReveal) {
      toast.warning('Only the admin can reveal votes');
      return;
    }
    sendMessage({ type: 'reveal' });
  }, [canReveal, sendMessage]);

  const handleNewRound = useCallback(() => {
    if (!isPlayerAdmin) {
      toast.warning('Only the admin can start a new round');
      return;
    }
    sendMessage({ type: 'newRound' });
  }, [isPlayerAdmin, sendMessage]);

  const handleUpdateSettings = useCallback(
    (settings: Partial<GameSettings>) => {
      if (!isPlayerAdmin) {
        toast.warning('Only the admin can update settings');
        return;
      }
      sendMessage({ type: 'updateSettings', settings });
    },
    [isPlayerAdmin, sendMessage],
  );

  const handleCopyLink = useCallback(() => {
    const url = `${window.location.origin}/join?gameId=${gameId}`;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        toast.success('Game link copied to clipboard!');
      })
      .catch(() => {
        toast.error('Failed to copy link');
      });
  }, [gameId]);

  const copyGameId = useCallback(() => {
    if (gameId) {
      navigator.clipboard
        .writeText(gameId)
        .then(() => {
          toast.success('Game ID copied to clipboard!');
        })
        .catch(() => {
          toast.error('Failed to copy Game ID');
        });
    }
  }, [gameId]);

  // Loading State
  if (!connected && !error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4" />
        <p className="text-muted-foreground">
          Connecting to game
          {retryCount > 0 && ` (attempt ${retryCount + 1})`}...
        </p>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="max-w-md w-full space-y-4 text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
          <h2 className="text-xl font-semibold">Connection Error</h2>
          <p className="text-muted-foreground">{error.userMessage}</p>
          <div className="flex gap-2 justify-center">
            <Button onClick={reconnect} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
            <Button onClick={() => navigate('/')}>Back to Home</Button>
          </div>
        </div>
      </div>
    );
  }

  // Waiting for Game State
  if (!gameState || !currentPlayer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4" />
        <p className="text-muted-foreground">Loading game...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <GameHeader
        gameName={gameState.settings.gameName}
        playerName={currentPlayer.name}
        gameId={gameId?.toUpperCase()}
        handleCopyLink={handleCopyLink}
        isAdmin={isPlayerAdmin}
        settings={gameState.settings}
        onUpdate={handleUpdateSettings}
      />

      <div className="flex flex-col items-center justify-between min-h-[calc(100vh-80px)] px-4">
        <div className="flex flex-col items-center justify-center flex-grow w-full">
          <div className="w-full flex justify-center sticky bottom-0 pb-4">
            <VoteStatusCards players={players} votesRevealed={gameState.votesRevealed} />
          </div>

          {!gameState.votesRevealed && (
            <>
              {allVoted &&
                canReveal &&
                Object.values(gameState.players).filter((p) => !p.isSpectator).length > 1 && (
                  <Button className="mb-4" onClick={handleReveal}>
                    Reveal Votes
                  </Button>
                )}
              {!isSpectator ? (
                <VotingCards
                  onVote={handleVote}
                  selectedVote={currentPlayer.vote}
                  disabled={gameState.votesRevealed}
                />
              ) : (
                <div className="text-center p-6">
                  <h2 className="text-xl font-semibold mb-2">👁️ Spectating</h2>
                  <p className="text-muted-foreground">You are observing this round</p>
                </div>
              )}
              {allVoted && !canReveal && (
                <div className="waiting-message text-center p-6">
                  <p className="text-muted-foreground">Waiting for admin to reveal votes...</p>
                </div>
              )}
            </>
          )}
        </div>

        {gameState.votesRevealed && stats && (
          <>
            {isPlayerAdmin && (
              <Button onClick={handleNewRound} className="mb-4">
                Start New Round
              </Button>
            )}
            <RoundStats stats={stats} />
          </>
        )}
      </div>
    </div>
  );
}
