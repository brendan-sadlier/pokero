import type * as Party from 'partykit/server';

interface Player {
  id: string;
  name: string;
  isAdmin: boolean;
  isSpectator: boolean;
  vote: string | null;
  hasVoted: boolean;
}

interface GameSettings {
  gameName: string;
  allowPlayersToReveal: boolean;
  adminCanSpectate: boolean;
}

interface GameState {
  gameId: string;
  settings: GameSettings;
  players: Record<string, Player>;
  roundActive: boolean;
  votesRevealed: boolean;
  adminId: string;
}

export default class PokeroServicer implements Party.Server {
  constructor(readonly room: Party.Room) {}

  gameState: GameState | null = null;

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    // A websocket just connected!
    console.log(
      `Connected:
      id: ${conn.id}
      room: ${this.room.id}
      url: ${new URL(ctx.request.url).pathname}`,
    );

    if (this.gameState) {
      conn.send(JSON.stringify({ type: 'gameState', state: this.gameState }));
    }
  }

  onMessage(message: string, sender: Party.Connection) {
    try {
      const msg = JSON.parse(message);

      switch (msg.type) {
        case 'join':
          this.handleJoin(sender.id, msg.name, msg.isAdmin);
          break;
        case 'vote':
          this.handleVote(sender.id, msg.vote);
          break;
        case 'reveal':
          this.handleReveal(sender.id);
          break;
        case 'newRound':
          this.handleNewRound(sender.id);
          break;
        case 'updateSettings':
          this.handleUpdateSettings(sender.id, msg.settings);
          break;
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sender.send(JSON.stringify({ type: 'error', message: 'Failed to process message' }));
    }
  }

  handleJoin(playerId: string, name: string, isAdmin: boolean = false) {
    if (!this.gameState) {
      // First player to join creates the game
      this.gameState = {
        gameId: this.room.id,
        settings: {
          gameName: 'Pokero',
          allowPlayersToReveal: true,
          adminCanSpectate: true,
        },
        players: {},
        roundActive: true,
        votesRevealed: false,
        adminId: playerId,
      };
      isAdmin = true;
    }

    if (this.gameState.players[playerId]) {
      this.broadcast();
      return;
    }

    this.gameState.players[playerId] = {
      id: playerId,
      name,
      isAdmin,
      isSpectator: isAdmin && this.gameState.settings.adminCanSpectate,
      vote: null,
      hasVoted: false,
    };

    this.broadcast();
  }

  handleVote(playerId: string, vote: string) {
    if (!this.gameState || !this.gameState.players[playerId]) return;
    const player = this.gameState.players[playerId];
    if (player.isSpectator) return;

    if (this.gameState.votesRevealed) return;

    player.vote = vote;
    player.hasVoted = true;

    this.broadcast();
  }

  handleReveal(playerId: string) {
    if (!this.gameState) return;

    const player = this.gameState.players[playerId];
    if (!player) return;

    if (!player.isAdmin && !this.gameState.settings.allowPlayersToReveal) return;

    this.gameState.votesRevealed = true;

    this.broadcast();
  }

  handleNewRound(playerId: string) {
    if (!this.gameState) return;

    const player = this.gameState.players[playerId];
    if (!player || !player.isAdmin) return;

    for (const p of Object.values(this.gameState.players)) {
      p.vote = null;
      p.hasVoted = false;
    }

    this.gameState.votesRevealed = false;
    this.gameState.roundActive = true;

    this.broadcast();
  }

  handleUpdateSettings(playerId: string, settings: Partial<GameSettings>) {
    if (!this.gameState) return;

    const player = this.gameState.players[playerId];
    if (!player || !player.isAdmin) return;

    this.gameState.settings = { ...this.gameState.settings, ...settings };

    if (settings.adminCanSpectate !== undefined) {
      const admin = this.gameState.players[this.gameState.adminId];
      if (admin) {
        admin.isSpectator = settings.adminCanSpectate;
        if (settings.adminCanSpectate) {
          admin.vote = null;
          admin.hasVoted = false;
        }
      }
    }
    this.broadcast();
  }

  broadcast() {
    if (!this.gameState) return;

    const message = JSON.stringify({ type: 'gameState', state: this.gameState });

    this.room.broadcast(message);
  }

  onClose(conn: Party.Connection) {
    console.log(`Connection closed: ${conn.id} from room ${this.room.id}`);
  }
}

PokeroServicer satisfies Party.Worker;
