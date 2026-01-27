<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import HexGrid from '@/components/HexGrid.vue';
import OrderSubmission from '@/components/OrderSubmission.vue'; // Import OrderSubmission
import { useUserStore } from '../stores/User.store'
import { useGamesStore, type Actor, type PlannedMove, type Order } from '../stores/Games.store' // Import PlannedMove and Order
import { API_URL } from '@/main';

interface GameData {
  gameId?: number | null;
  turn?: number;
  world?: any;
  playerCount?: number;
  maxPlayers?: number;
}

const game = ref<GameData>({})
const plannedMoves = ref<PlannedMove[]>([]); // Reactive state for planned moves

const gamesStore = useGamesStore();

watchEffect(async () => {
  game.value = gamesStore.getCurrentGame();
});

// --- Event Handlers for move planning ---
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

const handleSubmitOrders = async (movesToSubmit: PlannedMove[]) => {
  console.log('Submitting orders:', movesToSubmit);
  await postOrders(movesToSubmit);
};
// --- End Event Handlers ---

function actorToString(actor :Actor) {
  return `Owner: ${actor.owner} (${actor.pos.x}, ${actor.pos.y}) [${actor.id}]`;
}

function getPlayerList() {
  if (!game.value.world?.actors) return [];
  const playerIds = [...new Set(game.value.world.actors.map((actor: Actor) => actor.owner))];
  return playerIds.map(id => ({ id, name: `Player ${id}` }));
}

async function postOrders(moves: PlannedMove[]) { // Modified signature
  const userStore = useUserStore();
  const token = userStore.getToken();
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

  try {
    // URL updated: /orders suffix removed
    const response = await fetch(`${API_URL}/games/${g.gameId}/turns/${g.turn}/players/${playerId}`, {
      method: "POST",
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json' // Content-Type remains
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

      alert("Orders submitted successfully!"); // Simple notification

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
      alert(`Failed to submit orders: ${errorData.message || response.statusText}`);
    }
  } catch (error) {
    console.error("Error submitting orders:", error);
    alert(`Error submitting orders: ${error instanceof Error ? error.message : 'Unknown network error'}`);
  }
}

</script>


<template>
    <h1>Game #{{ game.gameId }}</h1>
    <div class="game-info">
      <span class="turn-info">Turn {{ game.turn }}</span>
      <span class="player-info">Players: {{ game.playerCount }}/{{ game.maxPlayers }}</span>
    </div>
    
    <div class="game-content">
      <div class="left-panel">
        <h3>Players</h3>
        <div class="player-list">
          <div v-for="player in getPlayerList()" :key="`player-${player.id}`" class="player-item">
            {{ player.name }}
          </div>
        </div>
        
        <!-- Order Submission Component -->
        <order-submission
          :planned-moves="plannedMoves"
          @remove-move="handleRemoveMove"
          @submit-orders="handleSubmitOrders"
        />
        <!-- Removed old Post Orders button -->
      </div>
      
      <div class="main-panel">
        <h3>World</h3>
        <div class="world-grid" v-if="game.world">
          <hex-grid
            :world="game.world"
            :actors="game.world?.actors || []"
            @move-planned="handleMovePlanned"
          />
        </div>
        <div v-else>Loading world data...</div>
        
        <h3>Actors</h3>
        <div class="actors-list">
          <div v-for="actor in game.world?.actors || []" :key="actor.id" class="actor-item">
            {{ actorToString(actor) }}
          </div>
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
  padding: 8px;
  background: #e3f2fd;
  margin: 5px 0;
  border-radius: 4px;
  border-left: 3px solid #2196f3;
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
}

.actor-item {
  padding: 4px;
  margin: 2px 0;
  background: #fff3e0;
  border-radius: 3px;
}

h3 {
  color: #333;
  margin: 15px 0 10px 0;
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
</style>

