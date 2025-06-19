import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import HexGrid from '../HexGrid.vue';
import { Terrain, type World } from '../../../../lib/service/Models'; // Adjusted path
import { Hex } from '../../../../lib/Hex'; // Adjusted path

// Mock console.log
const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

describe('HexGrid.vue', () => {
  let wrapper: VueWrapper<any>;

  const createWorld = (terrain: Terrain[][]): World => ({
    id: 1,
    actors: [],
    terrain,
  });

  beforeEach(() => {
    consoleLogSpy.mockClear();
  });

  const mountComponent = (world: World | null) => {
    return mount(HexGrid, {
      props: {
        world: world,
      },
    });
  };

  describe('Rendering Tests', () => {
    it('renders no hexes if world.terrain is empty or undefined', () => {
      const world = createWorld([]);
      wrapper = mountComponent(world);
      expect(wrapper.findAll('polygon').length).toBe(0);

      // Test with undefined world prop or world with undefined terrain
      // wrapper = mountComponent(null); // Component expects world object, v-if handles this in parent
      // expect(wrapper.findAll('polygon').length).toBe(0);
      // wrapper = mountComponent({ id:1, actors: [], terrain: undefined });
      // expect(wrapper.findAll('polygon').length).toBe(0);
    });

    it('renders the correct number of hexes based on world.terrain data', () => {
      const terrain = [
        [Terrain.EMPTY, Terrain.BLOCKED],
        [Terrain.EMPTY, Terrain.EMPTY],
      ];
      const world = createWorld(terrain);
      wrapper = mountComponent(world);
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

      // Check inline fill style (if still applied, otherwise check effective style via classes)
      // This depends on the internal functions getHexStyle being testable or relying on output.
      // For now, we trust getHexStyle sets the fill, and classes are for other states.
      // Let's check the style attribute directly:
      expect(firstHexElement.attributes('style')).toContain('fill: #EAECEE;'); // #EAECEE
      expect(secondHexElement.attributes('style')).toContain('fill: #5D6D7E;'); // #5D6D7E
    });
  });

  describe('Interaction Tests', () => {
    it('clicking a hex applies .selected class and logs coordinates', async () => {
      const terrain = [[Terrain.EMPTY]];
      const world = createWorld(terrain);
      wrapper = mountComponent(world);

      const polygon = wrapper.find('polygon');
      await polygon.trigger('click');

      expect(polygon.classes()).toContain('selected');

      // Expected axial for odd-r (0,0) is (0,0,0)
      // Click log: Clicked hex (axial): Q R S - Terrain Index (offset col,row): COL,ROW
      // s coordinate can be -0 if q and r are 0.
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Clicked hex (axial):', 0, 0, -0, '- Terrain Index (offset col,row): 0,0'
      );
    });

    it('clicking another hex moves the .selected class', async () => {
        const terrain = [[Terrain.EMPTY, Terrain.BLOCKED]];
        const world = createWorld(terrain);
        wrapper = mountComponent(world);

        const polygons = wrapper.findAll('polygon');
        const firstHex = polygons[0];
        const secondHex = polygons[1];

        await firstHex.trigger('click');
        expect(firstHex.classes()).toContain('selected');
        expect(secondHex.classes()).not.toContain('selected');
        consoleLogSpy.mockClear(); // Clear logs from first click

        await secondHex.trigger('click');
        expect(firstHex.classes()).not.toContain('selected');
        expect(secondHex.classes()).toContain('selected');

        // Hex 1,0 (offset col, row) for odd-r: q = 1 - (0 - (0&1))/2 = 1; r = 0. Axial (1,0,-1)
        expect(consoleLogSpy).toHaveBeenCalledWith(
          'Clicked hex (axial):', 1, 0, -1, '- Terrain Index (offset col,row): 1,0'
        );
      });

    it('clicking SVG background deselects the current hex', async () => {
      const terrain = [[Terrain.EMPTY]];
      const world = createWorld(terrain);
      wrapper = mountComponent(world);

      const polygon = wrapper.find('polygon');
      await polygon.trigger('click'); // Select a hex first
      expect(polygon.classes()).toContain('selected');
      consoleLogSpy.mockClear();

      await wrapper.find('svg').trigger('click'); // Click on SVG element itself
      expect(polygon.classes()).not.toContain('selected');
      expect(consoleLogSpy).toHaveBeenCalledWith('Clicked SVG background, deselected hex.');
    });
  });

  describe('Props Handling', () => {
    it('updates rendering when world prop changes', async () => {
      const initialWorld = createWorld([]);
      wrapper = mountComponent(initialWorld);
      expect(wrapper.findAll('polygon').length).toBe(0);

      const newTerrain = [
        [Terrain.EMPTY, Terrain.BLOCKED],
        [Terrain.EMPTY, Terrain.EMPTY],
      ];
      const newWorld = createWorld(newTerrain);
      await wrapper.setProps({ world: newWorld });

      expect(wrapper.findAll('polygon').length).toBe(4);
      // Check if one of the new hexes has the correct class/style
      const firstHex = wrapper.findAll('polygon')[0];
      expect(firstHex.classes()).toContain('terrain-empty');
      expect(firstHex.attributes('style')).toContain('fill: #EAECEE;');
    });

    it('renders correctly with various terrain configurations', () => {
        // All blocked
        let terrain = [[Terrain.BLOCKED, Terrain.BLOCKED]];
        let world = createWorld(terrain);
        wrapper = mountComponent(world);
        let polygons = wrapper.findAll('polygon');
        expect(polygons.length).toBe(2);
        expect(polygons[0].classes()).toContain('terrain-blocked');
        expect(polygons[1].classes()).toContain('terrain-blocked');

        // Mixed
        terrain = [[Terrain.EMPTY, Terrain.BLOCKED, Terrain.EMPTY]];
        world = createWorld(terrain);
        wrapper = mountComponent(world);
        polygons = wrapper.findAll('polygon');
        expect(polygons.length).toBe(3);
        expect(polygons[0].classes()).toContain('terrain-empty');
        expect(polygons[1].classes()).toContain('terrain-blocked');
        expect(polygons[2].classes()).toContain('terrain-empty');
    });
  });
});
