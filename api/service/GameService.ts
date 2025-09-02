"use strict";

import store = require("./Store");
import * as orderService from "./OrderService";
import * as gameLifecycleService from "./GameLifecycleService";
import * as turnService from "./TurnService";
import { Direction } from "./Models";

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
  success: boolean;
  results?: any; // Using any for TurnResult type
  message?: string;
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
  return {id: (await gameLifecycleService.createGame()).gameId };
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
  return turnService.turnResults(gameId, turn, playerId);
}

// DANGER - testing only; drop everything in the store
export function deleteStore() {
  store.deleteAll();
}
