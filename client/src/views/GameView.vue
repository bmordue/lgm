<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { useUserStore } from '../stores/User.store'
import { useGamesStore, type Actor } from '../stores/Games.store'
import { API_URL } from '@/main';

interface GameData {
  gameId?: number | null;
  turn?: number;
  world?: any;
  playerCount?: number;
  maxPlayers?: number;
}

const game = ref<GameData>({})

const gamesStore = useGamesStore();

watchEffect(async () => {
  game.value = gamesStore.getCurrentGame();
});

function actorToString(actor :Actor) {
  return `Owner: ${actor.owner} (${actor.pos.x}, ${actor.pos.y}) [${actor.id}]`;
}

function getPlayerList() {
  if (!game.value.world?.actors) return [];
  const playerIds = [...new Set(game.value.world.actors.map((actor: Actor) => actor.owner))];
  return playerIds.map(id => ({ id, name: `Player ${id}` }));
}

async function postOrders() {
  const userStore = useUserStore();

const token = userStore.getToken();
const g = gamesStore.getCurrentGame();
const playerId = gamesStore.getCurrentPlayerId();

const response = await fetch(`${API_URL}/games/${g.gameId}/turns/${g.turn}/players/${playerId}`, {
  method: "post", headers: {
    'Authorization': `Bearer ${token}`
  }
});

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
        
        <h3>Actions</h3>
        <button @click="postOrders()">Post Orders</button>
      </div>
      
      <div class="main-panel">
        <h3>World</h3>
        <div class="world-grid">
          <div v-for="row in game.world?.terrain || []" class="terrain-row">
            <span>{{ row.join(' ').replaceAll('0', '.').replaceAll('1','X') }}</span>
          </div>
        </div>
        
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
  font-family: monospace;
  background: #f9f9f9;
  padding: 10px;
  border-radius: 5px;
  margin-bottom: 20px;
}

.terrain-row {
  line-height: 1.2;
}

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
</style>

