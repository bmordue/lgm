<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import  router  from '../router';
import { useGamesStore, type World } from '@/stores/Games.store';
import { API_URL } from '@/config';

interface GameSummary {
  id: number;
  playerCount: number;
  maxPlayers: number;
  isFull: boolean;
}

const gameList = ref<GameSummary[]>([])
const isCreating = ref(false)
const isLoading = ref(false)
const successMessage = ref('')
const errorMessage = ref('')
const joiningGameId = ref<number | null>(null)

async function fetchGameList() {
  isLoading.value = true;
  try {
    const response = await fetch(`${API_URL}/games`);
    const data = await response.json();
    gameList.value = data.games || [];
  } finally {
    isLoading.value = false;
  }
}

watchEffect(() => {
  fetchGameList();
});

async function callCreate() {
  isCreating.value = true;
  errorMessage.value = '';
  try {
    const response = await fetch(`${API_URL}/games`, {
      method: "post",
      credentials: 'include',
    });

    if (response.ok) {
      successMessage.value = 'Game created successfully!';
      setTimeout(() => {
        successMessage.value = '';
      }, 3000);
      await fetchGameList(); // Update game list after successful creation
    } else {
      const error = await response.json().catch(() => ({ message: "Failed to create game and parse error" }));
      errorMessage.value = `Failed to create game: ${error.message || 'Unknown error'}`;
    }
  } catch (error) {
    errorMessage.value = 'Network error while creating game. Please try again.';
  } finally {
    isCreating.value = false;
  }
}

async function join(game: GameSummary) {
  if (game.isFull) {
    errorMessage.value = 'Game is full!';
    return;
  }

  joiningGameId.value = game.id;
  errorMessage.value = '';
  try {
    const resp = await fetch(`${API_URL}/games/${game.id}`, {
      method: "put",
      credentials: 'include',
    });

    if (!resp.ok) {
      const error = await resp.json();
      errorMessage.value = `Failed to join game: ${error.message || 'Unknown error'}`;
      return;
    }

    const joinBody = await resp.json() as {gameId: number, playerId :number, turn :number, world :World, playerCount: number, maxPlayers: number};
    const gamesStore = useGamesStore();
    gamesStore.updateJoinResponse(joinBody);
    router.push('/game');
  } catch (error) {
    errorMessage.value = 'Network error. Please try again.';
  } finally {
    joiningGameId.value = null;
  }
}

</script>

<template>
  <Transition name="fade">
    <div v-if="errorMessage" class="error-message" role="alert" aria-live="assertive">
      {{ errorMessage }}
    </div>
  </Transition>
  <Transition name="fade">
    <div v-if="successMessage" class="success-message" role="status" aria-live="polite">
      {{ successMessage }}
    </div>
  </Transition>
  <h1>Games</h1>
  <div v-if="isLoading" class="no-games" role="status">
    Loading games...
  </div>
  <div class="game-list" :aria-busy="isLoading" aria-live="polite">
    <TransitionGroup name="fade">
      <button
        v-for="game in gameList"
        :key="game.id"
        class="game-item"
        :class="{ 'game-full': game.isFull }"
        :disabled="joiningGameId !== null || game.isFull"
        :aria-label="`Game #${game.id}, ${game.playerCount} of ${game.maxPlayers} players${game.isFull ? ', Full' : (joiningGameId === game.id ? ', Joining' : '')}`"
        :aria-busy="joiningGameId === game.id"
        @click="join(game)"
      >
        <div class="game-id">{{ joiningGameId === game.id ? 'Joining...' : 'Game #' + game.id }}</div>
        <div class="game-status">
          Players: {{ game.playerCount }}/{{ game.maxPlayers }}
          <span v-if="game.isFull" class="full-indicator"> (FULL)</span>
        </div>
      </button>
    </TransitionGroup>
    <div v-if="!isLoading && gameList.length === 0" class="no-games">
      No active games found. Click 'Create New Game' to start a new journey!
    </div>
  </div>
  <button
    class="create-game-btn"
    @click="callCreate()"
    :disabled="isCreating"
    :aria-busy="isCreating"
    aria-live="polite"
  >
    {{ isCreating ? 'Creating...' : 'Create New Game' }}
  </button>
</template>

<style scoped>
.game-list {
  margin: 20px 0;
}

.game-item {
  display: block;
  width: 100%;
  text-align: left;
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

.game-item:focus-visible {
  outline: 2px solid hsla(160, 100%, 37%, 1);
  outline-offset: 2px;
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

.error-message, .success-message {
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 15px;
  font-size: 0.9em;
  border: 1px solid;
}

.error-message {
  background-color: #fce4e4;
  border-color: #fcc2c2;
  color: #cc0000;
}

.success-message {
  background-color: hsla(160, 100%, 37%, 0.1);
  border-color: hsla(160, 100%, 37%, 1);
  color: hsla(160, 100%, 37%, 1);
  text-align: center;
}

.create-game-btn {
  background-color: hsla(160, 100%, 37%, 1);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.1s;
  width: 100%;
  font-size: 1em;
}

.create-game-btn:hover:not(:disabled) {
  background-color: hsla(160, 100%, 37%, 0.8);
}

.create-game-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.create-game-btn:focus-visible {
  outline: 2px solid hsla(160, 100%, 37%, 1);
  outline-offset: 4px;
}

.create-game-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
</style>
