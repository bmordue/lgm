import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import HexGrid from '../HexGrid.vue';
import { Terrain } from '../../../../api/service/Models';
import type { World, Actor, PlannedMove } from '../../stores/Games.store';
import { Hex } from '../../../../api/Hex';

vi.mock('../../stores/Games.store', () => ({
  useGamesStore: () => ({ getCurrentPlayerId: () => 1 }),
}));

const sampleWorld: World = {
  id: 1,
  terrain: [[Terrain.EMPTY, Terrain.EMPTY]],
  actors: []
};

const sampleActors: Actor[] = [
  { id: 101, owner: 1, pos: { x: 0, y: 0 } },
];

const samplePlannedMoves: PlannedMove[] = [
  { actorId: 101, startPos: { x: 0, y: 0 }, endPos: { x: 0, y: 1 } }
];

describe('HexGrid.vue Highlighting Emits', () => {
  let wrapper: VueWrapper<any>;

  beforeEach(() => {
    wrapper = mount(HexGrid, {
      props: {
        world: sampleWorld,
        actors: sampleActors,
        plannedMoves: samplePlannedMoves
      },
    });
  });

  it('emits actor-hover and player-hover when an actor hex is hovered', async () => {
    const hexGroups = wrapper.findAll('g');
    // Hex at 0,0 has actor 101
    await hexGroups[0].trigger('mouseenter');

    expect(wrapper.emitted('actor-hover')).toBeTruthy();
    expect(wrapper.emitted('actor-hover')![0]).toEqual([101]);
    expect(wrapper.emitted('player-hover')).toBeTruthy();
    expect(wrapper.emitted('player-hover')![0]).toEqual([1]);
  });

  it('emits move-hover when a planned destination hex is hovered', async () => {
    const hexGroups = wrapper.findAll('g');
    // Hex at 0,1 is destination for move
    await hexGroups[1].trigger('mouseenter');

    expect(wrapper.emitted('move-hover')).toBeTruthy();
    expect(wrapper.emitted('move-hover')![0]).toEqual([samplePlannedMoves[0]]);
  });

  it('emits null values when mouse leaves', async () => {
    const hexGroups = wrapper.findAll('g');
    await hexGroups[0].trigger('mouseenter');
    await hexGroups[0].trigger('mouseleave');

    expect(wrapper.emitted('actor-hover')![1]).toEqual([null]);
    expect(wrapper.emitted('player-hover')![1]).toEqual([null]);
    expect(wrapper.emitted('move-hover')![0]).toEqual([null]);
  });
});
