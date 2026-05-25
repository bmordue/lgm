<template>
  <div class="order-submission">
    <h3>Planned Moves ({{ plannedMoves.length }})</h3>

    <div v-if="selectedActorId !== null" class="selection-guidance" :class="{ 'is-enemy': !selectedActorOwned }">
      <p v-if="selectedActorOwned">
        <strong>Unit Selected:</strong> Actor {{ selectedActorId }} (Yours)
        <span style="display: block; font-size: 0.9em; font-weight: bold; margin-top: 4px">
          HP: {{ selectedActorHealth }}/{{ selectedActorMaxHealth }}
        </span>
        <span class="guidance-hint">Click an empty hex on the map to plan a move.</span>
      </p>
      <p v-else>
        <strong>Tactical Insight:</strong> Actor {{ selectedActorId }} (Enemy)
        <span style="display: block; font-size: 0.9em; font-weight: bold; margin-top: 4px">
          HP: {{ selectedActorHealth }}/{{ selectedActorMaxHealth }}
        </span>
        <span class="guidance-hint">Enemy units cannot receive orders.</span>
      </p>
      <button type="button" @click="$emit('deselect-actor')" class="cancel-selection-btn" :aria-label="`Cancel selection of Actor ${selectedActorId}`">Cancel selection</button>
    </div>

    <div v-if="(!plannedMoves || plannedMoves.length === 0) && selectedActorId === null" class="empty-state">
      <p>No moves planned yet. Select a unit from the map or list to begin planning moves.</p>
    </div>

    <TransitionGroup v-if="plannedMoves && plannedMoves.length > 0" name="list" tag="ul" class="planned-moves-list">
      <li
        v-for="move in plannedMoves"
        :key="`${move.actorId}-${move.startPos.x}-${move.startPos.y}-${move.endPos.x}-${move.endPos.y}`"
        class="planned-move-item"
        :class="{ 'is-hovered': hoveredMove && isSameMove(move, hoveredMove) }"
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
          type="button"
          @click="handleRemoveMove(move)"
          class="remove-move-btn"
          :aria-label="`Remove move for Actor ${move.actorId} to (${move.endPos.x}, ${move.endPos.y})`"
          :disabled="isSubmitting"
        >
          Remove
        </button>
      </li>
    </TransitionGroup>

    <div v-if="plannedMoves.length >= 2" class="clear-all-container">
      <template v-if="!isConfirmingClear">
        <button
          type="button"
          @click="handleClearAllClick"
          class="clear-all-btn"
          :disabled="isSubmitting"
          aria-label="Clear all planned moves"
        >
          Clear All
        </button>
      </template>
      <template v-else>
        <div class="confirmation-group" role="alert" aria-live="polite">
          <button
            ref="confirmButtonRef"
            type="button"
            @click="confirmClearAll"
            class="confirm-btn"
            :disabled="isSubmitting"
          >
            Confirm Clear
          </button>
          <button
            type="button"
            @click="cancelClear"
            class="cancel-btn"
            :disabled="isSubmitting"
          >
            Cancel
          </button>
        </div>
      </template>
    </div>

    <button
      type="button"
      @click="handleSubmitOrders"
      :disabled="!plannedMoves || plannedMoves.length === 0 || isSubmitting"
      class="submit-orders-btn"
      :aria-busy="isSubmitting"
      aria-live="polite"
      :title="(!plannedMoves || plannedMoves.length === 0) ? 'Plan at least one move to submit orders' : ''"
    >
      <svg
        v-if="isSubmitting"
        class="btn-spinner spinning"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
      </svg>
      {{ isSubmitting ? 'Submitting...' : 'Submit All Orders' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, type PropType } from 'vue';
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
  hoveredMove: {
    type: Object as PropType<PlannedMove | null>,
    default: null,
  },
  selectedActorId: {
    type: Number as PropType<number | null>,
    default: null,
  },
  selectedActorOwned: {
    type: Boolean,
    default: true,
  },
  selectedActorHealth: {
    type: Number,
    default: 100,
  },
  selectedActorMaxHealth: {
    type: Number,
    default: 100,
  },
});

// Emits
const emit = defineEmits(['remove-move', 'submit-orders', 'clear-all', 'hover-move', 'deselect-actor']);

const isConfirmingClear = ref(false);
const confirmButtonRef = ref<HTMLButtonElement | null>(null);

// Reset confirmation state if list changes
watch(() => props.plannedMoves.length, (newLength) => {
  if (newLength < 2) {
    isConfirmingClear.value = false;
  }
});

// Methods
const handleRemoveMove = (move: PlannedMove) => {
  emit('hover-move', null); // Clear hover on remove
  emit('remove-move', move);
};

