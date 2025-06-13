<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { useUserStore } from '../stores/User.store'
import  router  from '../router';
import { useGamesStore, type World } from '@/stores/Games.store';
import { API_URL } from '@/main';

interface GameSummary {
  id: number;
  playerCount: number;
  maxPlayers: number;
  isFull: boolean;
}

const gameList = ref<GameSummary[]>([])

watchEffect(async () => {
  const response = await fetch(`${API_URL}/games`);
  const data = await response.json();
  gameList.value = data.games || [];
});

async function callCreate() {
  const userStore = useUserStore();

  const token = userStore.getToken();

  const response = await fetch(`${API_URL}/games`, {
    method: "post",
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  // TODO: update gameList here!
}

async function join(game: GameSummary) {
  if (game.isFull) {
    alert('Game is full!');
    return;
  }

  const userStore = useUserStore();
  const token = userStore.getToken();

  try {
    const resp = await fetch(`${API_URL}/games/${game.id}`, {
      method: "put", 
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!resp.ok) {
      const error = await resp.json();
      alert(`Failed to join game: ${error.message || 'Unknown error'}`);
      return;
    }

    const joinBody = await resp.json() as {gameId: number, playerId :number, turn :number, world :World, playerCount: number, maxPlayers: number};
    const gamesStore = useGamesStore();
    gamesStore.updateJoinResponse(joinBody);
    router.push('/game');
  } catch (error) {
    alert('Network error. Please try again.');
  }
}

</script>

<template>
  <h1>Games</h1>
  <div class="game-list">
    <div 
      v-for="game in gameList" 
      :key="game.id"
      class="game-item"
      :class="{ 'game-full': game.isFull }"
      @click="join(game)"
    >
      <div class="game-id">Game #{{ game.id }}</div>
      <div class="game-status">
        Players: {{ game.playerCount }}/{{ game.maxPlayers }}
        <span v-if="game.isFull" class="full-indicator"> (FULL)</span>
      </div>
    </div>
    <div v-if="gameList.length === 0" class="no-games">
      No games available
    </div>
  </div>
  <button @click="callCreate()">Create New Game</button>
</template>

<style scoped>
.game-list {
  margin: 20px 0;
}

.game-item {
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 15px;
  margin: 10px 0;
  cursor: pointer;
  transition: all 0.2s ease;
  background: white;
}

.game-item:hover {
  background: #f0f0f0;
  transform: translateY(-1px);
}

.game-item.game-full {
  background: #f5f5f5;
  color: #666;
  cursor: not-allowed;
}

.game-item.game-full:hover {
  background: #f5f5f5;
  transform: none;
}

.game-id {
  font-weight: bold;
  font-size: 1.1em;
  margin-bottom: 5px;
}

.game-status {
  font-size: 0.9em;
  color: #666;
}

.full-indicator {
  color: #d32f2f;
  font-weight: bold;
}

.no-games {
  text-align: center;
  color: #666;
  font-style: italic;
  padding: 20px;
}
</style>
