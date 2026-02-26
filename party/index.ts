/**
 * @fileoverview PartyKit server implementation for Pokero.
 * Handles real-time game state management and WebSocket communication.
 */

import type * as Party from 'partykit/server';

interface Player {
  id: string;
  name: string;
  isAdmin: boolean;
  isSpectator: boolean;
  vote: string | null;
  hasVoted: boolean;
}

type VotingType = 'fibonacci' | 't-shirt' | 'powers-of-2';

interface GameSettings {
  gameName: string;
  allowPlayersToReveal: boolean;
  adminCanSpectate: boolean;
  votingType: VotingType;
}

interface GameState {
  gameId: string;
  settings: GameSettings;
  players: Record<string, Player>;
  roundActive: boolean;
  votesRevealed: boolean;
  countdownEnd: number | null;
  adminId: string;
}

type ClientMessage =
  | { type: 'join'; name: string; isAdmin?: boolean }
  | { type: 'vote'; vote: string }
  | { type: 'reveal' }
  | { type: 'newRound' }
  | { type: 'updateSettings'; settings: Partial<GameSettings> }
  | { type: 'leave' }
  | { type: 'endGame' }
  | { type: 'kickPlayer'; targetPlayerId: string }
  | { type: 'transferAdmin'; targetPlayerId: string };

const DEFAULT_SETTINGS: GameSettings = {
  gameName: 'Pokero',
  allowPlayersToReveal: true,
  adminCanSpectate: true,
  votingType: 'fibonacci',
};

const VALID_VOTING_TYPES: VotingType[] = ['fibonacci', 't-shirt', 'powers-of-2'];

const MAX_NAME_LENGTH = 50;
const MAX_GAME_NAME_LENGTH = 100;
const COUNTDOWN_DURATION_MS = 3000; // 3 secs

/**
 * Sanitizes a player name by trimming and limiting length.
 */
function sanitizeName(name: string): string {
  return name.trim().slice(0, MAX_NAME_LENGTH);
}

/**
 * Sanitizes a game name by trimming and limiting length.
 */
function sanitizeGameName(name: string): string {
  return name.trim().slice(0, MAX_GAME_NAME_LENGTH);
}

/**
 * Validates that a vote value is reasonable.
 */
function isValidVote(vote: unknown): vote is string {
  return typeof vote === 'string' && vote.length > 0 && vote.length <= 10;
}

/*
 * Validates that a voting type is valid.
 */
function isValidVotingType(type: unknown): type is VotingType {
  return typeof type === 'string' && VALID_VOTING_TYPES.includes(type as VotingType);
}

/**
 * PartyKit server for managing Pokero game rooms.
 */
export default class PokeroServicer implements Party.Server {
  private gameState: GameState | null = null;
  private countdownTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(readonly room: Party.Room) {}

