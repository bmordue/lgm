import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import DashboardView from '../DashboardView.vue';
import { createPinia, setActivePinia } from 'pinia';

// Mocking global fetch
const fetchMock = vi.fn();
global.fetch = fetchMock;

// Mocking router
vi.mock('../../router', () => ({
  default: {
    push: vi.fn(),
  },
}));

// Mocking User store
vi.mock('../../stores/User.store', () => ({
  useUserStore: () => ({
    getToken: () => 'fake-token',
  }),
}));

describe('DashboardView.vue accessibility and UX', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    fetchMock.mockClear();
    // Default mock for fetchGameList on mount
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ games: [] }),
    });
  });

  it('renders accessibility attributes for game list items', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        games: [
          { id: 1, playerCount: 1, maxPlayers: 4, isFull: false },
          { id: 2, playerCount: 4, maxPlayers: 4, isFull: true }
        ]
      }),
    });

    const wrapper = mount(DashboardView);
    // Wait for the next tick for the fetch to complete and UI to update
    await vi.waitFor(() => expect(wrapper.findAll('.game-item').length).toBe(2));

    const gameButtons = wrapper.findAll('.game-item');
    expect(gameButtons[0].attributes('aria-label')).toBe('Game #1, 1 of 4 players');
    expect(gameButtons[0].attributes('aria-busy')).toBe('false');
    expect(gameButtons[1].attributes('disabled')).toBeDefined();
  });

  it('shows joining state and disables buttons when joining a game', async () => {
    fetchMock.mockImplementation((url, options) => {
      if (url.includes('/games/1') && options?.method === 'put') {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: () => Promise.resolve({}),
            });
          }, 50);
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          games: [
            { id: 1, playerCount: 1, maxPlayers: 4, isFull: false },
            { id: 2, playerCount: 1, maxPlayers: 4, isFull: false }
          ]
        }),
      });
    });

    const wrapper = mount(DashboardView);
    await vi.waitFor(() => expect(wrapper.findAll('.game-item').length).toBe(2));

    const firstGameButton = wrapper.findAll('.game-item')[0];
    await firstGameButton.trigger('click');

    expect(firstGameButton.attributes('aria-busy')).toBe('true');
    expect(firstGameButton.text()).toContain('Joining...');

    // Both buttons should be disabled while joining
    const allButtons = wrapper.findAll('.game-item');
    expect(allButtons[0].attributes('disabled')).toBeDefined();
    expect(allButtons[1].attributes('disabled')).toBeDefined();
  });

  it('displays error message in an alert role on failure', async () => {
    fetchMock.mockImplementation((url, options) => {
      if (url.includes('/games/1') && options?.method === 'put') {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ message: 'Join failed error' }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          games: [{ id: 1, playerCount: 1, maxPlayers: 4, isFull: false }]
        }),
      });
    });

    const wrapper = mount(DashboardView);
    await vi.waitFor(() => expect(wrapper.findAll('.game-item').length).toBe(1));

    const joinButton = wrapper.find('.game-item');
    await joinButton.trigger('click');

    await vi.waitFor(() => expect(wrapper.find('.error-message').exists()).toBe(true));
    const errorMsg = wrapper.find('.error-message');
    expect(errorMsg.attributes('role')).toBe('alert');
    expect(errorMsg.text()).toContain('Join failed error');
  });

  it('shows actionable empty state message when no games', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ games: [] }),
    });

    const wrapper = mount(DashboardView);
    await vi.waitFor(() => expect(wrapper.text()).toContain('No active games found. Click \'Create New Game\' to start a new journey!'));
  });
});
