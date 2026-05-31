import { io, type Socket } from 'socket.io-client';
import { API_URL } from '@/config';

interface GameUpdatePayload {
  gameId: number;
  [key: string]: unknown;
}

type Unsubscribe = () => void;

class WebSocketService {
  private socket: Socket | null = null;

  private ensureSocket(): Socket {
    if (!this.socket) {
      this.socket = io(API_URL, {
        transports: ['websocket', 'polling'],
      });
    }

    return this.socket;
  }

  onGamesUpdated(handler: () => void): Unsubscribe {
    const socket = this.ensureSocket();

    socket.on('games:updated', handler);
    return () => socket.off('games:updated', handler);
  }

  onGameUpdated(handler: (payload: GameUpdatePayload) => void): Unsubscribe {
    const socket = this.ensureSocket();

    socket.on('game:updated', handler);
    return () => socket.off('game:updated', handler);
  }

  joinGame(gameId: number): void {
    const socket = this.ensureSocket();
    socket.emit('join_game', { gameId });
  }

  leaveGame(gameId: number): void {
    if (!this.socket) {
      return;
    }

    this.socket.emit('leave_game', { gameId });
  }

  disconnect(): void {
    if (!this.socket) {
      return;
    }

    this.socket.disconnect();
    this.socket = null;
  }
}

export const webSocketService = new WebSocketService();
