import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import DashboardView from '../DashboardView.vue';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';

vi.mock('@/main', () => ({ API_URL: 'http://localhost:3000' }));
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('DashboardView.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockFetch.mockReset();
  });

  it('renders game items as buttons', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ games: [
        { id: 1, playerCount: 2, maxPlayers: 4, isFull: false },
        { id: 2, playerCount: 4, maxPlayers: 4, isFull: true }
      ] })
    });

    const wrapper = mount(DashboardView);
    await nextTick(); await nextTick();

    const gameButtons = wrapper.findAll('button.game-item');
    expect(gameButtons.length).toBe(2);

    expect(gameButtons[0].attributes('disabled')).toBeUndefined();
    expect(gameButtons[0].attributes('aria-label')).toBe('Join Game #1');
    expect(gameButtons[0].text()).toContain('Game #1');

    expect(gameButtons[1].attributes('disabled')).toBeDefined();
    expect(gameButtons[1].attributes('aria-label')).toBe('Join Game #2');
    expect(gameButtons[1].text()).toContain('(FULL)');
  });
});
