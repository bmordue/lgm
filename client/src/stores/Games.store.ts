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

      if (!token) {
        console.error("Cannot fetch turn results: auth token is not available.");
        // Potentially redirect to login or show an error
        return;
      }

      try {
        const response = await fetch(`${API_URL}/games/${this.currentGameId}/turns/${this.currentGameTurn}/players/${this.currentGamePlayerId}`, {
          method: "GET",
          headers: {
            'Authorization': `Bearer ${token}`, // Added Authorization header
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: "Failed to parse error response" }));
          console.error("Failed to fetch turn results:", response.status, errorData.message || response.statusText);
          // Optionally, set an error state in the store
          return;
        }

        const data: TurnResultsResponse = await response.json();

        if (data.world) {
          this.setCurrentGameWorld(data.world);
          console.log("Turn results fetched and world updated for turn:", this.currentGameTurn);
        } else if (data.message) {
          console.log("Message from server on fetchTurnResults:", data.message);
          // Potentially handle messages like "turn results not available yet"
          // This might mean the world is intentionally not sent.
        }
      } catch (error) {
        console.error("Error fetching turn results:", error);
        // Optionally, set an error state in the store
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