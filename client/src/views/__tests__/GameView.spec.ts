import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises, VueWrapper } from '@vue/test-utils';
import GameView from '../GameView.vue';
import OrderSubmission from '@/components/OrderSubmission.vue';
import type { PlannedMove, World } from '@/stores/Games.store'; // Assuming World is also needed for store mock
import { useGamesStore } from '@/stores/Games.store';
import { useUserStore } from '@/stores/User.store';

// Mock Pinia stores
vi.mock('@/stores/Games.store');
vi.mock('@/stores/User.store');

// Mock global fetch
global.fetch = vi.fn();

// Stub API_URL (imported in GameView.vue from @/config)
// GameView.vue uses it to construct fetch URLs.
vi.stubGlobal('API_URL', '/api/test');

// Sample Data
const samplePlannedMoves: PlannedMove[] = [
  { actorId: 101, startPos: { x: 0, y: 0 }, endPos: { x: 1, y: 0 } },
  { actorId: 102, startPos: { x: 1, y: 1 }, endPos: { x: 2, y: 1 } },
];

const sampleWorld: World = {
  id: 1,
  terrain: [[0]],
  actors: [
    { id: 101, owner: 1, pos: {x:0,y:0} },
    { id: 102, owner: 2, pos: {x:1,y:0} },
  ],
};

