"use strict";

import * as store from "./DatabaseStore";
import { Direction } from "./Models";
import * as GameLifecycleService from "./GameLifecycleService";
import type { CreateGameResponse, JoinGameResponse, GameSummary, ListGamesResponse } from "./GameLifecycleService";
import * as OrderService from "./OrderService";
import * as TurnResultService from "./TurnResultService";
import type { TurnResultsResponse } from "./TurnResultService";

// Re-export types from GameLifecycleService for backward compatibility
export type { CreateGameResponse, JoinGameResponse, GameSummary, ListGamesResponse };
export type { TurnResultsResponse } from "./TurnResultService";

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

// Delegate to GameLifecycleService
export async function createGame(maxPlayers?: number): Promise<any> {
  const result = await GameLifecycleService.createGame(maxPlayers);
  // Return with 'id' property to match expected interface in tests that do deep equality
  // Return both `id` and `gameId` for compatibility with tests and callers
  return { id: result.gameId, gameId: result.gameId };
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

// Delegate to TurnResultService
export async function turnResults(
  gameId: number,
  turn: number,
  playerId: number
): Promise<TurnResultsResponse> {
  return TurnResultService.turnResults(gameId, turn, playerId);
}

export function deleteStore() {
  store.deleteAll();
}

export * from "./GameLifecycleService";
export * from "./OrderService";
export * from "./TurnResultService";
