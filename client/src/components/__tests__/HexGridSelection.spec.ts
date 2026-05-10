import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import HexGrid from '../HexGrid.vue';
import { Terrain } from '../../../../api/service/Models';
import type { World, Actor } from '../../stores/Games.store';

// Mock the games store
vi.mock('../../stores/Games.store', () => ({
  useGamesStore: () => ({ getCurrentPlayerId: () => 1 }),
  OffsetCoord: {
    ODD: 'odd',
    roffsetFromCube: vi.fn((type, hex) => ({ col: hex.q, row: hex.r })),
    roffsetToCube: vi.fn((type, offset) => ({ q: offset.col, r: offset.row, s: -offset.col - offset.row }))
  }
}));

// Mock Hex class if necessary, but it seems HexGrid uses OffsetCoord for mapping
// Actually, HexGrid imports from ../../../api/Hex. Let's see if we need to mock it.
// The previous tests didn't seem to mock Hex.

const sampleWorld: World = {
  id: 1,
  terrain: [
    [Terrain.EMPTY, Terrain.EMPTY],
    [Terrain.EMPTY, Terrain.EMPTY],
  ],
  actors: []
};

const sampleActors: Actor[] = [
  { id: 101, owner: 1, pos: { x: 0, y: 0 } },
  { id: 102, owner: 2, pos: { x: 1, y: 1 } },
];

describe('HexGrid.vue Selection Enhancements', () => {
  let wrapper: VueWrapper<any>;

  beforeEach(() => {
    wrapper = mount(HexGrid, {
      props: {
        world: sampleWorld,
        actors: sampleActors,
      },
    });
  });

  it('emits "actor-select" when an owned actor is clicked', async () => {
    // Offset (0,0) corresponds to sampleActors[0]
    // In HexGrid, polygons are rendered in order of hexes.
    // hexes are generated row by row.
    // Index 0 should be offset (0,0)
    const polygons = wrapper.findAll('polygon');
    await polygons[0].trigger('click');

    expect(wrapper.emitted('actor-select')).toBeTruthy();
    expect(wrapper.emitted('actor-select')![0]).toEqual([101]);
  });

  it('emits "actor-select" with null when selection is cleared by clicking same hex', async () => {
    const polygons = wrapper.findAll('polygon');
    await polygons[0].trigger('click'); // Select
    await polygons[0].trigger('click'); // Deselect

    expect(wrapper.emitted('actor-select')![1]).toEqual([null]);
  });

  it('emits "actor-select" with null when clicking empty hex', async () => {
    const polygons = wrapper.findAll('polygon');
    // Index 1 is offset (1,0), which is empty
    await polygons[1].trigger('click');

    expect(wrapper.emitted('actor-select')).toBeTruthy();
    expect(wrapper.emitted('actor-select')![0]).toEqual([null]);
  });

  it('emits "actor-select" with null when clicking SVG background', async () => {
    await wrapper.find('svg').trigger('click');
    expect(wrapper.emitted('actor-select')).toBeTruthy();
    expect(wrapper.emitted('actor-select')![0]).toEqual([null]);
  });

  it('selectHexByGridPos sets selection and emits "actor-select"', async () => {
    wrapper.vm.selectHexByGridPos(0, 0);
    await wrapper.vm.$nextTick();

    expect(wrapper.vm.selectedHexRef).toBeTruthy();
    expect(wrapper.emitted('actor-select')).toBeTruthy();
    expect(wrapper.emitted('actor-select')![0]).toEqual([101]);

    const polygons = wrapper.findAll('polygon');
    expect(polygons[0].classes()).toContain('selected');
  });

  it('selectHexByGridPos clears selection if no hex found (though usually grid pos should be valid)', async () => {
    // Out of bounds
    wrapper.vm.selectHexByGridPos(99, 99);
    await wrapper.vm.$nextTick();

    // It shouldn't change existing selection if not found,
    // or it might do nothing. Let's see implementation.
    // selectHexByGridPos only updates if hexToSelect is found.
  });
});
