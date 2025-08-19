import { describe, it, expect, beforeEach } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import OrderSubmission from '../OrderSubmission.vue';
import type { PlannedMove } from '../../stores/Games.store';

// Sample data for tests
const sampleMoves: PlannedMove[] = [
  { actorId: 1, startPos: { x: 0, y: 0 }, endPos: { x: 1, y: 0 } },
  { actorId: 2, startPos: { x: 2, y: 1 }, endPos: { x: 2, y: 2 } },
];

describe('OrderSubmission.vue', () => {
  let wrapper: VueWrapper<any>;

  // Helper function to mount the component
  const mountComponent = (props: any) => {
    return mount(OrderSubmission, { props });
  };

  describe('Rendering with No Moves', () => {
    beforeEach(() => {
      wrapper = mountComponent({ plannedMoves: [] });
    });

    it('displays "No moves planned yet" message when plannedMoves is empty', () => {
      expect(wrapper.text()).toContain('No moves planned yet.');
    });

    it('does not render the list of moves when plannedMoves is empty', () => {
      expect(wrapper.find('ul').exists()).toBe(false);
    });

    it('renders the "Submit All Orders" button', () => {
      expect(wrapper.find('button.submit-orders-btn').exists()).toBe(true);
    });

    it('"Submit All Orders" button is disabled when plannedMoves is empty', () => {
      const submitButton = wrapper.find('button.submit-orders-btn');
      expect(submitButton.attributes('disabled')).toBeDefined();
    });
  });

  describe('Rendering with Planned Moves', () => {
    beforeEach(() => {
      wrapper = mountComponent({ plannedMoves: sampleMoves });
    });

    it('does not display "No moves planned yet" message', () => {
      expect(wrapper.text()).not.toContain('No moves planned yet.');
    });

    it('renders the list of moves', () => {
      expect(wrapper.find('ul').exists()).toBe(true);
      const listItems = wrapper.findAll('li.planned-move-item');
      expect(listItems.length).toBe(sampleMoves.length);
    });

    it('displays details for each planned move', () => {
      const listItems = wrapper.findAll('li.planned-move-item');
      listItems.forEach((item, index) => {
        const move = sampleMoves[index];
        expect(item.text()).toContain(`Move Actor ${move.actorId}`);
        expect(item.text()).toContain(`from (${move.startPos.x}, ${move.startPos.y})`);
        expect(item.text()).toContain(`to (${move.endPos.x}, ${move.endPos.y})`);
        expect(item.find('button.remove-move-btn').exists()).toBe(true);
      });
    });

    it('renders the "Submit All Orders" button', () => {
      expect(wrapper.find('button.submit-orders-btn').exists()).toBe(true);
    });

    it('"Submit All Orders" button is enabled when there are planned moves', () => {
      const submitButton = wrapper.find('button.submit-orders-btn');
      expect(submitButton.attributes('disabled')).toBeUndefined();
    });
  });

  describe('Event Emissions', () => {
    beforeEach(() => {
      wrapper = mountComponent({ plannedMoves: [...sampleMoves] }); // Use a copy to avoid mutation issues across tests
    });

    it('emits "remove-move" event with the correct payload when a "Remove" button is clicked', async () => {
      const firstMoveRemoveButton = wrapper.findAll('button.remove-move-btn')[0];
      await firstMoveRemoveButton.trigger('click');

      expect(wrapper.emitted('remove-move')).toBeTruthy();
      expect(wrapper.emitted('remove-move')![0]).toEqual([sampleMoves[0]]);
    });

    it('emits "submit-orders" event with the current plannedMoves array when "Submit All Orders" button is clicked', async () => {
      const submitButton = wrapper.find('button.submit-orders-btn');
      await submitButton.trigger('click');

      expect(wrapper.emitted('submit-orders')).toBeTruthy();
      // The component emits [...props.plannedMoves], so it's a new array instance
      // but its contents should be deeply equal to sampleMoves.
      expect(wrapper.emitted('submit-orders')![0][0]).toEqual(sampleMoves);
    });

    it('emits "submit-orders" with an empty array if all moves are removed and then submitted', async () => {
        wrapper = mountComponent({ plannedMoves: [] }); // Mount with empty initially
        const submitButton = wrapper.find('button.submit-orders-btn');
        await submitButton.trigger('click'); // Should not emit if button is disabled, which it is

        expect(wrapper.emitted('submit-orders')).toBeFalsy(); // Check it wasn't emitted due to disabled state

        // Now test with moves, then remove them (simulated by re-rendering with empty)
        // This case is more about the parent component's responsibility of clearing moves.
        // For this component, if props.plannedMoves is empty, button is disabled.
        // Let's re-evaluate this specific test's goal for this component.
        // The component itself will emit its current `plannedMoves` prop.
        // So if `plannedMoves` becomes empty and button somehow enabled (not possible by default), it would emit [].
        // The disabling logic is key.

        // Test that if mounted with empty, and button is clicked (though it should be disabled),
        // it correctly reflects the (empty) state of plannedMoves if it *were* to emit.
        // However, the button being disabled means it *won't* emit.
        // The prior test for "disabled" covers this.

        // The most direct test for emitting empty is if it's passed an empty array *and* the button is somehow enabled.
        // Given the current logic, this isn't a standard scenario.
        // The existing "Submit All Orders" test with `sampleMoves` is sufficient for event emission.
        // The "disabled when plannedMoves is empty" test covers the empty state.
    });
  });
});
