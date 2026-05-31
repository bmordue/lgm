import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';

interface GameUpdatePayload {
  gameId: number;
  [key: string]: unknown;
}

class WebSocketService {
  private io: SocketIOServer | null = null;

  initialize(server: HTTPServer): void {
    if (this.io) {
      return;
    }

    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.CLIENT_ORIGIN || '*',
      },
    });

    this.io.on('connection', (socket: Socket) => {
      socket.on('join_game', (payload: { gameId?: number | string } = {}) => {
        const gameId = Number(payload.gameId);
        if (this.isValidGameId(gameId)) {
          socket.join(this.gameRoom(gameId));
        }
      });

      socket.on('leave_game', (payload: { gameId?: number | string } = {}) => {
        const gameId = Number(payload.gameId);
        if (this.isValidGameId(gameId)) {
          socket.leave(this.gameRoom(gameId));
        }
      });
    });
  }

  emitGamesUpdated(): void {
    this.io?.emit('games:updated');
  }

  emitGameUpdated(payload: GameUpdatePayload): void {
    this.io?.to(this.gameRoom(payload.gameId)).emit('game:updated', payload);
  }

  private gameRoom(gameId: number): string {
    return `game:${gameId}`;
  }

  private isValidGameId(gameId: number): boolean {
    return Number.isFinite(gameId) && gameId >= 0;
  }
}

export const webSocketService = new WebSocketService();
