/**
 * @fileoverview Main game page component.
 * Handles real-time game state, voting, and results display.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { calculateRoundStats, normalizeGameId } from '../lib/utils';
import { usePartyKit } from '../lib/usePartyKit';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import {
  clearPlayerSession,
  generatePlayerId,
  getPlayerSession,
  savePlayerSession,
  updateSessionSettings,
} from '../lib/sessionManager';
import {
  isCreateGameState,
  type ConnectionState,
  type GameLocationState,
  type GameSettings,
} from '../types';
import { AlertCircle, RefreshCw } from 'lucide-react';
import {
  CountdownOverlay,
  GameHeader,
  RoundStats,
  VoteStatusCards,
  VotingCards,
} from '../components/game';

/**
 * Hook to manage player session and identity.
 */
function usePlayerSession(gameId: string | null) {
  const existingSession = useMemo(() => (gameId ? getPlayerSession(gameId) : null), [gameId]);

  const [playerId] = useState<string>(() => existingSession?.playerId || generatePlayerId());

  return { existingSession, playerId };
}

/**
 * Hook to extract player info from location state or session.
 */
function usePlayerInfo(
  locationState: GameLocationState | null,
  existingSession: ReturnType<typeof getPlayerSession>,
) {
  const playerName = useMemo(
    () => existingSession?.playerName || locationState?.playerName || 'Guest',
    [existingSession, locationState],
  );

  const isAdmin = useMemo(
    () => existingSession?.isAdmin ?? locationState?.isAdmin ?? false,
    [existingSession, locationState],
  );

  return { playerName, isAdmin };
}

interface LoadingStateProps {
  message: string;
  retryCount?: number;
}

function LoadingState({ message, retryCount }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4" />
      <p className="text-muted-foreground">
        {message}
        {retryCount !== undefined && retryCount > 0 && ` (attempt ${retryCount + 1})`}
      </p>
    </div>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
  onGoHome: () => void;
}

function ErrorState({ message, onRetry, onGoHome }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="max-w-md w-full space-y-4 text-center">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
        <h2 className="text-xl font-semibold">Connection Error</h2>
        <p className="text-muted-foreground">{message}</p>
        <div className="flex gap-2 justify-center">
          <Button onClick={onRetry} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
          <Button onClick={onGoHome}>Back to Home</Button>
        </div>
      </div>
    </div>
  );
}

interface SpectatorViewProps {
  message?: string;
}

