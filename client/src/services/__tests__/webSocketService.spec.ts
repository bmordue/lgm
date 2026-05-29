import { beforeEach, describe, expect, it, vi } from 'vitest';

const on = vi.fn();
const off = vi.fn();
const emit = vi.fn();
const disconnect = vi.fn();

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on,
    off,
    emit,
    disconnect,
  })),
}));

import { webSocketService } from '../webSocketService';

describe('webSocketService', () => {
  beforeEach(() => {
    on.mockClear();
    off.mockClear();
    emit.mockClear();
    disconnect.mockClear();
  });

  it('subscribes and unsubscribes to games updates', () => {
    const handler = vi.fn();
    const unsubscribe = webSocketService.onGamesUpdated(handler);

    expect(on).toHaveBeenCalledWith('games:updated', handler);

    unsubscribe();
    expect(off).toHaveBeenCalledWith('games:updated', handler);
  });

  it('joins and leaves game rooms', () => {
    webSocketService.joinGame(7);
    webSocketService.leaveGame(7);

    expect(emit).toHaveBeenCalledWith('join_game', { gameId: 7 });
    expect(emit).toHaveBeenCalledWith('leave_game', { gameId: 7 });
  });

  it('disconnects and clears the socket', () => {
    webSocketService.onGamesUpdated(() => undefined);
    webSocketService.disconnect();

    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});
