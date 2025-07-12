"use strict";

import store = require("./Store");
import rules = require("./Rules");
import logger = require("../utils/Logger");
import util = require("util");

import {
  Game,
} from "./Models";

export interface CreateGameResponse {
  id: number;
}

export interface GameSummary {
  id: number;
  playerCount: number;
  maxPlayers: number;
  isFull: boolean;
}

export interface ListGamesResponse {
  gameIds: Array<number>;
  games: Array<GameSummary>;
}

const MAX_PLAYERS_PER_GAME = 4;


/**
 * create a new game
 *
 * returns GameCreatedResponse
 **/
export async function createGame(): Promise<CreateGameResponse> {
  const worldId = await rules.createWorld();
  const gameId = await store.create<Game>(store.keys.games, {
    turn: 1,
    worldId: worldId,
  });
  return Promise.resolve({ id: gameId });
}

export async function listGames(): Promise<ListGamesResponse> {
  const games = await store.readAll<Game>(store.keys.games, () => true);
  const ids = games.map((g) => g.id);
  const gameSummaries: GameSummary[] = games.map((g) => {
    const playerCount = g.players ? g.players.length : 0;
    return {
      id: g.id!,
      playerCount,
      maxPlayers: MAX_PLAYERS_PER_GAME,
      isFull: playerCount >= MAX_PLAYERS_PER_GAME
    };
  });
  return { gameIds: ids, games: gameSummaries };
}
