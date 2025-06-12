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
    }

  }
}
);


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