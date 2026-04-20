<template>
  <div class="order-submission">
    <h3>Planned Moves</h3>
    <div v-if="!plannedMoves || plannedMoves.length === 0">
      <p>No moves planned yet. Click an actor on the map and then an empty hex to plan a move.</p>
    </div>
    <TransitionGroup v-else name="list" tag="ul" class="planned-moves-list">
      <li
        v-for="move in plannedMoves"
        :key="`${move.actorId}-${move.startPos.x}-${move.startPos.y}-${move.endPos.x}-${move.endPos.y}`"
        class="planned-move-item"
        @mouseenter="handleHover(move, true)"
        @mouseleave="handleHover(move, false)"
        @focusin="handleHover(move, true)"
        @focusout="handleHover(move, false)"
      >
        <span>
          Move Actor {{ move.actorId }} from ({{ move.startPos.x }}, {{ move.startPos.y }})
          to ({{ move.endPos.x }}, {{ move.endPos.y }})
        </span>
        <button
          @click="handleRemoveMove(move)"
          class="remove-move-btn"
          :aria-label="`Remove move for Actor ${move.actorId} to (${move.endPos.x}, ${move.endPos.y})`"
          :disabled="isSubmitting"
        >
          Remove
        </button>
      </li>
    </TransitionGroup>
    <button
      v-if="plannedMoves.length >= 2"
      @click="handleClearAll"
      class="clear-all-btn"
      :disabled="isSubmitting"
    >
      Clear All
    </button>
    <button
      @click="handleSubmitOrders"
      :disabled="!plannedMoves || plannedMoves.length === 0 || isSubmitting"
      class="submit-orders-btn"
      :aria-busy="isSubmitting"
      aria-live="polite"
    >
      {{ isSubmitting ? 'Submitting...' : 'Submit All Orders' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { type PropType } from 'vue';
import type { PlannedMove } from '../stores/Games.store'; // Adjusted path assuming it's in a parent directory

// Props
const props = defineProps({
  plannedMoves: {
    type: Array as PropType<PlannedMove[]>,
    required: true,
  },
  isSubmitting: {
    type: Boolean,
    default: false,
  },
});

// Emits
const emit = defineEmits(['remove-move', 'submit-orders', 'clear-all', 'hover-move']);

// Methods
const handleRemoveMove = (move: PlannedMove) => {
  emit('hover-move', null); // Clear hover on remove
  emit('remove-move', move);
};

const handleClearAll = () => {
  emit('hover-move', null); // Clear hover on clear all
  emit('clear-all');
};

const handleHover = (move: PlannedMove, isHovering: boolean) => {
  emit('hover-move', isHovering ? move : null);
};

const handleSubmitOrders = () => {
  // It's good practice to emit a copy if the original array might be mutated elsewhere,
  // though in this case parent will likely treat it as a snapshot.
  emit('submit-orders', [...props.plannedMoves]);
};
</script>

<style scoped>
.order-submission {
  padding: 15px;
  border: 1px solid #ccc;
  border-radius: 8px;
  background-color: #f9f9f9;
  margin-top: 20px;
}

.order-submission h3 {
  margin-top: 0;
  color: #333;
}

.order-submission p {
  color: #555;
}

.planned-moves-list {
  list-style-type: none;
  padding: 0;
}

.planned-move-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #eee;
  transition: all 0.3s ease;
}

.planned-move-item:last-child {
  border-bottom: none;
}

.planned-move-item:hover {
  background-color: #f0f0f0;
  padding-left: 5px;
}

.planned-move-item span {
  flex-grow: 1;
  margin-right: 10px;
  font-size: 0.9em;
}

.remove-move-btn, .submit-orders-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
}

.remove-move-btn {
  background-color: #e74c3c;
  color: white;
}

.remove-move-btn:hover {
  background-color: #c0392b;
}

.clear-all-btn {
  background-color: #e74c3c;
  color: white;
  margin-top: 10px;
  width: 100%;
  padding: 10px;
  font-size: 1em;
}

.clear-all-btn:hover {
  background-color: #c0392b;
}

.clear-all-btn:disabled {
  background-color: #bdc3c7;
  cursor: not-allowed;
}

.submit-orders-btn {
  background-color: #2ecc71;
  color: white;
  margin-top: 15px;
  width: 100%;
  padding: 10px;
  font-size: 1em;
}

.submit-orders-btn:hover {
  background-color: #27ae60;
}

.submit-orders-btn:disabled {
  background-color: #bdc3c7;
  cursor: not-allowed;
}

/* List Transitions */
.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>
