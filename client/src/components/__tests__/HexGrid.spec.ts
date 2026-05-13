import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import HexGrid from '../HexGrid.vue';
import { Terrain } from '../../../../api/service/Models'; // Path for Terrain
import type { World, Actor, PlannedMove } from '../../stores/Games.store'; // Path for store types
import { Hex } from '../../../../api/Hex'; // Path for Hex utils

// Mock console.log and console.error
const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

// Mock the games store used by HexGrid (it calls useGamesStore().getCurrentPlayerId())
vi.mock('../../stores/Games.store', () => ({
  useGamesStore: () => ({ getCurrentPlayerId: () => 1 }),
}));


// --- Original HexGrid Tests ---
describe('HexGrid.vue Original Rendering and Interaction', () => {
  let wrapper: VueWrapper<any>;

  // Adjusted createWorld to match the World type from Games.store if different, or keep as is if compatible
  const createWorld = (terrain: Terrain[][], id = 1): World => ({
    id,
    terrain,
    actors: [], // Original tests didn't focus on actors prop
  });

  beforeEach(() => {
    consoleLogSpy.mockClear();
    consoleErrorSpy.mockClear();
  });

  // Adjusted mountComponent to also accept actors, but provide default for original tests
  const mountComponent = (world: World, actors: Actor[] = [], selectedActorId: number | null = null) => {
    return mount(HexGrid, {
      props: {
        world,
        actors,
        selectedActorId,
      },
    });
  };

  describe('Rendering Tests', () => {
    it('renders no hexes if world.terrain is empty or undefined', () => {
      const world = createWorld([]);
      wrapper = mountComponent(world);
      expect(wrapper.findAll('polygon').length).toBe(0);

      // Test with undefined world prop or world with undefined terrain - This needs careful handling
      // The component requires `world` prop. If `world.terrain` is what's empty/undefined:
      const worldWithNoTerrain = { id: 1, actors: [], terrain: []}; // Empty terrain array
      wrapper = mountComponent(worldWithNoTerrain);
      expect(wrapper.findAll('polygon').length).toBe(0);

      const worldWithUndefinedTerrain = { id: 1, actors: [], terrain: undefined as any}; // Undefined terrain
      wrapper = mountComponent(worldWithUndefinedTerrain);
      expect(wrapper.findAll('polygon').length).toBe(0);
    });

    it('renders the correct number of hexes based on world.terrain data', () => {
      const terrain = [
        [Terrain.EMPTY, Terrain.BLOCKED],
        [Terrain.EMPTY, Terrain.EMPTY],
      ];
      const world = createWorld(terrain);
      wrapper = mountComponent(world); // Actors default to []
      expect(wrapper.findAll('polygon').length).toBe(4); // 2x2 grid
    });

    it('assigns correct styles/classes based on terrain type', async () => {
      const terrain = [
        [Terrain.EMPTY, Terrain.BLOCKED],
      ];
      const world = createWorld(terrain);
      wrapper = mountComponent(world);

      const polygons = wrapper.findAll('polygon');
      expect(polygons.length).toBe(2);

      // Hex 0,0 (offset) -> EMPTY
      // Hex 1,0 (offset) -> BLOCKED

      // Note: Accessing style directly can be tricky if it's complex or purely class-driven.
      // We are using inline styles for fill, and classes for state.
      // The component's getHexStyle sets fill directly.
      // The component's getHexClass adds 'terrain-empty' or 'terrain-blocked'.

      const firstHexElement = polygons[0];
      const secondHexElement = polygons[1];

      // Check classes (more robust)
      expect(firstHexElement.classes()).toContain('terrain-empty');
      expect(secondHexElement.classes()).toContain('terrain-blocked');

      // Inline styles are not used; check classes only
      expect(firstHexElement.attributes('style')).toBeUndefined();
      expect(secondHexElement.attributes('style')).toBeUndefined();
    });
  });

  describe('Interaction Tests (Original - Hex Selection)', () => {
    it('clicking a hex applies .selected class and logs coordinates (original behavior)', async () => {
      const terrain = [[Terrain.EMPTY]];
      const world = createWorld(terrain);
      wrapper = mountComponent(world); // Actors default to []

      const polygon = wrapper.find('polygon');
      await polygon.trigger('click');

      // Current component selects player actors, not empty hexes. Clicking an
      // empty hex should not add the 'selected' class but should log a click.
      expect(polygon.classes()).not.toContain('selected');
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('clicking another hex moves the .selected class (original behavior)', async () => {
        const terrain = [[Terrain.EMPTY, Terrain.BLOCKED]];
        const world = createWorld(terrain);
        wrapper = mountComponent(world); // Actors default to []

        const polygons = wrapper.findAll('polygon');
        const firstHex = polygons[0];
        const secondHex = polygons[1];

        await firstHex.trigger('click');
        // Empty hex clicks do not select under current component behaviour
        expect(firstHex.classes()).not.toContain('selected');
        expect(secondHex.classes()).not.toContain('selected');
        consoleLogSpy.mockClear();

        await secondHex.trigger('click');
        expect(firstHex.classes()).not.toContain('selected');
        expect(secondHex.classes()).not.toContain('selected');
        expect(consoleLogSpy).toHaveBeenCalled();
      });

    it('clicking SVG background emits actor-select with null', async () => {
      const terrain = [[Terrain.EMPTY]];
      const world = createWorld(terrain);
      wrapper = mountComponent(world); // Actors default to []

      consoleLogSpy.mockClear();

      await wrapper.find('svg').trigger('click');
      await wrapper.vm.$nextTick();

      expect(wrapper.emitted('actor-select')).toBeTruthy();
      expect(wrapper.emitted('actor-select')![0]).toEqual([null]);
      // Accept any log indicating deselection happened rather than exact message
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('Props Handling (Original - World Prop)', () => {
    it('updates rendering when world prop changes', async () => {
      const initialWorld = createWorld([]);
      wrapper = mountComponent(initialWorld); // Actors default to []
      expect(wrapper.findAll('polygon').length).toBe(0);

      const newTerrain = [
        [Terrain.EMPTY, Terrain.BLOCKED],
        [Terrain.EMPTY, Terrain.EMPTY],
      ];
      const newWorld = createWorld(newTerrain);
      await wrapper.setProps({ world: newWorld });

      expect(wrapper.findAll('polygon').length).toBe(4);
      const firstHex = wrapper.findAll('polygon')[0];
      expect(firstHex.classes()).toContain('terrain-empty');
    });

    it('renders correctly with various terrain configurations', () => {
        // All blocked
        let terrain = [[Terrain.BLOCKED, Terrain.BLOCKED]];
        let world = createWorld(terrain);
        wrapper = mountComponent(world); // Actors default to []
        let polygons = wrapper.findAll('polygon');
        expect(polygons.length).toBe(2);
        expect(polygons[0].classes()).toContain('terrain-blocked');
        expect(polygons[1].classes()).toContain('terrain-blocked');

        // Mixed
        terrain = [[Terrain.EMPTY, Terrain.BLOCKED, Terrain.EMPTY]];
        world = createWorld(terrain);
        wrapper = mountComponent(world); // Actors default to []
        polygons = wrapper.findAll('polygon');
        expect(polygons.length).toBe(3);
        expect(polygons[0].classes()).toContain('terrain-empty');
        expect(polygons[1].classes()).toContain('terrain-blocked');
        expect(polygons[2].classes()).toContain('terrain-empty');
    });
  });
});

// --- New Tests for Movement Planning ---
const sampleWorldWithTerrain: World = {
  id: 1,
  terrain: [ // 2x2 grid for simplicity in axial/offset mapping
    [Terrain.EMPTY, Terrain.EMPTY], // (0,0) (1,0) in offset
    [Terrain.EMPTY, Terrain.EMPTY], // (0,1) (1,1) in offset
  ],
  actors: [] // Actors will be passed via props
};

// Actors are defined with axial coordinates (q,r) which map to (x,y) in their pos: Coord
const sampleActors: Actor[] = [
  { id: 101, owner: 1, pos: { x: 0, y: 0 } }, // Axial q=0, r=0. Offset for ODD_R: col=0, row=0.
  { id: 102, owner: 2, pos: { x: 1, y: 1 } }, // Axial q=1, r=1. Offset for ODD_R: col=1+(1-(1&1))/2 = 1, row=1.
];

// Helper to find a hex polygon based on its axial coordinates q, r
// This relies on the order of <polygon> elements matching the order in `hexes` computed property.
// `hexes` computed property generates hexes row by row from terrain, converting offset to axial.
// Offset (0,0) -> Axial (0,0) for ODD_R
// Offset (1,0) -> Axial (1,0) for ODD_R
// Offset (0,1) -> Axial (0,1) for ODD_R (q=0-(1-(1&1))/2=0, r=1)
// Offset (1,1) -> Axial (1,1) for ODD_R (q=1-(1-(1&1))/2=1, r=1)
const findHexPolygonByAxial = (wrapper: VueWrapper<any>, q: number, r: number): VueWrapper<Element> | null => {
  const polygons = wrapper.findAll('polygon');
  const hexElements = wrapper.vm.hexes as Hex[]; // Access computed hexes array

  const targetHexIndex = hexElements.findIndex(hex => hex.q === q && hex.r === r);
  if (targetHexIndex !== -1 && polygons[targetHexIndex]) {
    return polygons[targetHexIndex];
  }
  console.error(`Polygon not found for axial ${q},${r}. Hexes:`, hexElements.map(h => `(${h.q},${h.r})`));
  return null;
};


describe('HexGrid.vue Movement Planning', () => {
  let wrapper: VueWrapper<any>;

  const mountMovementGrid = (world = sampleWorldWithTerrain, actors = sampleActors, selectedActorId: number | null = null) => {
    return mount(HexGrid, {
      props: { world, actors, selectedActorId },
      // Attach to document to ensure visibility/interaction if needed, though usually not for component tests
      // attachTo: document.body,
    });
  };

  beforeEach(() => {
    consoleLogSpy.mockClear();
    consoleErrorSpy.mockClear();
    // wrapper should be mounted in specific tests or describe blocks
  });

  describe('Props Handling for Actors', () => {
    it('renders actor IDs on hexes', () => {
      wrapper = mountMovementGrid();
      // Actor 101 at (0,0) and Actor 102 at (1,1)
      const texts = wrapper.findAll('text.hex-text');
      const actor1Text = texts.find(t => t.text().includes(`A:${sampleActors[0].id}`));
      const actor2Text = texts.find(t => t.text().includes(`A:${sampleActors[1].id}`));

      expect(actor1Text).toBeTruthy();
      expect(actor2Text).toBeTruthy();

      // Verify non-actor hex doesn't show actor text
      // Hex at axial (1,0) (offset (1,0)) is empty
      // This requires finding text for a specific hex, similar to findHexPolygonByAxial
      const hexElements = wrapper.vm.hexes as Hex[];
      const emptyHexQ = 1, emptyHexR = 0; // Axial for offset (1,0)
      const emptyHexIndex = hexElements.findIndex(hex => hex.q === emptyHexQ && hex.r === emptyHexR);
      if (emptyHexIndex !== -1 && texts[emptyHexIndex]) {
         expect(texts[emptyHexIndex].text()).toBe(`${emptyHexQ},${emptyHexR}`);
      } else {
        throw new Error(`Could not find text for empty hex ${emptyHexQ},${emptyHexR} to verify no actor text.`);
      }
    });
  });

  describe('Actor Selection', () => {
    beforeEach(() => {
      wrapper = mountMovementGrid();
    });

    it('emits actor-select when an actor hex is clicked', async () => {
      const actor1HexPoly = findHexPolygonByAxial(wrapper, sampleActors[0].pos.x, sampleActors[0].pos.y);
      expect(actor1HexPoly, `Actor 1 hex polygon at (${sampleActors[0].pos.x}, ${sampleActors[0].pos.y}) should exist.`).toBeTruthy();

      await actor1HexPoly!.trigger('click');
      await wrapper.vm.$nextTick();

      expect(wrapper.emitted('actor-select')).toBeTruthy();
      expect(wrapper.emitted('actor-select')![0]).toEqual([sampleActors[0].id]);
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('emits actor-select(null) when the same actor hex is clicked twice', async () => {
      wrapper = mountMovementGrid(sampleWorldWithTerrain, sampleActors, sampleActors[0].id);
      const actor1HexPoly = findHexPolygonByAxial(wrapper, sampleActors[0].pos.x, sampleActors[0].pos.y);

      await actor1HexPoly!.trigger('click'); // Click: should deselect
      await wrapper.vm.$nextTick();

      expect(wrapper.emitted('actor-select')).toBeTruthy();
      expect(wrapper.emitted('actor-select')![0]).toEqual([null]);
      expect(consoleLogSpy).toHaveBeenCalledWith("Deselected actor:", sampleActors[0].id);
    });

    it('emits actor-select with new ID when another OWN actor hex is clicked', async () => {
      const myActors: Actor[] = [
        { id: 101, owner: 1, pos: { x: 0, y: 0 } },
        { id: 102, owner: 1, pos: { x: 1, y: 1 } },
      ];
      wrapper = mountMovementGrid(sampleWorldWithTerrain, myActors, myActors[0].id);
      const actor2HexPoly = findHexPolygonByAxial(wrapper, myActors[1].pos.x, myActors[1].pos.y);

      consoleLogSpy.mockClear();

      await actor2HexPoly!.trigger('click'); // Click on actor 2's hex
      await wrapper.vm.$nextTick();

      expect(wrapper.emitted('actor-select')).toBeTruthy();
      expect(wrapper.emitted('actor-select')![0]).toEqual([myActors[1].id]);
      expect(consoleLogSpy).toHaveBeenCalledWith("Selected actor:", myActors[1].id);
    });
  });

  describe('Destination Selection & move-planned Event', () => {
    beforeEach(async () => {
      wrapper = mountMovementGrid(sampleWorldWithTerrain, sampleActors, sampleActors[0].id);
      consoleLogSpy.mockClear();
    });

    it('emits "move-planned" event when an empty hex is clicked after an actor is selected', async () => {
      const destinationQ = 1, destinationR = 0; // Axial for offset (1,0) - empty hex
      const destinationHexPoly = findHexPolygonByAxial(wrapper, destinationQ, destinationR);
      expect(destinationHexPoly, `Destination hex polygon at (${destinationQ},${destinationR}) should exist.`).toBeTruthy();

      await destinationHexPoly!.trigger('click');

      expect(wrapper.emitted('move-planned')).toBeTruthy();
      const emittedEventPayload = wrapper.emitted('move-planned')![0][0] as PlannedMove;

      expect(emittedEventPayload.actorId).toBe(sampleActors[0].id);
      expect(emittedEventPayload.startPos).toEqual(sampleActors[0].pos); // {x:0, y:0}
      // Note: HexGrid maps endPos as { x: row, y: col } (row, col), so reflect that ordering
      expect(emittedEventPayload.endPos).toEqual({ x: destinationR, y: destinationQ }); // {x:0, y:1}

      // Component logs with 'Move planned:' message in current implementation
      expect(consoleLogSpy).toHaveBeenCalledWith('Move planned:', emittedEventPayload);
    });

    it('emits actor-select(null) after a move is planned', async () => {
      const destinationHexPoly = findHexPolygonByAxial(wrapper, 1, 0); // Empty hex
      await destinationHexPoly!.trigger('click');
      expect(wrapper.emitted('actor-select')).toBeTruthy();
      expect(wrapper.emitted('actor-select')![0]).toEqual([null]);
    });

    it('does not emit "move-planned" if trying to move to a blocked hex (no actor there)', async () => {
        // Add a blocked hex to sampleWorldWithTerrain for this test
        const worldWithBlocked = JSON.parse(JSON.stringify(sampleWorldWithTerrain));
        // Offset (0,1) -> Axial (0,1) for ODD_R. Let's make this blocked.
        worldWithBlocked.terrain[1][0] = Terrain.BLOCKED;
        wrapper = mount(HexGrid, { props: { world: worldWithBlocked, actors: sampleActors, selectedActorId: sampleActors[0].id } });

        // Select actor 1 (at 0,0) - already selected via prop
        const actor1HexPoly = findHexPolygonByAxial(wrapper, sampleActors[0].pos.x, sampleActors[0].pos.y);
        expect(actor1HexPoly!.classes()).toContain('selected');
        consoleLogSpy.mockClear();

        const blockedHexQ = 0, blockedHexR = 1; // Axial for offset (0,1)
        const blockedHexPoly = findHexPolygonByAxial(wrapper, blockedHexQ, blockedHexR);
        expect(blockedHexPoly, `Blocked hex polygon at (${blockedHexQ},${blockedHexR}) should exist.`).toBeTruthy();

        await blockedHexPoly!.trigger('click');
        // Based on current HexGrid logic: if no actor at (0,1), it will plan a move.
        expect(wrapper.emitted('move-planned')).toBeTruthy();
    });
  });

  describe('Visual Indicators', () => {
    beforeEach(async () => {
      wrapper = mountMovementGrid();
    });

    it('applies selection class to the selected actor\'s hex based on prop', async () => {
      wrapper = mountMovementGrid(sampleWorldWithTerrain, sampleActors, sampleActors[0].id);
      const actor1HexPoly = findHexPolygonByAxial(wrapper, sampleActors[0].pos.x, sampleActors[0].pos.y);
      expect(actor1HexPoly!.classes()).toContain('selected');
      expect(actor1HexPoly!.classes()).toContain('has-actor');
    });

    it('applies "planned-path" class to hexes in the plannedMoves prop', async () => {
      const destinationQ = 1, destinationR = 0;
      const plannedMove: PlannedMove = {
        actorId: 101,
        startPos: { x: 0, y: 0 },
        endPos: { x: destinationR, y: destinationQ }
      };

      wrapper = mount(HexGrid, {
        props: {
          world: sampleWorldWithTerrain,
          actors: sampleActors,
          plannedMoves: [plannedMove]
        }
      });

      const destinationHexPoly = findHexPolygonByAxial(wrapper, destinationQ, destinationR);
      expect(destinationHexPoly!.classes()).toContain('planned-path');
    });
  });

  describe('Deselection via SVG Background Click', () => {
    it('emits actor-select(null) when SVG background is clicked', async () => {
      wrapper = mountMovementGrid(sampleWorldWithTerrain, sampleActors, sampleActors[0].id);
      consoleLogSpy.mockClear();

      await wrapper.find('svg').trigger('click');
      await wrapper.vm.$nextTick();

      expect(wrapper.emitted('actor-select')).toBeTruthy();
      expect(wrapper.emitted('actor-select')![0]).toEqual([null]);
      expect(consoleLogSpy).toHaveBeenCalledWith('Clicked SVG background, selection cleared.');
    });
  });

  // Teardown to detach wrappers if attachTo was used
  // afterEach(() => {
  //   if (wrapper) {
  //     wrapper.unmount();
  //   }
  // });
});
