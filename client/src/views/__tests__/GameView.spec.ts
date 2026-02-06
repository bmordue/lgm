import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises, VueWrapper } from '@vue/test-utils';
import GameView from '../GameView.vue';
import HexGrid from '@/components/HexGrid.vue';
import OrderSubmission from '@/components/OrderSubmission.vue';
import type { PlannedMove, Order, Actor, World } from '@/stores/Games.store'; // Assuming World is also needed for store mock
import { useUserStore } from '@/stores/User.store';
import { useGamesStore } from '@/stores/Games.store';

// Mock Pinia stores
vi.mock('@/stores/User.store');
vi.mock('@/stores/Games.store');

// Mock global fetch
global.fetch = vi.fn();

// Stub API_URL (imported in GameView.vue from @/main)
// GameView.vue uses it to construct fetch URLs.
vi.stubGlobal('API_URL', '/api/test');

// Sample Data
const samplePlannedMoves: PlannedMove[] = [
  { actorId: 101, startPos: { x: 0, y: 0 }, endPos: { x: 1, y: 0 } },
  { actorId: 102, startPos: { x: 1, y: 1 }, endPos: { x: 2, y: 1 } },
];

const sampleActor: Actor = { id: 101, owner: 1, pos: {x:0,y:0} };
const sampleWorld: World = { id: 1, terrain: [[0]], actors: [sampleActor] };

describe('GameView.vue', () => {
  let wrapper: VueWrapper<any>;
  let mockUserStore: any;
  let mockGamesStore: any;

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
          'router-link': true,
        },
      },
    });
  };

  beforeEach(() => {
    // Reset mocks for each test
    vi.clearAllMocks();

    // Provide default implementations for store mocks
    mockUserStore = {
      getToken: vi.fn(() => 'test-token-123'),
    };
    (useUserStore as any).mockReturnValue(mockUserStore);

    mockGamesStore = {
      getCurrentGame: vi.fn(() => ({
        gameId: 'g1',
        turn: 1,
        world: sampleWorld,
        playerCount: 1,
        maxPlayers: 2,
      })),
      getCurrentPlayerId: vi.fn(() => 'p1'),
      // games: [], // if GameView tries to access games list for some reason
      // gameTurns: [],
    };
    (useGamesStore as any).mockReturnValue(mockGamesStore);

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

  describe('submit-orders Event Handling and postOrders Call', () => {
    beforeEach(() => {
        wrapper = mountComponent();
        // Pre-populate plannedMoves for submission tests
        wrapper.vm.plannedMoves = [...samplePlannedMoves];
        // Mock getCurrentGame to return specific IDs for URL construction
        mockGamesStore.getCurrentGame.mockReturnValue({
            gameId: 'g1',
            turn: 1,
            world: sampleWorld, // Or a more detailed one if needed for other parts of GameView
            playerCount: 1,
            maxPlayers: 2,
        });
        mockGamesStore.getCurrentPlayerId.mockReturnValue('p1');
    });

    it('calls fetch with correct details and clears moves on successful submission', async () => {
      const orderSubmissionComponent = wrapper.findComponent({ name: 'OrderSubmission' });
      await orderSubmissionComponent.vm.$emit('submit-orders', [...samplePlannedMoves]);
      await flushPromises(); // Wait for postOrders async and fetch

      const expectedUrl = `/api/test/games/g1/turns/1/players/p1`;
      const expectedBody = {
        orders: samplePlannedMoves.map(pm => ({
          actorId: pm.actorId,
          toQ: pm.endPos.x,
          toR: pm.endPos.y,
        })),
      };

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/games/g1/turns/1/players/p1`),
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-token-123',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(expectedBody),
        })
      );
      expect(wrapper.vm.plannedMoves).toEqual([]); // Moves cleared
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
});
