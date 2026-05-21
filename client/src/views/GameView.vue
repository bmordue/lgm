<script setup lang="ts">
import { ref, watchEffect, watch, nextTick, onMounted, onUnmounted, computed } from 'vue'
import HexGrid from '@/components/HexGrid.vue';
import OrderSubmission from '@/components/OrderSubmission.vue'; // Import OrderSubmission
import { useGamesStore, type Actor, type PlannedMove, type Order } from '../stores/Games.store' // Import PlannedMove and Order
import { API_URL } from '@/config';

interface GameData {
  gameId?: number | null;
  turn?: number;
  world?: any;
  playerCount?: number;
  maxPlayers?: number;
}

const game = ref<GameData>({})
const isRefreshing = ref(false);
const selectedActorId = ref<number | null>(null);
const plannedMoves = ref<PlannedMove[]>([]); // Reactive state for planned moves
const hoveredMove = ref<PlannedMove | null>(null); // State for hovered move
const hoveredActorId = ref<number | null>(null); // New state for hovered actor
const hoveredPlayerId = ref<number | null>(null); // New state for hovered player
const isSubmitting = ref(false);
const submissionError = ref('');
const submissionSuccess = ref('');
const copySuccess = ref(false);

const gamesStore = useGamesStore();

watchEffect(async () => {
  game.value = gamesStore.getCurrentGame();
});

watch(selectedActorId, async (newId) => {
  if (newId !== null) {
    await nextTick();
    const selectedElement = document.querySelector('.actor-item.is-selected');
    if (selectedElement) {
      selectedElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }
});

const isSelectedActorOwned = computed(() => {
  if (selectedActorId.value === null) return true;
  const actor = game.value.world?.actors?.find((a: Actor) => a.id === selectedActorId.value);
  return actor ? actor.owner === gamesStore.getCurrentPlayerId() : true;
});

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    selectedActorId.value = null;
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});

