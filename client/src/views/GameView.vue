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
      console.log("Orders submitted successfully!");
      plannedMoves.value = []; // Clear planned moves on success
      // TODO: Potentially refresh game state or notify user, fetch new turn data etc.
      // gamesStore.get(g.gameId) or similar to refresh game state might be needed.
    } else {
      const errorData = await response.json().catch(() => ({ message: "Failed to parse error response" }));
      console.error("Failed to submit orders:", response.status, errorData);
      // TODO: Notify user of error (e.g. using a toast notification)
    }
  } catch (error) {
    console.error("Error submitting orders:", error);
    // TODO: Notify user of error
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

