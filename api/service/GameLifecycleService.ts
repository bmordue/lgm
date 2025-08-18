"use strict";

import store = require("./Store");
import rules = require("./Rules");
import logger = require("../utils/Logger");
import util = require("util");

import {
  Game,
  World,
} from "./Models";
import { inspect } from "util";

export interface CreateGameResponse {
  id: number;
}

export interface JoinGameResponse {
  gameId: number;
  playerId: number;
  turn: number;
  world: World;
  playerCount: number;
  maxPlayers: number;
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

/**
 * join a game
 *
 * id Integer
 * no response value expected for this operation
 **/
function joinGameResponseOf(resp: JoinGameResponse): JoinGameResponse {
  return resp;
}

export async function joinGame(gameId: number, username?: string): Promise<JoinGameResponse> {
  logger.debug("joinGame");
  try {
    logger.debug(`gameId: ${inspect(gameId)}`);
    const game = await store.read<Game>(store.keys.games, gameId);
    
    // Check if game is full
    const currentPlayerCount = game.players ? game.players.length : 0;
    if (currentPlayerCount >= MAX_PLAYERS_PER_GAME) {
      return Promise.reject(new Error("Game is full"));
    }
    
    // Check for duplicate joins by username
    if (username && game.players) {
      for (const existingPlayerId of game.players) {
        try {
          const existingPlayer = await store.read<any>(store.keys.players, existingPlayerId);
          if (existingPlayer.username === username) {
            return Promise.reject(new Error("Player already joined this game"));
          }
        } catch (e) {
          logger.debug(`Could not read player ${existingPlayerId}: ${e.message}`);
        }
      }
    }
    
    const playerId = await store.create(store.keys.players, { gameId: gameId, username: username });
    const updatedGame = addPlayerToGame(game, playerId);
    logger.debug("joinGame update game");
    await store.replace(store.keys.games, gameId, updatedGame);
    logger.debug("joinGame: read world object");
    const world = await store.read<World>(store.keys.worlds, game.worldId);
    logger.debug("joinGame: set up actors for player");
    const actors = await rules.setupActors(game, playerId); // TODO: should return ids, not objects
    logger.debug("joinGame: add new actors to world");
    world.actors = world.actors.concat(actors); // TODO: world.actors should be world.actorIds -- ids, not objects
    await store.replace(store.keys.worlds, game.worldId, world);
    logger.debug("joinGame resolve with filtered game");
    return Promise.resolve(
      joinGameResponseOf(await rules.filterGameForPlayer(gameId, playerId))
    );
  } catch (e) {
    logger.error(util.format("failed to join game: %j", e));
    return Promise.reject(e);
  }
}

function addPlayerToGame(game: Game, playerId: number) {
  logger.debug("addPlayerToGame");

  if (!game) console.log("ruh roh");

  if (game.players) {
    logger.debug("addPlayerToGame append to existing");
    game.players.push(playerId);
  } else {
    logger.debug("addPlayerToGame new list");
    game.players = [playerId];
  }
  return game;
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
