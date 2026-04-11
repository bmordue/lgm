import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import HexGrid from '../HexGrid.vue';
import { Terrain } from '../../../../api/service/Models';
import type { World, Actor } from '../../stores/Games.store';

// Mock the games store
vi.mock('../../stores/Games.store', () => ({
  useGamesStore: () => ({
    getCurrentPlayerId: () => 1
  }),
  OffsetCoord: {
    ODD: -1,
    roffsetToCube: vi.fn((type, coord) => ({ q: coord.col, r: coord.row, s: -coord.col - coord.row })),
    roffsetFromCube: vi.fn((type, hex) => ({ col: hex.q, row: hex.r })),
    qoffsetToCube: vi.fn((type, coord) => ({ q: coord.col, r: coord.row, s: -coord.col - coord.row })),
  }
}));

const sampleWorld: World = {
  id: 1,
  terrain: [[Terrain.EMPTY, Terrain.BLOCKED]],
  actors: []
};

const sampleActors: Actor[] = [
  { id: 101, owner: 1, pos: { x: 0, y: 0 } }
];

describe('HexGrid.vue accessibility', () => {
  it('renders hexes with correct accessibility attributes', () => {
    const wrapper = mount(HexGrid, {
      props: { world: sampleWorld, actors: sampleActors }
    });

    const hexGroups = wrapper.findAll('g[role="button"]');
    expect(hexGroups.length).toBe(2);

    hexGroups.forEach(group => {
      expect(group.attributes('tabindex')).toBe('0');
      expect(group.attributes('aria-label')).toBeDefined();
    });

    // Check specific aria-label for actor hex
    const actorHex = hexGroups.find(g => g.attributes('aria-label')?.includes('Actor 101'));
    expect(actorHex).toBeTruthy();
    expect(actorHex?.attributes('aria-label')).toContain('Yours');
    expect(actorHex?.find('polygon').classes()).toContain('is-own-actor');

    // Check specific aria-label for blocked hex
    const blockedHex = hexGroups.find(g => g.attributes('aria-label')?.includes('Blocked'));
    expect(blockedHex).toBeTruthy();
  });

  it('renders hexes with planned destination in aria-label', () => {
    const plannedMoves = [{
      actorId: 101,
      startPos: { x: 0, y: 0 },
      endPos: { x: 0, y: 1 } // (col, row) -> (1, 0)
    }];
    const wrapper = mount(HexGrid, {
      props: { world: sampleWorld, actors: sampleActors, plannedMoves }
    });

    const hexGroups = wrapper.findAll('g[role="button"]');
    const plannedHex = hexGroups.find(g => g.attributes('aria-label')?.includes('Planned destination for Actor 101'));
    expect(plannedHex).toBeTruthy();
  });

  it('triggers handleHexClick on Enter key press', async () => {
    const wrapper = mount(HexGrid, {
      props: { world: sampleWorld, actors: sampleActors }
    });

    const hexGroup = wrapper.find('g[role="button"]');

    // We can't easily spy on handleHexClick because it's inside setup
    // but we can check if it logs something as the original code does.
    const consoleSpy = vi.spyOn(console, 'log');

    await hexGroup.trigger('keydown', { key: 'Enter' });
    expect(consoleSpy).toHaveBeenCalled();
  });
});