function SpectatorView({ message = 'You are observing this round' }: SpectatorViewProps) {
  return (
    <div className="text-center p-6">
      <h2 className="text-xl font-semibold mb-2">👁️ Spectating</h2>
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}

/**
 * Main game page that manages the entire game session.
 */
export default function Game() {
  const { gameId: rawGameId } = useParams<{ gameId: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const gameId = useMemo(() => (rawGameId ? normalizeGameId(rawGameId) : null), [rawGameId]);

  useEffect(() => {
    if (rawGameId && rawGameId !== gameId) {
      window.history.replaceState(null, '', `/game/${gameId}`);
    }
  }, [rawGameId, gameId]);

  const { existingSession, playerId } = usePlayerSession(gameId);
  const locationState = location.state as GameLocationState | null;
  const { playerName, isAdmin } = usePlayerInfo(locationState, existingSession);

  const [hasJoined, setHasJoined] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [settingsApplied, setSettingsApplied] = useState(false);

  // Connection state handler
  const handleConnectionChange = useCallback((state: ConnectionState) => {
    setIsReconnecting(state === 'RECONNECTING');
  }, []);

  const handleGameEnded = useCallback(
    (endedBy: string) => {
      if (gameId) {
        clearPlayerSession(gameId);
      }
      toast.info(`${endedBy} has ended the game.`, {
        description: 'You will be redirected to the home page.',
        duration: 3000,
      });
      setTimeout(() => {
        navigate('/');
      }, 1500);
    },
    [gameId, navigate],
  );

  const handlePlayerLeft = useCallback((playerName: string) => {
    toast.info(`${playerName} has left the game.`);
  }, []);

  const handlePlayerKicked = useCallback(
    (playerName: string, kickedBy: string, wasMe: boolean) => {
      if (wasMe) {
        if (gameId) {
          clearPlayerSession(gameId);
        }
        toast.error(`You were kicked from the game by ${kickedBy}.`, {
          description: 'You will be redirected to the home page.',
          duration: 3000,
        });
        setTimeout(() => {
          navigate('/');
        }, 1500);
      } else {
        toast.info(`${playerName} was kicked from the game.`);
      }
    },
    [gameId, navigate],
  );

  const handleAdminTransferred = useCallback(
    (fromName: string, toName: string, iAmNewAdmin: boolean) => {
      if (iAmNewAdmin) {
        toast.success(`${fromName} made you the admin!`);
      } else {
        toast.info(`${fromName} transferred admin to ${toName}.`);
      }
    },
    [],
  );

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (gameId) {
        clearPlayerSession(gameId);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [gameId]);

  // PartyKit connection
  const { gameState, connected, error, sendMessage, retryCount, reconnect } = usePartyKit(gameId, {
    playerId,
    onConnectionChange: handleConnectionChange,
    onGameEnded: handleGameEnded,
    onPlayerLeft: handlePlayerLeft,
    onPlayerKicked: handlePlayerKicked,
    onAdminTransferred: handleAdminTransferred,
  });

  // Redirect if no valid player name
  useEffect(() => {
    if (!playerName || playerName === 'Guest') {
      toast.error('Please enter your name to join the game.');
      navigate('/');
    }
  }, [playerName, navigate]);

  // Join game when connected
  useEffect(() => {
    if (!connected || hasJoined || !gameId || !playerName) return;

    if (isReconnecting) {
      toast.success('Reconnected to the game!');
    }

    sendMessage({
      type: 'join',
      name: playerName,
      isAdmin,
    });

    const initialSettings = isCreateGameState(locationState)
      ? locationState.settings
      : existingSession?.settings;

    savePlayerSession(gameId, playerId, playerName, isAdmin, initialSettings);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasJoined(true);
    setIsReconnecting(false);
  }, [
    connected,
    hasJoined,
    gameId,
    playerId,
    playerName,
    isAdmin,
    isReconnecting,
    sendMessage,
    locationState,
    existingSession,
  ]);

  // Apply initial settings for admin
  useEffect(() => {
    if (!gameState || !hasJoined || !isAdmin || settingsApplied) return;

    const settingsToApply =
      existingSession?.settings ||
      (isCreateGameState(locationState) ? locationState.settings : undefined);

    if (settingsToApply) {
      const serverSettings = gameState.settings;
      const settingsDiffer =
        serverSettings.gameName !== settingsToApply.gameName ||
        serverSettings.allowPlayersToReveal !== settingsToApply.allowPlayersToReveal ||
        serverSettings.adminCanSpectate !== settingsToApply.adminCanSpectate ||
        serverSettings.votingType !== settingsToApply.votingType;

      if (settingsDiffer) {
        sendMessage({ type: 'updateSettings', settings: settingsToApply });
        if (gameId) {
          updateSessionSettings(gameId, settingsToApply);
        }
      }

      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSettingsApplied(true);
    }
  }, [
    gameState,
    hasJoined,
    isAdmin,
    settingsApplied,
    locationState,
    existingSession,
    sendMessage,
    gameId,
  ]);

  useEffect(() => {
    if (gameState?.settings && gameId) {
      updateSessionSettings(gameId, gameState.settings);
    }
  }, [gameState?.settings, gameId]);

  // Derived state
  const currentPlayer = useMemo(
    () => (playerId && gameState ? gameState.players[playerId] : null),
    [gameState, playerId],
  );

  const isPlayerAdmin = useMemo(() => currentPlayer?.isAdmin || false, [currentPlayer]);
  const isSpectator = useMemo(() => currentPlayer?.isSpectator || false, [currentPlayer]);

  const players = useMemo(() => (gameState ? Object.values(gameState.players) : []), [gameState]);

  const isCountingDown = useMemo(
    () => gameState?.countdownEnd != null && !gameState.votesRevealed,
    [gameState],
  );

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

  const votingPlayersCount = useMemo(() => players.filter((p) => !p.isSpectator).length, [players]);

  // Event Handlers
  const handleVote = useCallback(
    (vote: string) => {
      if (isSpectator) {
        toast.warning('Spectators cannot vote');
        return;
      }
      if (isCountingDown) {
        toast.warning('Voting is locked during countdown');
        return;
      }
      sendMessage({ type: 'vote', vote });
    },
    [isSpectator, isCountingDown, sendMessage],
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

      if (gameId && gameState) {
        const updatedSettings = { ...gameState.settings, ...settings };
        updateSessionSettings(gameId, updatedSettings);
      }
    },
    [isPlayerAdmin, sendMessage, gameId, gameState],
  );

  const handleGoHome = useCallback(() => navigate('/'), [navigate]);

  const handleLeaveGame = useCallback(() => {
    if (!gameId) return;

    sendMessage({ type: 'leave' });
    clearPlayerSession(gameId);
    toast.success('You have left the game.');
    navigate('/');
  }, [gameId, sendMessage, navigate]);

  const handleEndGame = useCallback(() => {
    if (!gameId || !isPlayerAdmin) return;

    sendMessage({ type: 'endGame' });
    clearPlayerSession(gameId);
    toast.success('You have ended the game.');
    navigate('/');
  }, [gameId, isPlayerAdmin, sendMessage, navigate]);

  const handleKickPlayer = useCallback(
    (targetPlayerId: string) => {
      if (!isPlayerAdmin) {
        toast.warning('Only the admin can kick players');
        return;
      }
      sendMessage({ type: 'kickPlayer', targetPlayerId });
    },
    [isPlayerAdmin, sendMessage],
  );

  const handleTransferAdmin = useCallback(
    (targetPlayerId: string) => {
      if (!isPlayerAdmin) {
        toast.warning('Only the admin can transfer admin rights');
        return;
      }
      sendMessage({ type: 'transferAdmin', targetPlayerId });
    },
    [isPlayerAdmin, sendMessage],
  );

  // Render states
  if (!connected && !error) {
    return <LoadingState message="Connecting to game" retryCount={retryCount} />;
  }

  if (error) {
    return <ErrorState message={error.userMessage} onRetry={reconnect} onGoHome={handleGoHome} />;
  }

  if (!gameState || !currentPlayer) {
    return <LoadingState message="Loading game..." />;
  }

  return (
    <div className="min-h-screen">
      {isCountingDown && gameState.countdownEnd && (
        <CountdownOverlay countdownEnd={gameState.countdownEnd} />
      )}

      <GameHeader
        gameName={gameState.settings.gameName}
        playerName={currentPlayer.name}
        gameId={gameId || ''}
        isAdmin={isPlayerAdmin}
        settings={gameState.settings}
        onUpdate={handleUpdateSettings}
        onLeave={handleLeaveGame}
        onEndGame={handleEndGame}
      />

      <div className="flex flex-col items-center justify-between min-h-[calc(100vh-80px)] px-4">
        <div className="flex flex-col items-center justify-center grow w-full">
          <div className="w-full flex justify-center sticky bottom-0 pb-4">
            <VoteStatusCards
              players={players}
              votesRevealed={gameState.votesRevealed}
              isCurrentUserAdmin={isPlayerAdmin}
              currentPlayerId={currentPlayer.id}
              onKickPlayer={handleKickPlayer}
              onTransferAdmin={handleTransferAdmin}
            />
          </div>

          {!gameState.votesRevealed && (
            <>
              {allVoted && canReveal && votingPlayersCount > 1 && (
                <Button className="mb-4" onClick={handleReveal}>
                  Reveal Votes
                </Button>
              )}

              {!isSpectator ? (
                <VotingCards
                  onVote={handleVote}
                  selectedVote={currentPlayer.vote}
                  disabled={gameState.votesRevealed}
                  votingType={gameState.settings.votingType}
                />
              ) : (
                <SpectatorView />
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
          <div className="flex flex-col items-center pb-40">
            {isPlayerAdmin && (
              <Button onClick={handleNewRound} className="mb-4 hover:cursor-pointer" size="xl">
                Start New Round
              </Button>
            )}

            <RoundStats stats={stats} />
          </div>
        )}
      </div>
    </div>
  );
}
