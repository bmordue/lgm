import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import OrderSubmission from '../OrderSubmission.vue';
import type { PlannedMove } from '../../stores/Games.store';

const sampleMoves: PlannedMove[] = [
  { actorId: 101, startPos: { x: 0, y: 0 }, endPos: { x: 1, y: 0 } },
  { actorId: 102, startPos: { x: 2, y: 1 }, endPos: { x: 2, y: 2 } },
];

describe('OrderSubmission.vue accessibility', () => {
  it('renders "Remove" button with correct aria-label for each move', () => {
    const wrapper = mount(OrderSubmission, {
      props: { plannedMoves: sampleMoves }
    });

    const removeButtons = wrapper.findAll('button.remove-move-btn');
    expect(removeButtons.length).toBe(sampleMoves.length);

    sampleMoves.forEach((move, index) => {
      const expectedAriaLabel = `Remove move for Actor ${move.actorId} to (${move.endPos.x}, ${move.endPos.y})`;
      expect(removeButtons[index].attributes('aria-label')).toBe(expectedAriaLabel);
    });
  });
});
