/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from 'react';
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

export default function Game() {
  const { gameId } = useParams<{ gameId: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const existingSession = gameId ? getPlayerSession(gameId) : null;
  const [playerId] = useState<string>(existingSession?.playerId || generatePlayerId());
  const { gameState, connected, error, sendMessage } = usePartyKit(gameId || null, { playerId });

  const [hasJoined, setHasJoined] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);

  const state = location.state as {
    playerName: string;
    isAdmin: boolean;
    settings?: any;
  } | null;

  const playerName = existingSession?.playerName || state?.playerName || 'Guest';
  const isAdmin = existingSession?.isAdmin ?? state?.isAdmin ?? false;

  useEffect(() => {
    if (!playerName) {
      navigate('/');
      return;
    }

    if (connected && !hasJoined && gameId) {
      if (isReconnecting) {
        toast.success('Reconnected to the game!');
        sendMessage({
          type: 'join',
          name: playerName,
          isAdmin: isAdmin,
        });
      } else {
        sendMessage({
          type: 'join',
          name: playerName,
          isAdmin: isAdmin,
        });

        savePlayerSession(gameId, playerId, playerName, isAdmin);
      }
      setHasJoined(true);
      setIsReconnecting(false);
    }
  }, [
    connected,
    hasJoined,
    gameId,
    playerId,
    playerName,
    isAdmin,
    isReconnecting,
    navigate,
    sendMessage,
  ]);

  useEffect(() => {
    if (gameState && state?.settings && isAdmin && hasJoined) {
      sendMessage({
        type: 'updateSettings',
        settings: state.settings,
      });
    }
  }, [gameState, state?.settings, isAdmin, hasJoined, sendMessage]);

  const currentPlayer = playerId && gameState ? gameState.players[playerId] : null;
  const isPlayerAdmin = currentPlayer?.isAdmin || false;
  const isSpectator = currentPlayer?.isSpectator || false;

  const handleVote = (vote: string) => {
    if (isSpectator) return;
    sendMessage({ type: 'vote', vote });
  };

  const handleReveal = () => {
    if (!isPlayerAdmin && !gameState?.settings.allowPlayersToReveal) return;
    sendMessage({ type: 'reveal' });
  };

  const handleNewRound = () => {
    if (!isPlayerAdmin) return;
    sendMessage({ type: 'newRound' });
  };

  const handleUpdateSettings = (settings: any) => {
    if (!isPlayerAdmin) return;
    sendMessage({ type: 'updateSettings', settings });
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/join?gameId=${gameId}`;
    navigator.clipboard.writeText(url);
    toast.success('Game link copied to clipboard!');
  };

  const copyGameId = () => {
    if (gameId) {
      navigator.clipboard.writeText(gameId);
      alert('Game ID copied to clipboard!');
    }
  };

  if (!connected && !error) {
    return (
      <div className="game-container">
        <div className="loading">Connecting to game...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="game-container">
        <div className="error">
          <p>Error: {error}</p>
          <button onClick={() => navigate('/')}>Back to Home</button>
        </div>
      </div>
    );
  }

  if (!gameState || !currentPlayer) {
    return (
      <div className="game-container">
        <div className="loading">Loading game...</div>
      </div>
    );
  }

  const allVoted = Object.values(gameState.players)
    .filter((p) => !p.isSpectator)
    .every((p) => p.hasVoted);

  const canReveal = isPlayerAdmin || gameState.settings.allowPlayersToReveal;
  const stats = gameState.votesRevealed ? calculateRoundStats(gameState) : null;

  return (
    <div className="min-h-screen">
      <GameHeader
        gameName={gameState.settings.gameName}
        playerName={currentPlayer.name}
        gameId={gameId?.toUpperCase()}
        handleSettingsClick={() => setShowSettings(true)}
        handleCopyLink={handleCopyLink}
        onCopyId={copyGameId}
        isAdmin={isPlayerAdmin}
        showSettings={showSettings}
        settings={gameState.settings}
        onUpdate={handleUpdateSettings}
      />

      <div className="flex flex-col items-center justify-between min-h-[calc(100vh-80px)] px-4">
        <div className="flex flex-col items-center justify-center flex-grow w-full">
          <div className="w-full flex justify-center sticky bottom-0 pb-4">
            <VoteStatusCards
              players={Object.values(gameState.players as Record<string, Player>)}
              votesRevealed={gameState.votesRevealed}
            />
          </div>
          {!gameState.votesRevealed && (
            <>
              {allVoted &&
                canReveal &&
                Object.values(gameState.players).filter((p) => !p.isSpectator).length > 1 && (
                  <Button className="" onClick={handleReveal}>
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
                <div className="spectator-notice">
                  <h2>👁️ Spectating</h2>
                  <p>You are observing this round</p>
                </div>
              )}
              {allVoted && !canReveal && (
                <div className="waiting-message">Waiting for admin to reveal votes...</div>
              )}
            </>
          )}
        </div>
        {gameState.votesRevealed && stats && (
          <>
            {isAdmin && <Button onClick={handleNewRound}>Start New Round</Button>}
            <RoundStats stats={stats} />
          </>
        )}
      </div>
    </div>
  );
}
