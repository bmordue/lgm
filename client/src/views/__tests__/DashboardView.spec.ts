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

describe('DashboardView.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    fetchMock.mockClear();
    // Default mock for fetchGameList on mount
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ games: [] }),
    });
  });

  it('renders "Create New Game" button', () => {
    const wrapper = mount(DashboardView);
    const button = wrapper.find('button');
    expect(button.text()).toBe('Create New Game');
  });

  it('sets isCreating to true when "Create New Game" is clicked', async () => {
    // Mock the POST request to /games
    fetchMock.mockImplementation((url, options) => {
      if (options?.method === 'post') {
        // Return a promise that doesn't resolve immediately to test loading state
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: () => Promise.resolve({ success: true }),
            });
          }, 50);
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ games: [] }),
      });
    });

    const wrapper = mount(DashboardView);
    const button = wrapper.find('button');

    await button.trigger('click');

    // Check loading state
    expect(button.text()).toBe('Creating...');
    expect(button.attributes('disabled')).toBeDefined();
    expect(button.attributes('aria-busy')).toBe('true');

    // Wait for the request to finish
    await vi.waitFor(() => expect(button.text()).toBe('Create New Game'), { timeout: 200 });

    expect(button.attributes('disabled')).toBeUndefined();
    expect(button.attributes('aria-busy')).toBe('false');
  });

  it('displays success message after successful game creation', async () => {
    fetchMock.mockImplementation((url, options) => {
      if (options?.method === 'post') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ games: [] }),
      });
    });

    const wrapper = mount(DashboardView);
    const button = wrapper.find('button');

    await button.trigger('click');

    await vi.waitFor(() => expect(wrapper.text()).toContain('Game created successfully!'), { timeout: 200 });
  });
});
