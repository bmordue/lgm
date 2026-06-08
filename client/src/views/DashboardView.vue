<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import  router  from '../router';
import { useGamesStore, type World } from '@/stores/Games.store';
import { API_URL } from '@/config';
import { webSocketService } from '@/services/webSocketService';

interface GameSummary {
  id: number;
  playerCount: number;
  maxPlayers: number;
  isFull: boolean;
  hostPlayerId?: number;
  gameState?: 'LOBBY' | 'IN_PROGRESS' | 'COMPLETED';
}

const gameList = ref<GameSummary[]>([])
const isCreating = ref(false)
const isLoading = ref(false)
const successMessage = ref('')
const errorMessage = ref('')
const joiningGameId = ref<number | null>(null)
const lastRefreshed = ref<string | null>(null)
const selectedMaxPlayers = ref(4)

async function fetchGameList() {
  isLoading.value = true;
  try {
    const response = await fetch(`${API_URL}/games`);
    const data = await response.json();
    gameList.value = data.games || [];
    lastRefreshed.value = new Date().toLocaleTimeString();
  } finally {
    isLoading.value = false;
  }
}

let unsubscribeGamesUpdated: (() => void) | null = null;

onMounted(() => {
  fetchGameList();
  unsubscribeGamesUpdated = webSocketService.onGamesUpdated(() => {
    fetchGameList();
  });
});

onUnmounted(() => {
  if (unsubscribeGamesUpdated) {
    unsubscribeGamesUpdated();
    unsubscribeGamesUpdated = null;
  }
});

async function callCreate() {
  isCreating.value = true;
  errorMessage.value = '';
  try {
    const response = await fetch(`${API_URL}/games`, {
      method: "post",
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ maxPlayers: selectedMaxPlayers.value }),
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

    const joinBody = await resp.json() as {gameId: number, playerId :number, turn :number, world :World, playerCount: number, maxPlayers: number, hostPlayerId?: number, gameState?: 'LOBBY' | 'IN_PROGRESS' | 'COMPLETED'};
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
      <svg class="status-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      {{ errorMessage }}
    </div>
  </Transition>
  <Transition name="fade">
    <div v-if="successMessage" class="success-message" role="status" aria-live="polite">
      <svg class="status-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
      {{ successMessage }}
    </div>
  </Transition>
  <div class="header-container">
    <h1>Games ({{ gameList?.length || 0 }})</h1>
    <div class="refresh-container">
      <span v-if="lastRefreshed" class="last-refreshed">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="clock-icon" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
        Last Refreshed: {{ lastRefreshed }}
      </span>
      <button
        type="button"
        class="refresh-btn"
        @click="fetchGameList"
        :disabled="isLoading"
        aria-label="Refresh game list"
        title="Refresh game list"
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
          :class="{ 'spinning': isLoading }"
        >
          <path d="M23 4v6h-6"></path>
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
        </svg>
      </button>
    </div>
  </div>
  <div v-if="isLoading" class="no-games" role="status" aria-live="polite">
    <svg class="btn-spinner spinning" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
    </svg>
    Loading games...
  </div>
  <div class="game-list" :aria-busy="isLoading" aria-live="polite">
    <TransitionGroup name="fade">
      <button
        type="button"
        v-for="game in gameList"
        :key="game.id"
        class="game-item"
        :class="{ 'game-full': game.isFull }"
        :disabled="joiningGameId !== null || game.isFull"
        :aria-label="`Game #${game.id}, ${game.playerCount} of ${game.maxPlayers} players${game.isFull ? ', Full' : (joiningGameId === game.id ? ', Joining' : '')}`"
        :aria-busy="joiningGameId === game.id"
        @click="join(game)"
      >
        <div class="game-item-content">
          <div class="game-details">
            <div class="game-id">
              <svg
                v-if="joiningGameId !== game.id"
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="game-icon"
                aria-hidden="true"
              >
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
              <svg
                v-else
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
              {{ joiningGameId === game.id ? 'Joining...' : 'Game #' + game.id }}
            </div>
            <div class="game-status">
              Players: {{ game.playerCount }}/{{ game.maxPlayers }}
              <span v-if="game.isFull" class="full-indicator"> (FULL)</span>
            </div>
          </div>
          <svg
            v-if="!game.isFull && joiningGameId !== game.id"
            class="chevron-icon"
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </div>
      </button>
    </TransitionGroup>
    <div v-if="!isLoading && gameList.length === 0" class="no-games">
      No active games found. Click 'Create New Game' to start a new journey!
    </div>
  </div>
  <label class="player-limit-label" for="max-players">Player limit</label>
  <select id="max-players" v-model.number="selectedMaxPlayers" class="player-limit-select">
    <option v-for="count in [2, 3, 4, 5, 6, 7, 8]" :key="count" :value="count">
      {{ count }} players
    </option>
  </select>
  <button
    type="button"
    class="create-game-btn"
    @click="callCreate()"
    :disabled="isCreating"
    :aria-busy="isCreating"
    aria-live="polite"
  >
    <svg
      v-if="isCreating"
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
    <svg
      v-else
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
    {{ isCreating ? 'Creating...' : 'Create New Game' }}
  </button>
</template>

<style scoped>
.header-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.refresh-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.last-refreshed {
  font-size: 0.85em;
  color: #666;
  display: flex;
  align-items: center;
  gap: 4px;
}

.clock-icon {
  color: hsla(160, 100%, 37%, 1);
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

.refresh-btn:disabled {
  color: #ccc;
  cursor: not-allowed;
}

.refresh-btn:focus-visible {
  outline: 2px solid hsla(160, 100%, 37%, 1);
  outline-offset: 2px;
}


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

.game-item:active:not(:disabled) {
  transform: scale(0.98);
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

.game-item-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.game-details {
  flex-grow: 1;
}

.chevron-icon {
  color: hsla(160, 100%, 37%, 1);
  transition: transform 0.2s ease;
}

.game-item:hover .chevron-icon,
.game-item:focus-visible .chevron-icon {
  transform: translateX(4px);
}

.game-id {
  font-weight: bold;
  font-size: 1.1em;
  margin-bottom: 5px;
  display: flex;
  align-items: center;
  gap: 8px;
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
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.player-limit-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
}

.player-limit-select {
  width: 100%;
  margin-bottom: 12px;
  padding: 10px 12px;
  border: 1px solid #ccc;
  border-radius: 8px;
  background: white;
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