describe('GameView.vue', () => {
  let wrapper: VueWrapper<any>;
  let mockGamesStore: any;
  let mockUserStore: any;

  // Helper to mount the component with fresh mocks for props
  const mountComponent = () => {
    return mount(GameView, {
      global: {
        // Stub child components so their internal setup (which references
        // stores or router) does not run during these shallow integration
        // tests. We assert presence by component name below.
        stubs: {
          HexGrid: true,
          OrderSubmission: true,
          RouterLink: true,
        },
      },
    });
  };

  beforeEach(() => {
    // Reset mocks for each test
    vi.clearAllMocks();

    mockGamesStore = {
      getCurrentGame: vi.fn(() => ({
        gameId: 1,
        turn: 1,
        world: sampleWorld,
        playerCount: 2,
        maxPlayers: 2,
        hostPlayerId: 1,
        gameState: 'IN_PROGRESS',
      })),
      getCurrentPlayerId: vi.fn(() => 1),
      setCurrentGameTurn: vi.fn(),
      fetchTurnResults: vi.fn().mockResolvedValue({}),
      fetchGameDetails: vi.fn().mockResolvedValue({}),
      kickPlayer: vi.fn().mockResolvedValue({}),
      transferHost: vi.fn().mockResolvedValue({}),
      startGame: vi.fn().mockResolvedValue({}),
    };
    (useGamesStore as any).mockReturnValue(mockGamesStore);

    mockUserStore = {
      user: { name: 'Test User' },
    };
    (useUserStore as any).mockReturnValue(mockUserStore);

    // Default successful fetch mock
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  describe('Initial Rendering and Component Presence', () => {
    it('renders HexGrid and OrderSubmission components', () => {
      wrapper = mountComponent();
      expect(wrapper.findComponent({ name: 'HexGrid' }).exists()).toBe(true);
      expect(wrapper.findComponent({ name: 'OrderSubmission' }).exists()).toBe(true);
    });

    it('passes initial empty plannedMoves to OrderSubmission', () => {
      wrapper = mountComponent();
      const orderSubmissionComponent = wrapper.findComponent(OrderSubmission);
      expect(orderSubmissionComponent.props('plannedMoves')).toEqual([]);
    });

    it('highlights the current player in the player list', () => {
      wrapper = mountComponent();
      const playerItems = wrapper.findAll('.player-item');
      // sampleWorld includes owner 1, and mockUserStore has name 'Test User'
      // The "(You)" is now in a separate badge with class 'you-badge'
      const selfPlayerItem = playerItems.find(item =>
        item.text().includes('Test User') && item.find('.you-badge').exists()
      );
      expect(selfPlayerItem).toBeTruthy();
      expect(selfPlayerItem?.classes()).toContain('is-self');
    });
  });

  describe('move-planned Event Handling from HexGrid', () => {
    it('adds a move to plannedMoves and updates OrderSubmission props', async () => {
      wrapper = mountComponent();
      const hexGridComponent = wrapper.findComponent({ name: 'HexGrid' });
      const newMove: PlannedMove = { actorId: 103, startPos: { x: 3, y: 3 }, endPos: { x: 4, y: 4 } };

      await hexGridComponent.vm.$emit('move-planned', newMove);
      await wrapper.vm.$nextTick(); // Wait for reactivity

      expect(wrapper.vm.plannedMoves).toEqual([newMove]);
      const orderSubmissionComponent = wrapper.findComponent({ name: 'OrderSubmission' });
      expect(orderSubmissionComponent.props('plannedMoves')).toEqual([newMove]);
    });
  });

  describe('remove-move Event Handling from OrderSubmission', () => {
    it('removes a move from plannedMoves and updates OrderSubmission props', async () => {
      wrapper = mountComponent();
      // Pre-populate plannedMoves
      wrapper.vm.plannedMoves = [...samplePlannedMoves];
      await wrapper.vm.$nextTick();

      const orderSubmissionComponent = wrapper.findComponent({ name: 'OrderSubmission' });
      // Ensure prop is updated before emitting
      expect(orderSubmissionComponent.props('plannedMoves')).toEqual(samplePlannedMoves);

      const moveToRemove = samplePlannedMoves[0];
      await orderSubmissionComponent.vm.$emit('remove-move', moveToRemove);
      await wrapper.vm.$nextTick();

      const expectedMoves = [samplePlannedMoves[1]];
      expect(wrapper.vm.plannedMoves).toEqual(expectedMoves);
      expect(orderSubmissionComponent.props('plannedMoves')).toEqual(expectedMoves);
    });
  });

  describe('clear-all Event Handling from OrderSubmission', () => {
    it('clears all moves from plannedMoves when clear-all is emitted', async () => {
      wrapper = mountComponent();
      wrapper.vm.plannedMoves = [...samplePlannedMoves];
      await wrapper.vm.$nextTick();

      const orderSubmissionComponent = wrapper.findComponent({ name: 'OrderSubmission' });
      await orderSubmissionComponent.vm.$emit('clear-all');
      await wrapper.vm.$nextTick();

      expect(wrapper.vm.plannedMoves).toEqual([]);
      expect(orderSubmissionComponent.props('plannedMoves')).toEqual([]);
    });
  });

  describe('submit-orders Event Handling and postOrders Call', () => {
    beforeEach(() => {
        wrapper = mountComponent();
        // Pre-populate plannedMoves for submission tests
        wrapper.vm.plannedMoves = [...samplePlannedMoves];
        // Mock getCurrentGame to return specific IDs for URL construction
        mockGamesStore.getCurrentGame.mockReturnValue({
            gameId: 1,
            turn: 1,
            world: sampleWorld, // Or a more detailed one if needed for other parts of GameView
            playerCount: 2,
            maxPlayers: 2,
            hostPlayerId: 1,
            gameState: 'IN_PROGRESS',
        });
        mockGamesStore.getCurrentPlayerId.mockReturnValue(1);
    });

    it('calls fetch with correct details and clears moves on successful submission', async () => {
      const orderSubmissionComponent = wrapper.findComponent({ name: 'OrderSubmission' });
      await orderSubmissionComponent.vm.$emit('submit-orders', [...samplePlannedMoves]);
      await flushPromises(); // Wait for postOrders async and fetch

      const expectedBody = {
        orders: samplePlannedMoves.map(pm => ({
          actorId: pm.actorId,
          toQ: pm.endPos.x,
          toR: pm.endPos.y,
        })),
      };

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/games/1/turns/1/players/1`),
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(expectedBody),
        })
      );
      expect(wrapper.vm.plannedMoves).toEqual([]); // Moves cleared
      expect(wrapper.find('.success-message').text()).toContain('Orders submitted successfully!');
      expect(wrapper.find('.success-message .status-icon').exists()).toBe(true);
    });

    it('shows loading state during submission', async () => {
      let resolveFetch: any;
      (global.fetch as any).mockReturnValue(new Promise(resolve => {
        resolveFetch = resolve;
      }));

      const orderSubmissionComponent = wrapper.findComponent(OrderSubmission);
      orderSubmissionComponent.vm.$emit('submit-orders', [...samplePlannedMoves]);

      await wrapper.vm.$nextTick();
      expect(wrapper.vm.isSubmitting).toBe(true);
      expect(orderSubmissionComponent.props('isSubmitting')).toBe(true);

      resolveFetch({
        ok: true,
        json: async () => ({ success: true }),
      });
      await flushPromises();
      expect(wrapper.vm.isSubmitting).toBe(false);
    });

    it('calls fetch and does NOT clear moves on failed submission', async () => {
      // Mock fetch to simulate an API error
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ message: 'Test API Error' }),
      });
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});


      const orderSubmissionComponent = wrapper.findComponent(OrderSubmission);
      await orderSubmissionComponent.vm.$emit('submit-orders', [...samplePlannedMoves]);
      await flushPromises();

      expect(global.fetch).toHaveBeenCalledTimes(1); // fetch was still called
      expect(wrapper.vm.plannedMoves).toEqual(samplePlannedMoves); // Moves NOT cleared
      expect(wrapper.find('.error-message').text()).toContain('Failed to submit orders: Test API Error');
      expect(wrapper.find('.error-message .status-icon').exists()).toBe(true);
      expect(consoleErrorSpy).toHaveBeenCalled(); // Check if error was logged

      consoleErrorSpy.mockRestore();
    });

     it('does not call fetch if no orders to submit (e.g. moves array is empty)', async () => {
        wrapper.vm.plannedMoves = []; // Ensure no moves
        await wrapper.vm.$nextTick();

        const orderSubmissionComponent = wrapper.findComponent(OrderSubmission);
        // Even if event is emitted with empty array, postOrders has a guard
        await orderSubmissionComponent.vm.$emit('submit-orders', []);
        await flushPromises();

        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('does not call fetch if game details are missing', async () => {
        mockGamesStore.getCurrentGame.mockReturnValue({ gameId: null, turn: 1, world: sampleWorld }); // Missing gameId
        wrapper.unmount() // remount with new store state
        wrapper = mountComponent()
        wrapper.vm.plannedMoves = [...samplePlannedMoves];
        await wrapper.vm.$nextTick();

        const orderSubmissionComponent = wrapper.findComponent(OrderSubmission);
        await orderSubmissionComponent.vm.$emit('submit-orders', [...samplePlannedMoves]);
        await flushPromises();

        expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('lobby host controls', () => {
    beforeEach(() => {
      mockGamesStore.getCurrentGame.mockReturnValue({
        gameId: 1,
        turn: 1,
        world: sampleWorld,
        playerCount: 2,
        maxPlayers: 4,
        hostPlayerId: 1,
        gameState: 'LOBBY',
      });
      wrapper = mountComponent();
    });

    it('shows start, transfer, and kick controls for the host in the lobby', () => {
      expect(wrapper.find('.start-game-btn').exists()).toBe(true);
      expect(wrapper.findAll('.transfer-host-btn').length).toBe(1);
      expect(wrapper.findAll('.kick-player-btn').length).toBe(1);
      expect(wrapper.findComponent({ name: 'OrderSubmission' }).exists()).toBe(false);
      expect(wrapper.findAll('.player-item')[0].text()).not.toContain('Kick');
      expect(wrapper.findAll('.player-item')[0].text()).not.toContain('Make Host');
      expect(wrapper.findAll('.player-item')[1].text()).toContain('Kick');
      expect(wrapper.findAll('.player-item')[1].text()).toContain('Make Host');
    });

    it('calls store actions for host lobby controls', async () => {
      await wrapper.find('.transfer-host-btn').trigger('click');
      expect(mockGamesStore.transferHost).toHaveBeenCalledWith(1, 2);

      await wrapper.find('.kick-player-btn').trigger('click');
      expect(mockGamesStore.kickPlayer).toHaveBeenCalledWith(1, 2);

      await wrapper.find('.start-game-btn').trigger('click');
      expect(mockGamesStore.startGame).toHaveBeenCalledWith(1);
    });

    it('shows a spinner in the Start Game button when starting', async () => {
      wrapper.vm.isStartingGame = true;
      await wrapper.vm.$nextTick();
      const startGameBtn = wrapper.find('.start-game-btn');
      expect(startGameBtn.find('.btn-spinner.spinning').exists()).toBe(true);
      expect(startGameBtn.text()).toContain('Starting...');
    });
  });

  describe('Keyboard Shortcuts and Refresh UI', () => {
    it('refreshes the game when R is pressed', async () => {
      wrapper = mountComponent();
      const event = new KeyboardEvent('keydown', { key: 'r' });
      window.dispatchEvent(event);
      expect(mockGamesStore.fetchGameDetails).toHaveBeenCalledWith(1);
    });

    it('displays the refresh shortcut hint and last-refreshed in the header', () => {
      wrapper = mountComponent();
      const refreshContainer = wrapper.find('.header-container .refresh-container');
      expect(refreshContainer.exists()).toBe(true);
      expect(refreshContainer.find('kbd').text()).toBe('R');
      expect(refreshContainer.find('.last-refreshed').exists()).toBe(true);
    });
  });
});
