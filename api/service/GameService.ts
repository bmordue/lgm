"use strict";

import store = require("./Store");
import logger = require("../utils/Logger");

// Export types from services for backward compatibility
export interface RequestActorOrders {
  actorId: number;
  ordersList: Array<number>;
}

export interface PostOrdersBody {
  orders: Array<RequestActorOrders>;
}

export interface PostOrdersResponse {
  turnStatus: {
    complete: boolean;
  };
}

export interface CreateGameResponse {
  id: number;
}

export interface JoinGameResponse {
  gameId: number;
  playerId: number;
  turn: number;
  world: any; // Using any for World type to avoid circular imports
  playerCount: number;
  maxPlayers: number;
}

export interface TurnResultsResponse {
  // Conforms to OpenAPI spec: includes world directly.
  // success and message fields are removed as per direct world response.
  world?: World; // Optional because results might not be ready
  message?: string; // For cases where world is not available yet
  success: boolean;
  results?: any; // Using any for TurnResult type
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

// Delegate to GameLifecycleService
export async function createGame(): Promise<CreateGameResponse> {
  return gameLifecycleService.createGame();
}

export async function joinGame(gameId: number, username?: string): Promise<JoinGameResponse> {
  return gameLifecycleService.joinGame(gameId, username);
}

export async function listGames(): Promise<ListGamesResponse> {
  return gameLifecycleService.listGames();
}

// Delegate to OrderService  
export function fillOrTruncateOrdersList(ordersList: Array<Direction>) {
  return orderService.fillOrTruncateOrdersList(ordersList);
}

export async function postOrders(
  body: PostOrdersBody,
  gameId: number,
  turn: number,
  playerId: number
): Promise<PostOrdersResponse> {
  return orderService.postOrders(body, gameId, turn, playerId);
}

// Delegate to TurnService
export async function turnResults(
  gameId: number,
  turn: number,
  playerId: number
): Promise<TurnResultsResponse> {
  const results = await store.readAll<TurnResult>(
    store.keys.turnResults,
    (r: TurnResult) => {
      return r.gameId == gameId && r.turn == turn && r.playerId == playerId;
    }
  );

  logger.debug(util.format("turnResults: found %s results", results.length));

  if (results.length == 0) {
    // Updated to match new TurnResultsResponse structure
    return Promise.resolve({
      message: "Turn results not yet available or game/turn/player ID is invalid.",
    });
  } else if (results.length == 1) {
    const turnResult = results[0];
    if (turnResult.world) {
      // Updated to match new TurnResultsResponse structure
      return Promise.resolve({ world: turnResult.world });
    } else {
      // This case should ideally not happen if Rules.ts correctly populates world
      logger.error(`TurnResult for game ${gameId}, turn ${turn}, player ${playerId} is missing world data.`);
      return Promise.resolve({
        message: "Turn results are available but world data is missing.",
      });
    }
  } else {
    // This indicates a more serious issue, like duplicate TurnResult entries
    logger.error(`Found ${results.length} TurnResult entries for game ${gameId}, turn ${turn}, player ${playerId}. Expected 1.`);
    return Promise.reject(
      new Error("Internal server error: Duplicate turn results found.")
    );
  }
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
export * from "./GameLifecycleService";
export * from "./OrderService";
export * from "./TurnResultService";


// DANGER - testing only; drop everything in the store
export function deleteStore() {
  store.deleteAll();
}
