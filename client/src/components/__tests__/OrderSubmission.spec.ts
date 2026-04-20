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

    it('does not render the "Clear All" button when plannedMoves is empty', () => {
      expect(wrapper.find('button.clear-all-btn').exists()).toBe(false);
    });
  });

  describe('Rendering with 1 Planned Move', () => {
    beforeEach(() => {
      wrapper = mountComponent({ plannedMoves: [sampleMoves[0]] });
    });

    it('does not render the "Clear All" button when there is only 1 move', () => {
      expect(wrapper.find('button.clear-all-btn').exists()).toBe(false);
    });
  });

  describe('Rendering with 2+ Planned Moves', () => {
    beforeEach(() => {
      wrapper = mountComponent({ plannedMoves: sampleMoves });
    });

    it('does not display "No moves planned yet" message', () => {
      expect(wrapper.text()).not.toContain('No moves planned yet.');
    });

    it('renders the list of moves', () => {
      // TransitionGroup uses .planned-moves-list class
      expect(wrapper.find('.planned-moves-list').exists()).toBe(true);
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

    it('renders the "Clear All" button when there are 2 or more moves', () => {
      expect(wrapper.find('button.clear-all-btn').exists()).toBe(true);
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

    it('emits "clear-all" event when "Clear All" button is clicked', async () => {
      const clearAllButton = wrapper.find('button.clear-all-btn');
      await clearAllButton.trigger('click');

      expect(wrapper.emitted('clear-all')).toBeTruthy();
    });

    it('emits "hover-move" when a move item is hovered', async () => {
      const firstMoveItem = wrapper.find('li.planned-move-item');
      await firstMoveItem.trigger('mouseenter');
      expect(wrapper.emitted('hover-move')).toBeTruthy();
      expect(wrapper.emitted('hover-move')![0]).toEqual([sampleMoves[0]]);

      await firstMoveItem.trigger('mouseleave');
      expect(wrapper.emitted('hover-move')![1]).toEqual([null]);
    });
  });
});
