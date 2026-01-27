import { defineStore } from 'pinia';

export const useGamesStore = defineStore('games', {
  state: () => {
    return {
      games: [] as GameInfo[],
      gameTurns: [] as GameTurn[],
      currentGameId: null as number | null,
      currentGameWorld: null as World | null,
      currentGameTurn: 0,
      currentGamePlayerId: null as number | null,
      currentPlayerCount: 0,
      maxPlayers: 4
    }
  },
  actions: {
    async list() { },
    get(id: number) {
      return this.games.find(g => g.id == id);
    },
    setCurrentGameId(id :number) {
      this.currentGameId = id;
    },
    setCurrentGameWorld(world :World) {
      this.currentGameWorld = world;
    },
    setCurrentGameTurn(turn : number) {
      this.currentGameTurn = turn;
    },
    setCurrentGamePlayerId(playerId :number) {
      this.currentGamePlayerId = playerId;
    },
    updateJoinResponse(resp :{gameId: number, playerId :number, turn :number, world :World, playerCount: number, maxPlayers: number}) {
      this.setCurrentGameId(resp.gameId);
      this.setCurrentGameTurn(resp.turn);
      this.setCurrentGameWorld(resp.world);
      this.setCurrentGamePlayerId(resp.playerId);
      this.currentPlayerCount = resp.playerCount;
      this.maxPlayers = resp.maxPlayers;
    },
    getCurrentGame() {
      return {
        gameId: this.currentGameId, 
        turn: this.currentGameTurn, 
        world: this.currentGameWorld,
        playerCount: this.currentPlayerCount,
        maxPlayers: this.maxPlayers
      };
    },
    getCurrentPlayerId() {
      return this.currentGamePlayerId;
    },
    async fetchTurnResults() {
      if (this.currentGameId === null || this.currentGamePlayerId === null) {
        console.error("Cannot fetch turn results: gameId or playerId is not set.");
        return;
      }
      const userStore = useUserStore();
      const token = userStore.getToken();
    },
    async fetchGameDetails(gameId: number) {
      const userStoreModule = await import('./User.store'); // Dynamically import User.store
      const userStore = userStoreModule.useUserStore();
      const token = userStore.getToken();
      const playerId = this.currentGamePlayerId; // Assuming current player ID is already set

      if (!playerId) {
        console.error("Player ID not set, cannot fetch game details.");
        // Potentially redirect to login or show error
        return;
      }

      // This endpoint needs to exist and return data similar to JoinGameResponse
      // It should provide the game state for the given player.
      // The backend might use something like `rules.filterGameForPlayer(gameId, playerId)`
      const apiUrlModule = await import('@/main'); // Dynamically import API_URL
      try {
        const response = await fetch(`${apiUrlModule.API_URL}/games/${gameId}/players/${playerId}`, { // Adjusted endpoint
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) {
          const error = await response.json().catch(() => ({ message: "Failed to fetch game details and parse error" }));
          console.error(`Failed to fetch game details for game ${gameId}: ${error.message || response.statusText}`);
          // Optionally, notify the user through a toast or alert
          alert(`Error fetching game details: ${error.message || response.statusText}`);
          return;
        }
        const gameData = await response.json() as {gameId: number, playerId :number, turn :number, world :World, playerCount: number, maxPlayers: number};
        this.updateJoinResponse(gameData); // Reuse existing action to update state
      } catch (error) {
        console.error(`Network error fetching game details for game ${gameId}:`, error);
        alert(`Network error fetching game details. Please try again.`);
      }
    }
  }
}
);

// Make sure API_URL is imported if not already globally available
import { API_URL } from '@/main';
import { useUserStore } from './User.store'; // Assuming UserStore provides the token

// Interface for the expected response from the turn results endpoint
export interface TurnResultsResponse {
  world?: World; // World is optional as results might not be ready
  message?: string; // Optional message from the server
}


export interface GameInfo {
  id: number,
}

export interface World {
  id: number,
  terrain: number[][],
  actors: Actor[]
}

export interface Actor {
  id: number,
  owner: number,
  pos: Coord
}

export interface Coord {
  x: number,
  y: number
}

export interface GameTurn {
  gameId: number,
  playerId: number,
  turn: number,
  world: World;
}

export interface PlannedMove {
  actorId: number;
  startPos: Coord;
  endPos: Coord;
}

export interface Order {
  actorId: number;
  toQ: number;
  toR: number;
}