const handleClearAllClick = () => {
  isConfirmingClear.value = true;
  nextTick(() => {
    confirmButtonRef.value?.focus();
  });
};

const cancelClear = () => {
  isConfirmingClear.value = false;
};

const confirmClearAll = () => {
  isConfirmingClear.value = false;
  emit('hover-move', null); // Clear hover on clear all
  emit('clear-all');
};

const handleHover = (move: PlannedMove, isHovering: boolean) => {
  emit('hover-move', isHovering ? move : null);
};

const isSameMove = (m1: PlannedMove, m2: PlannedMove) => {
  return m1.actorId === m2.actorId &&
         m1.startPos.x === m2.startPos.x && m1.startPos.y === m2.startPos.y &&
         m1.endPos.x === m2.endPos.x && m1.endPos.y === m2.endPos.y;
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
  font-size: 0.9em;
  line-height: 1.4;
}

.selection-guidance {
  padding: 10px;
  background-color: hsla(160, 100%, 37%, 0.1);
  border-left: 3px solid hsla(160, 100%, 37%, 1);
  border-radius: 4px;
  margin-bottom: 15px;
}

.selection-guidance.is-enemy {
  background-color: #fff3e0;
  border-left-color: #ff9800;
}

.selection-guidance p {
  margin: 0;
}

.guidance-hint {
  display: block;
  font-size: 0.85em;
  color: #666;
  margin-top: 4px;
}

.cancel-selection-btn {
  background: none;
  border: none;
  color: hsla(160, 100%, 37%, 1);
  padding: 0;
  font-size: 0.85em;
  font-weight: bold;
  cursor: pointer;
  text-decoration: underline;
  margin-top: 8px;
  display: inline-block;
  transition: color 0.2s;
}

.cancel-selection-btn:hover {
  color: hsla(160, 100%, 37%, 0.8);
}

.cancel-selection-btn:focus-visible {
  outline: 2px solid hsla(160, 100%, 37%, 1);
  outline-offset: 2px;
  border-radius: 2px;
}

.planned-moves-list {
  list-style-type: none;
  padding: 0;
  margin-bottom: 0;
}

.planned-move-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  border-bottom: 1px solid #eee;
  transition: all 0.3s ease;
  border-left: 3px solid transparent;
}

.planned-move-item:last-child {
  border-bottom: none;
}

.planned-move-item:hover, .planned-move-item.is-hovered {
  background-color: #f0f0f0;
  border-left-color: hsla(160, 100%, 37%, 1);
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
  transition: all 0.2s ease;
}

.remove-move-btn:active:not(:disabled), .submit-orders-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.remove-move-btn:focus-visible, .submit-orders-btn:focus-visible, .clear-all-btn:focus-visible {
  outline: 2px solid hsla(160, 100%, 37%, 1);
  outline-offset: 2px;
}

.remove-move-btn {
  background-color: #e74c3c;
  color: white;
}

.remove-move-btn:hover {
  background-color: #c0392b;
}

.clear-all-container {
  margin-top: 10px;
}

.clear-all-btn, .confirm-btn, .cancel-btn {
  width: 100%;
  padding: 10px;
  font-size: 1em;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-all-btn:active:not(:disabled), .confirm-btn:active:not(:disabled), .cancel-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.confirm-btn:focus-visible, .cancel-btn:focus-visible {
  outline: 2px solid hsla(160, 100%, 37%, 1);
  outline-offset: 2px;
}

.clear-all-btn {
  background-color: #e74c3c;
  color: white;
}

.clear-all-btn:hover {
  background-color: #c0392b;
}

.clear-all-btn:disabled {
  background-color: #bdc3c7;
  cursor: not-allowed;
}

.confirmation-group {
  display: flex;
  gap: 10px;
}

.confirm-btn {
  background-color: #e74c3c;
  color: white;
  flex: 2;
}

.confirm-btn:hover {
  background-color: #c0392b;
}

.cancel-btn {
  background-color: #95a5a6;
  color: white;
  flex: 1;
}

.cancel-btn:hover {
  background-color: #7f8c8d;
}

.confirm-btn:disabled, .cancel-btn:disabled {
  background-color: #bdc3c7;
  cursor: not-allowed;
}

.submit-orders-btn {
  background-color: hsla(160, 100%, 37%, 1);
  color: white;
  margin-top: 15px;
  width: 100%;
  padding: 10px;
  font-size: 1em;
  transition: all 0.2s ease;
}

.submit-orders-btn:hover:not(:disabled) {
  background-color: hsla(160, 100%, 37%, 0.8);
}

.submit-orders-btn:disabled {
  background-color: #bdc3c7;
  cursor: not-allowed;
}

.empty-state {
  margin-bottom: 10px;
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