  /**
   * Handles new WebSocket connections.
   */
  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext): void {
    // Send current game state to the new connection
    if (this.gameState) {
      this.sendToConnection(conn, { type: 'gameState', state: this.gameState });
    }
  }

  /**
   * Handles incoming messages from clients.
   */
  onMessage(message: string, sender: Party.Connection): void {
    let parsed: ClientMessage;

    try {
      parsed = JSON.parse(message);
    } catch (error) {
      console.error('Invalid JSON received:', error);
      this.sendError(sender, 'Invalid message format.');
      return;
    }

    try {
      this.handleClientMessage(parsed, sender);
    } catch (error) {
      console.error('Error handling message:', error);
      this.sendError(sender, 'Failed to process message.');
    }
  }

  /**
   * Handles connection close events.
   */
  onClose(conn: Party.Connection): void {
    console.log(`Connection closed: ${conn.id} from room ${this.room.id}`);
    this.handleLeave(conn.id);
  }

  private handleClientMessage(message: ClientMessage, sender: Party.Connection): void {
    switch (message.type) {
      case 'join':
        this.handleJoin(sender.id, message.name, message.isAdmin);
        break;
      case 'vote':
        this.handleVote(sender.id, message.vote);
        break;
      case 'reveal':
        this.handleReveal(sender.id);
        break;
      case 'newRound':
        this.handleNewRound(sender.id);
        break;
      case 'updateSettings':
        this.handleUpdateSettings(sender.id, message.settings);
        break;
      case 'leave':
        this.handleLeave(sender.id);
        break;
      case 'endGame':
        this.handleEndGame(sender.id);
        break;
      case 'kickPlayer':
        this.handleKickPlayer(sender.id, message.targetPlayerId);
        break;
      case 'transferAdmin':
        this.handleTransferAdmin(sender.id, message.targetPlayerId);
        break;
      default:
        console.warn('Unknown message type received');
    }
  }

  /**
   * Handles player joining the game.
   */
  private handleJoin(playerId: string, name: string, isAdmin = false): void {
    const sanitizedName = sanitizeName(name);

    if (!sanitizedName) {
      console.warn('Join rejected: empty name');
      return;
    }

    if (!this.gameState) {
      this.gameState = this.createInitialGameState(playerId);
      isAdmin = true;
    }

    this.gameState.players[playerId] = {
      id: playerId,
      name: sanitizedName,
      isAdmin,
      isSpectator: isAdmin && this.gameState.settings.adminCanSpectate,
      vote: null,
      hasVoted: false,
    };

    this.broadcast();
  }

  /**
   * Handles a player submitting a vote.
   */
  private handleVote(playerId: string, vote: string): void {
    if (!this.gameState) return;

    const player = this.gameState.players[playerId];
    if (!player) return;

    if (player.isSpectator) return;

    if (this.gameState.votesRevealed || this.gameState.countdownEnd) return;

    if (!isValidVote(vote)) return;

    player.vote = vote;
    player.hasVoted = true;

    this.broadcast();
  }

  /**
   * Handles revealing all votes.
   */
  private handleReveal(playerId: string): void {
    if (!this.gameState) return;

    const player = this.gameState.players[playerId];
    if (!player) return;

    const canReveal = player.isAdmin || this.gameState.settings.allowPlayersToReveal;
    if (!canReveal) return;

    if (this.gameState.countdownEnd || this.gameState.votesRevealed) return;

    this.gameState.countdownEnd = Date.now() + COUNTDOWN_DURATION_MS;
    this.broadcast();

    if (this.countdownTimer) {
      clearTimeout(this.countdownTimer);
    }

    this.countdownTimer = setTimeout(() => {
      if (this.gameState) {
        this.gameState.votesRevealed = true;
        this.gameState.countdownEnd = null;
        this.broadcast();
      }
      this.countdownTimer = null;
    }, COUNTDOWN_DURATION_MS);
  }

  /**
   * Handles starting a new round.
   */
  private handleNewRound(playerId: string): void {
    if (!this.gameState) return;

    const player = this.gameState.players[playerId];
    if (!player?.isAdmin) return;

    if (this.countdownTimer) {
      clearTimeout(this.countdownTimer);
      this.countdownTimer = null;
    }

    // Reset votes and round state
    for (const p of Object.values(this.gameState.players)) {
      p.vote = null;
      p.hasVoted = false;
    }

    this.gameState.votesRevealed = false;
    this.gameState.countdownEnd = null;
    this.gameState.roundActive = true;

    this.broadcast();
  }

  /**
   * Handles updating game settings.
   */
  private handleUpdateSettings(playerId: string, settings: Partial<GameSettings>): void {
    if (!this.gameState) return;

    const player = this.gameState.players[playerId];
    if (!player?.isAdmin) return;

    if (settings.gameName !== undefined) {
      const sanitized = sanitizeGameName(settings.gameName);
      if (sanitized) {
        this.gameState.settings.gameName = sanitized;
      }
    }

    if (settings.allowPlayersToReveal !== undefined) {
      this.gameState.settings.allowPlayersToReveal = Boolean(settings.allowPlayersToReveal);
    }

    if (settings.adminCanSpectate !== undefined) {
      this.gameState.settings.adminCanSpectate = Boolean(settings.adminCanSpectate);

      // Update existing admin's spectator status
      const admin = this.gameState.players[this.gameState.adminId];
      if (admin) {
        admin.isSpectator = this.gameState.settings.adminCanSpectate;
        if (settings.adminCanSpectate) {
          admin.vote = null;
          admin.hasVoted = false;
        }
      }
    }

    if (settings.votingType !== undefined && isValidVotingType(settings.votingType)) {
      this.gameState.settings.votingType = settings.votingType;

      // Reset votes for all players when voting type changes
      for (const p of Object.values(this.gameState.players)) {
        p.vote = null;
        p.hasVoted = false;
      }
      this.gameState.votesRevealed = false;
    }

    console.log('Game settings updated:', this.gameState.settings);
    this.broadcast();
  }

  /**
   * Handles a player leaving the game.
   * If the player is the admin, assigns a new admin.
   */
  private handleLeave(playerId: string): void {
    if (!this.gameState) return;

    const player = this.gameState.players[playerId];
    if (!player) return;

    const playerName = player.name;
    const wasAdmin = player.isAdmin;

    delete this.gameState.players[playerId];

    console.log(`Player left: ${playerName} (${playerId})`);

    if (wasAdmin) {
      const remainingPlayers = Object.values(this.gameState.players);
      if (remainingPlayers.length > 0) {
        const newAdmin = remainingPlayers[0];
        newAdmin.isAdmin = true;
        this.gameState.adminId = newAdmin.id;
        console.log(`New admin assigned: ${newAdmin.name} (${newAdmin.id})`);
      }
    }

    this.room.broadcast(JSON.stringify({ type: 'playerLeft', playerId, playerName }));

    this.broadcast();
  }

  private handleKickPlayer(adminId: string, targetPlayerId: string): void {
    if (!this.gameState) return;

    const admin = this.gameState.players[adminId];
    if (!admin?.isAdmin) return;

    if (adminId === targetPlayerId) return;

    const target = this.gameState.players[targetPlayerId];
    if (!target) return;

    const targetName = target.name;
    delete this.gameState.players[targetPlayerId];

    console.log(
      `Player kicked: ${targetName} (${targetPlayerId}) by admin ${admin.name} (${adminId})`,
    );

    this.room.broadcast(
      JSON.stringify({
        type: 'playerKicked',
        playerId: targetPlayerId,
        playerName: targetName,
        kickedBy: admin.name,
      }),
    );

    this.broadcast();
  }

  private handleTransferAdmin(adminId: string, targetPlayerId: string): void {
    if (!this.gameState) return;

    const admin = this.gameState.players[adminId];
    if (!admin?.isAdmin) return;

    if (adminId === targetPlayerId) return;

    const target = this.gameState.players[targetPlayerId];
    if (!target) return;

    admin.isAdmin = false;
    admin.isSpectator = false;

    target.isAdmin = true;
    target.isSpectator = this.gameState.settings.adminCanSpectate;
    if (target.isSpectator) {
      target.vote = null;
      target.hasVoted = false;
    }

    this.gameState.adminId = targetPlayerId;

    console.log(`Admin transferred from ${admin.name} to ${target.name}`);

    this.room.broadcast(
      JSON.stringify({
        type: 'adminTransferred',
        fromPlayerId: adminId,
        fromPlayerName: admin.name,
        toPlayerId: targetPlayerId,
        toPlayerName: target.name,
      }),
    );

    this.broadcast();
  }

  /**
   * Handles ending the game.
   * Only the admin can end the game.
   */
  private handleEndGame(playerId: string): void {
    if (!this.gameState) return;

    const player = this.gameState.players[playerId];
    if (!player || !player.isAdmin) return;

    const adminName = player.name;
    console.log(`Game ${this.room.id} ended by admin: ${adminName} (${playerId})`);

    if (this.countdownTimer) {
      clearTimeout(this.countdownTimer);
      this.countdownTimer = null;
    }

    this.room.broadcast(JSON.stringify({ type: 'gameEnded', endedBy: adminName }));

    this.gameState = null;
  }

  /**
   * Creates initial game state for a new game.
   */
  private createInitialGameState(adminId: string): GameState {
    return {
      gameId: this.room.id,
      settings: { ...DEFAULT_SETTINGS },
      players: {},
      roundActive: true,
      votesRevealed: false,
      countdownEnd: null,
      adminId,
    };
  }

  /**
   * Broadcasts current game state to all connected clients.
   */
  private broadcast(): void {
    if (!this.gameState) return;

    const message = JSON.stringify({ type: 'gameState', state: this.gameState });

    this.room.broadcast(message);
  }

  /**
   * Sends a message to a specific connection.
   */
  private sendToConnection(
    conn: Party.Connection,
    message: { type: string; [key: string]: unknown },
  ): void {
    conn.send(JSON.stringify(message));
  }

  /**
   * Sends an error message to a connection.
   */
  private sendError(conn: Party.Connection, message: string): void {
    this.sendToConnection(conn, { type: 'error', message });
  }
}

PokeroServicer satisfies Party.Worker;
