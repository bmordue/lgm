"use strict";

import * as store from "./DatabaseStore";
import logger = require("../utils/Logger");
import util = require("util");
import { World, Direction, TurnResult, Game } from "./Models";
import * as GameLifecycleService from "./GameLifecycleService";
import * as OrderService from "./OrderService";

// Export types from services for backward compatibility
export interface RequestActorOrders {
  actorId: number;
  orderType: number; // Corresponds to OrderType enum
  ordersList?: Array<number>; // For MOVE orders
  targetId?: number; // For ATTACK orders
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
  gameId: number;
}

export interface JoinGameResponse {
  gameId: number;
  playerId: number;
  turn: number;
  world: World;
  playerCount: number;
  maxPlayers: number;
}

export interface TurnResultsResponse {
  success: boolean;
  world?: World; // Optional because results might not be ready
  message?: string; // For cases where world is not available yet
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
export async function createGame(maxPlayers?: number): Promise<any> {
  const result = await GameLifecycleService.createGame(maxPlayers);
  // Return with 'id' property to match expected interface in tests that do deep equality
  return { id: result.gameId };
}

export async function joinGame(gameId: number, username?: string, sessionId?: string): Promise<JoinGameResponse> {
  return GameLifecycleService.joinGame(gameId, username, sessionId);
}

export async function listGames(): Promise<ListGamesResponse> {
  return GameLifecycleService.listGames();
}

// Delegate to OrderService  
export function fillOrTruncateOrdersList(ordersList: Array<Direction>) {
  return OrderService.fillOrTruncateOrdersList(ordersList);
}

export async function postOrders(
  body: PostOrdersBody,
  gameId: number,
  turn: number,
  playerId: number
): Promise<PostOrdersResponse> {
  return OrderService.postOrders(body, gameId, turn, playerId);
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
    return Promise.resolve({
      success: false,
      message: "turn results not available",
    });
  } else if (results.length == 1) {
    const turnResult = results[0];
    if (turnResult.world) {
      // Updated to match new TurnResultsResponse structure
      return Promise.resolve({ success: true, world: turnResult.world });
    } else {
      // This case should ideally not happen if Rules.ts correctly populates world
      logger.error(`TurnResult for game ${gameId}, turn ${turn}, player ${playerId} is missing world data.`);
      return Promise.resolve({
        success: false,
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

export function deleteStore() {
  store.deleteAll();
}

export * from "./GameLifecycleService";
export * from "./OrderService";
export * from "./TurnResultService";