const copyGameId = async () => {
  if (game.value.gameId) {
    try {
      await navigator.clipboard.writeText(game.value.gameId.toString());
      copySuccess.value = true;
      setTimeout(() => {
        copySuccess.value = false;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  }
};

const refreshGame = async () => {
  if (game.value.gameId) {
    isRefreshing.value = true;
    try {
      await gamesStore.fetchGameDetails(game.value.gameId);
      game.value = gamesStore.getCurrentGame();
    } finally {
      isRefreshing.value = false;
    }
  }
};

// --- Event Handlers for move planning ---
const selectActor = (actorId: number) => {
  if (selectedActorId.value === actorId) {
    selectedActorId.value = null;
  } else {
    selectedActorId.value = actorId;
  }
};

const handleMovePlanned = (move: PlannedMove) => {
  plannedMoves.value.push(move);
  console.log('Move planned:', move);
};

const handleRemoveMove = (moveToRemove: PlannedMove) => {
  plannedMoves.value = plannedMoves.value.filter(move =>
    !(move.actorId === moveToRemove.actorId &&
      move.startPos.x === moveToRemove.startPos.x && move.startPos.y === moveToRemove.startPos.y &&
      move.endPos.x === moveToRemove.endPos.x && move.endPos.y === moveToRemove.endPos.y)
  );
  console.log('Move removed:', moveToRemove);
};

const handleClearAll = () => {
  plannedMoves.value = [];
  console.log('All moves cleared');
};

const handleHoverMove = (move: PlannedMove | null) => {
  hoveredMove.value = move;
  hoveredActorId.value = move ? move.actorId : null;
};

const handleSubmitOrders = async (movesToSubmit: PlannedMove[]) => {
  console.log('Submitting orders:', movesToSubmit);
  await postOrders(movesToSubmit);
};
// --- End Event Handlers ---

function actorToString(actor :Actor) {
  return `Actor ${actor.id} at (${actor.pos.x}, ${actor.pos.y})`;
}

function getPlayerList() {
  if (!game.value.world?.actors) return [];
  const actors = game.value.world.actors as Actor[];
  const playerIds = [...new Set(actors.map((actor: Actor) => actor.owner))];
  return playerIds.map(id => ({ id, name: `Player ${id}` }));
}

async function postOrders(moves: PlannedMove[]) { // Modified signature
  const g = gamesStore.getCurrentGame();
  const playerId = gamesStore.getCurrentPlayerId();

  if (!g.gameId || playerId === null || g.turn === undefined) { // Check playerId for null and turn for undefined
    console.error("Game details not available for posting orders. GameID:", g.gameId, "PlayerID:", playerId, "Turn:", g.turn);
    return;
  }

  // Transform PlannedMove[] to Order[]
  const orders: Order[] = moves.map(pm => ({
    actorId: pm.actorId,
    toQ: pm.endPos.x, // Assuming endPos.x is q
    toR: pm.endPos.y  // Assuming endPos.y is r
  }));

  if (orders.length === 0) {
    console.log("No orders to submit.");
    return;
  }

  isSubmitting.value = true;
  submissionError.value = '';
  submissionSuccess.value = '';

  try {
    // URL updated: /orders suffix removed
    const response = await fetch(`${API_URL}/games/${g.gameId}/turns/${g.turn}/players/${playerId}`, {
      method: "POST",
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      // Body updated: orders array wrapped in an object { orders: orders }
      body: JSON.stringify({ orders: orders })
    });

    if (response.ok) {
      const responseBody = await response.json(); // Assuming response is JSON: { turnStatus: { complete: boolean, turn?: number } }
      console.log("Orders submitted successfully!", responseBody);
      plannedMoves.value = []; // Clear planned moves on success

      if (responseBody.turnStatus && responseBody.turnStatus.complete && typeof responseBody.turnStatus.turn === 'number') {
        const processedTurn = responseBody.turnStatus.turn;
        // The game advances on the server *after* processing `processedTurn`.
        // So, the new current turn for submitting orders should be `processedTurn + 1`.
        // We fetch results for the `processedTurn` to see its outcome.
        console.log(`Turn ${processedTurn} was processed. Game is now on turn ${processedTurn + 1}. Fetching results for turn ${processedTurn}.`);

        // Set current game turn to the turn that was just processed to fetch its results.
        // The watcher for game.value should update the UI.
        // Then, after fetching, we can advance the store's current turn if needed,
        // or rely on the next join/load to set the latest turn for new orders.
        // For now, let's fetch results for the turn that was just completed.
        // The `fetchTurnResults` uses `gamesStore.currentGameTurn`, so update it first.
        gamesStore.setCurrentGameTurn(processedTurn);
        await gamesStore.fetchTurnResults(); // Fetches for the just-completed turn

        // After fetching results of the processed turn, set the store's turn to the *next* turn,
        // so that subsequent actions (like submitting new orders) are for the correct, new turn.
        gamesStore.setCurrentGameTurn(processedTurn + 1);

      } else if (responseBody.turnStatus && !responseBody.turnStatus.complete) {
        console.log("Orders accepted, but turn is not yet complete. Waiting for other players.");
        // Optionally, refresh current turn data if desired, though it might not have changed much.
        // await gamesStore.fetchTurnResults();
      } else {
        // Fallback if turnStatus is not as expected, just refresh current view
        await gamesStore.fetchTurnResults();
      }

      submissionSuccess.value = "Orders submitted successfully!";
      setTimeout(() => {
        submissionSuccess.value = '';
      }, 3000);

      // Refresh game state
      const currentGameId = gamesStore.getCurrentGame().gameId;
      if (currentGameId) {
        // Assuming there's a method to fetch/refresh a specific game by ID
        // This might need to be implemented in Games.store.ts if not present
        // For now, let's simulate a refresh by re-assigning from the store,
        // assuming the store itself might have ways to update.
        // A more robust solution would be an explicit fetch action.
        await gamesStore.fetchGameDetails(currentGameId); // Hypothetical method
        game.value = gamesStore.getCurrentGame();
      }
    } else {
      const errorData = await response.json().catch(() => ({ message: "Failed to parse error response" }));
      console.error("Failed to submit orders:", response.status, errorData);
      submissionError.value = `Failed to submit orders: ${errorData.message || response.statusText}`;
    }
  } catch (error) {
    console.error("Error submitting orders:", error);
    submissionError.value = `Error submitting orders: ${error instanceof Error ? error.message : 'Unknown network error'}`;
  } finally {
    isSubmitting.value = false;
  }
}

</script>


<template>
    <RouterLink to="/dashboard" class="back-link">← Back to Dashboard</RouterLink>
    <div class="header-container" v-if="game.gameId !== undefined && game.gameId !== null">
      <div class="title-with-copy">
        <h1>Game #{{ game.gameId }}</h1>
        <button
          type="button"
          class="copy-btn"
          @click="copyGameId"
          :title="copySuccess ? 'Copied!' : 'Copy Game ID'"
          :aria-label="copySuccess ? 'Game ID copied to clipboard' : 'Copy Game ID to clipboard'"
        >
          <svg v-if="!copySuccess" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="hsla(160, 100%, 37%, 1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          <span v-if="copySuccess" class="copy-feedback" role="status">Copied!</span>
        </button>
      </div>
      <button
        type="button"
        class="refresh-btn"
        @click="refreshGame"
        :disabled="isRefreshing"
        aria-label="Refresh game state"
        title="Refresh game state"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          :class="{ 'spinning': isRefreshing }"
        >
          <path d="M23 4v6h-6"></path>
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
        </svg>
      </button>
    </div>
    <div class="game-info" v-if="game.gameId !== undefined && game.gameId !== null">
      <span class="turn-info">Turn {{ game.turn }}</span>
      <span class="player-info">Players: {{ game.playerCount }}/{{ game.maxPlayers }}</span>
    </div>
    
    <div class="game-content">
      <div class="left-panel">
        <h3>Players</h3>
        <div class="player-list">
          <button
            type="button"
            v-for="player in getPlayerList()"
            :key="`player-${player.id}`"
            class="player-item"
            :class="{
              'is-self': player.id === gamesStore.getCurrentPlayerId(),
              'is-hovered': player.id === hoveredPlayerId
            }"
            @mouseenter="hoveredPlayerId = player.id"
            @mouseleave="hoveredPlayerId = null"
            @focus="hoveredPlayerId = player.id"
            @blur="hoveredPlayerId = null"
          >
            {{ player.name }}{{ player.id === gamesStore.getCurrentPlayerId() ? ' (You)' : '' }}
          </button>
        </div>
        
        <!-- Order Submission Component -->
        <Transition name="fade">
          <div v-if="submissionError" class="error-message" role="alert" aria-live="assertive">
            {{ submissionError }}
          </div>
        </Transition>
        <Transition name="fade">
          <div v-if="submissionSuccess" class="success-message" role="status" aria-live="polite">
            {{ submissionSuccess }}
          </div>
        </Transition>
        <order-submission
          :planned-moves="plannedMoves"
          :is-submitting="isSubmitting"
          :hovered-move="hoveredMove"
          :selected-actor-id="selectedActorId"
          :selected-actor-owned="isSelectedActorOwned"
          @remove-move="handleRemoveMove"
          @clear-all="handleClearAll"
          @submit-orders="handleSubmitOrders"
          @hover-move="handleHoverMove"
          @deselect-actor="selectedActorId = null"
        />

        <div class="legend">
          <h4>Map Legend</h4>
          <ul class="legend-list">
            <li><span class="swatch terrain-empty" aria-hidden="true"></span> Empty</li>
            <li><span class="swatch terrain-blocked" aria-hidden="true"></span> Blocked</li>
            <li><span class="swatch terrain-unexplored" aria-hidden="true"></span> Unexplored</li>
            <li><span class="swatch is-own" aria-hidden="true"></span> Your Unit</li>
            <li><span class="swatch is-enemy" aria-hidden="true"></span> Enemy Unit</li>
            <li><span class="swatch is-selected" aria-hidden="true"></span> Selected</li>
            <li><span class="swatch is-planned" aria-hidden="true"></span> Planned Move</li>
          </ul>
        </div>
      </div>
      
      <div class="main-panel">
        <h3>World</h3>
        <div class="world-grid" v-if="game.world">
          <hex-grid
            :world="game.world"
            :actors="game.world?.actors || []"
            :planned-moves="plannedMoves"
            :hovered-move="hoveredMove"
            :hovered-actor-id="hoveredActorId"
            :hovered-player-id="hoveredPlayerId"
            :selected-actor-id="selectedActorId"
            @move-planned="handleMovePlanned"
            @actor-hover="hoveredActorId = ($event as any)"
            @player-hover="hoveredPlayerId = ($event as any)"
            @move-hover="hoveredMove = ($event as any)"
            @actor-select="selectedActorId = $event"
          />
        </div>
        <div v-else class="loading-state" role="status" aria-live="polite">
          <svg class="btn-spinner spinning" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
          </svg>
          Loading world data...
        </div>
        
        <h3>
          Actors ({{ game.world?.actors?.length || 0 }})
          <span v-if="selectedActorId" class="hint-text">(Esc to deselect)</span>
        </h3>
        <div class="actors-list">
          <button
            type="button"
            v-for="actor in game.world?.actors || []"
            :key="actor.id"
            class="actor-item"
            :class="{
              'is-self': actor.owner === gamesStore.getCurrentPlayerId(),
              'is-hovered': actor.id === hoveredActorId,
              'is-selected': actor.id === selectedActorId
            }"
            @mouseenter="hoveredActorId = actor.id"
            @mouseleave="hoveredActorId = null"
            @focus="hoveredActorId = actor.id"
            @blur="hoveredActorId = null"
            @click="selectActor(actor.id)"
          >
            {{ actorToString(actor) }}{{ actor.owner === gamesStore.getCurrentPlayerId() ? ' (You)' : '' }}{{ plannedMoves.some(m => m.actorId === actor.id) ? ' (Planned)' : '' }}
          </button>
        </div>
      </div>
    </div>
  </template>

<style scoped>
.game-info {
  display: flex;
  gap: 20px;
  margin: 10px 0 20px 0;
  padding: 10px;
  background: #f5f5f5;
  border-radius: 5px;
}

.turn-info, .player-info {
  font-weight: bold;
  color: #333;
}

.game-content {
  display: flex;
  gap: 20px;
}

.left-panel {
  width: 200px;
  flex-shrink: 0;
}

.main-panel {
  flex: 1;
}

.player-list {
  margin-bottom: 20px;
}

.player-item {
  display: block;
  width: 100%;
  text-align: left;
  font-family: inherit;
  font-size: 1em;
  padding: 8px;
  background: #e3f2fd;
  margin: 5px 0;
  border-radius: 4px;
  border: none;
  border-left: 3px solid #2196f3;
  cursor: pointer;
  transition: background-color 0.2s;
}

.player-item:hover, .player-item.is-hovered {
  background: #bbdefb;
}

.player-item:active:not(:disabled) {
  transform: scale(0.98);
}

.player-item:focus-visible {
  outline: 2px solid hsla(160, 100%, 37%, 1);
  outline-offset: 2px;
  background: #bbdefb;
}

.player-item.is-self {
  background: hsla(160, 100%, 37%, 0.1);
  border-left-color: hsla(160, 100%, 37%, 1);
  font-weight: bold;
}

.player-item.is-self:hover, .player-item.is-self:focus, .player-item.is-self.is-hovered {
  background: hsla(160, 100%, 37%, 0.2);
}

.error-message {
  background-color: #fce4e4;
  border: 1px solid #fcc2c2;
  color: #cc0000;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 15px;
  font-size: 0.9em;
}

.success-message {
  background-color: hsla(160, 100%, 37%, 0.1);
  border: 1px solid hsla(160, 100%, 37%, 1);
  color: hsla(160, 100%, 37%, 1);
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 15px;
  font-size: 0.9em;
  text-align: center;
}

.world-grid {
  /* font-family: monospace; // Keep or remove based on HexGrid's text styling */
  background: #f9f9f9;
  padding: 10px;
  border-radius: 5px;
  margin-bottom: 20px;
  position: relative; /* Added for potential future overlay elements within world-grid */
  /* The HexGrid component will manage its own internal layout and sizing. */
  /* Ensure this container doesn't overly constrain it or add conflicting styles. */
}

/* .terrain-row styling is no longer needed as HexGrid handles its own rendering. */

.actors-list {
  font-family: monospace;
  font-size: 0.9em;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 5px;
}

.actor-item {
  display: block;
  width: 100%;
  text-align: left;
  font-family: monospace;
  font-size: 0.9em;
  padding: 8px;
  margin: 5px 0;
  background: #fff3e0;
  border-radius: 4px;
  border: none;
  border-left: 3px solid #ff9800;
  cursor: pointer;
  transition: background-color 0.2s;
}

.actor-item:hover, .actor-item.is-hovered {
  background: #ffe0b2;
}

.actor-item:active:not(:disabled) {
  transform: scale(0.98);
}

.actor-item:focus-visible {
  outline: 2px solid hsla(160, 100%, 37%, 1);
  outline-offset: 2px;
  background: #ffe0b2;
}

.actor-item.is-selected {
  outline: 2px solid #c0392b;
  outline-offset: -2px;
}

.actor-item.is-self {
  background: hsla(160, 100%, 37%, 0.1);
  border-left-color: hsla(160, 100%, 37%, 1);
  font-weight: bold;
}

.actor-item.is-self:hover, .actor-item.is-self:focus, .actor-item.is-self.is-hovered {
  background: hsla(160, 100%, 37%, 0.2);
}

.loading-state {
  text-align: center;
  color: #666;
  font-style: italic;
  padding: 20px;
}

.legend {
  margin-top: 20px;
  padding: 12px;
  background: #f9f9f9;
  border: 1px solid #ccc;
  border-radius: 8px;
}

.legend h4 { margin: 0 0 10px 0; font-size: 0.9em; }
.legend-list { list-style: none; padding: 0; margin: 0; font-size: 0.8em; }
.legend-list li { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.swatch { width: 14px; height: 14px; border: 1px solid #34495E; flex-shrink: 0; border-radius: 2px; }
.swatch.terrain-empty { background: #EAECEE; }
.swatch.terrain-blocked { background: #5D6D7E; }
.swatch.terrain-unexplored { background: #2C3E50; }
.swatch.is-own { border: 2px solid hsla(160, 100%, 37%, 1); background: hsla(160, 100%, 37%, 0.1); }
.swatch.is-enemy { border: 2px solid #ff9800; background: rgba(255, 152, 0, 0.1); }
.swatch.is-selected { border: 2px solid #c0392b; }
.swatch.is-planned { background: rgba(230, 126, 34, 0.2); border: 1.5px dashed #d35400; }

h3 {
  color: #333;
  margin: 15px 0 10px 0;
}

.hint-text {
  font-size: 0.7em;
  font-weight: normal;
  color: #666;
  margin-left: 8px;
}

/* General button styling was here, OrderSubmission now has its own button styles.
   If there are other buttons in GameView that need styling, keep or adjust this.
   For now, I'll comment it out to avoid conflict if OrderSubmission's are the only ones.
button {
  background: #4caf50;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 5px;
  cursor: pointer;
  font-weight: bold;
}

button:hover {
  background: #45a049;
}
*/
.back-link {
  display: inline-block;
  margin-bottom: 10px;
  color: hsla(160, 100%, 37%, 1);
  text-decoration: none;
  font-weight: bold;
  transition: color 0.2s;
  border-radius: 4px;
}

.back-link:hover {
  color: hsla(160, 100%, 37%, 0.8);
  text-decoration: underline;
  background-color: hsla(160, 100%, 37%, 0.1);
}

.back-link:active {
  transform: scale(0.98);
}

.back-link:focus-visible {
  outline: 2px solid hsla(160, 100%, 37%, 1);
  outline-offset: 2px;
}

.header-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  min-height: 44px; /* Ensure height consistency when loading */
}

.title-with-copy {
  display: flex;
  align-items: center;
  gap: 10px;
}

.copy-btn {
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  position: relative;
  transition: all 0.2s ease;
}

.copy-btn:hover {
  background-color: hsla(160, 100%, 37%, 0.1);
  color: hsla(160, 100%, 37%, 1);
}

.copy-btn:active {
  transform: scale(0.98);
}

.copy-btn:focus-visible {
  outline: 2px solid hsla(160, 100%, 37%, 1);
  outline-offset: 2px;
}

.copy-feedback {
  position: absolute;
  top: -25px;
  left: 50%;
  transform: translateX(-50%);
  background: #333;
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.7em;
  white-space: nowrap;
  animation: fade-in-out 2s forwards;
}

@keyframes fade-in-out {
  0% { opacity: 0; transform: translate(-50%, 0); }
  10% { opacity: 1; transform: translate(-50%, -5px); }
  90% { opacity: 1; transform: translate(-50%, -5px); }
  100% { opacity: 0; transform: translate(-50%, 0); }
}

.refresh-btn {
  background: none;
  border: none;
  color: hsla(160, 100%, 37%, 1);
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.refresh-btn:hover:not(:disabled) {
  background-color: hsla(160, 100%, 37%, 0.1);
}

.refresh-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.refresh-btn:disabled {
  color: #ccc;
  cursor: not-allowed;
}

.refresh-btn:focus-visible {
  outline: 2px solid hsla(160, 100%, 37%, 1);
  outline-offset: 2px;
}

</style>
