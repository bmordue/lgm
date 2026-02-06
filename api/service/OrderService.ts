"use strict";

import store = require("./Store");
import rules = require("./Rules");
import logger = require("../utils/Logger");
import util = require("util");

import {
  Game,
  Direction,
  ActorOrders,
  Actor,
  TurnOrders,
  OrderType,
  GridPosition
} from "./Models";
import { Hex } from '../Hex';

// Helper function to convert GridPosition to Hex
function gridPositionToHex(pos: GridPosition): Hex {
    const q = pos.y; // column is q
    const r = pos.x - (pos.y - (pos.y & 1)) / 2; // row is x, convert to axial r for odd-q
    return new Hex(q, r, -q - r); // s = -q - r
}

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

function anyExistingOrders(to: TurnOrders) {
  return (o: { gameId: number; turn: number; playerId: number }) => {
    return (
      o.gameId == to.gameId && o.turn == to.turn && o.playerId == to.playerId
    );
  };
}

function numbersToDirections(orderNos?: Array<number>): Array<Direction> {
  if (!orderNos) {
    return [];
  }
  return orderNos.map((n) => n as Direction);
}

export function fillOrTruncateOrdersList(ordersList: Array<Direction>) {
  const corrected = new Array(rules.TIMESTEP_MAX);
  for (let i = 0; i < corrected.length; i++) {
    corrected[i] = i < ordersList.length ? ordersList[i] : Direction.NONE;
  }
  return corrected;
}

function validateRequestOrders(
  requestOrders: Array<RequestActorOrders>
): Promise<Array<ActorOrders>> {
  const outs = requestOrders.map(function (o) {
    const orderType = o.orderType as OrderType;

    const out: ActorOrders = {
      actorId: o.actorId,
      orderType: orderType
    };

    if (orderType === OrderType.MOVE) {
      if (!o.ordersList) {
        throw new Error(`Move order for actor ${o.actorId} must have ordersList`);
      }
      out.ordersList = fillOrTruncateOrdersList(numbersToDirections(o.ordersList));
    } else if (orderType === OrderType.ATTACK) {
      if (o.targetId === undefined) {
        throw new Error(`Attack order for actor ${o.actorId} must have targetId`);
      }
      out.targetId = o.targetId;
    } else {
      throw new Error(`Unknown order type: ${orderType} for actor ${o.actorId}`);
    }

    logger.debug(util.format("ActorOrder: %j", out));

    return out;
  });
  return Promise.all(outs);
}

async function validateOrders(
  requestOrders: Array<RequestActorOrders>,
  gameId: number,
  turn: number,
  playerId: number
): Promise<TurnOrders> {
  logger.debug("validateOrders()");
  let game: Game;
  try {
    game = await store.read<Game>(store.keys.games, gameId);
  } catch (e) {
    logger.debug(
      util.format("validateOrders: failed to load game object: %j", e)
    );
    return Promise.reject(e);
  }
  const turnOrders: TurnOrders = {
    gameId: gameId,
    turn: turn,
    playerId: playerId,
    orders: [],
  };
  if (!game.players.includes(playerId)) {
    logger.debug("reject: playerId is not in game.players array");
    return Promise.reject(new Error("playerId is not in game.players array"));
  }

  if (game.turn != turn) {
    logger.debug(
      util.format(
        "reject: orders turn (%s) does not match game turn (%s)",
        turn,
        game.turn
      )
    );
    return Promise.reject(new Error("orders turn does not match game turn"));
  }

  // Load all actors in the world to validate attack orders
  const world = await store.read<any>(store.keys.worlds, game.worldId);
  const allActorsInWorld = await Promise.all(world.actorIds.map(id => store.read<any>(store.keys.actors, id)));

  // Validate each request order
  for (const requestOrder of requestOrders) {
    const actorId = requestOrder.actorId;
    const actor = allActorsInWorld.find((a: any) => a.id === actorId);

    if (!actor) {
      return Promise.reject(new Error(`Actor with ID ${actorId} not found in game`));
    }

    if (actor.owner !== playerId) {
      return Promise.reject(new Error(`Player ${playerId} does not own actor ${actorId}`));
    }

    // For attack orders, validate that the target exists and has a weapon
    if (requestOrder.orderType === OrderType.ATTACK) {
      if (requestOrder.targetId === undefined) {
        return Promise.reject(new Error(`Attack order for actor ${actorId} must have targetId`));
      }

      const targetActor = allActorsInWorld.find((a: any) => a.id === requestOrder.targetId);
      if (!targetActor) {
        return Promise.reject(new Error(`Target actor with ID ${requestOrder.targetId} not found in game`));
      }

      // Validate that the attacking actor has a weapon
      if (!actor.weapon) {
        return Promise.reject(new Error(`Actor ${actorId} has no weapon and cannot perform attack`));
      }

      // Validate weapon properties
      if (actor.weapon.minRange < 0) {
        return Promise.reject(new Error(`Actor ${actorId}'s weapon has invalid minRange: ${actor.weapon.minRange}`));
      }

      if (actor.weapon.maxRange < actor.weapon.minRange) {
        return Promise.reject(new Error(`Actor ${actorId}'s weapon has invalid range: maxRange (${actor.weapon.maxRange}) < minRange (${actor.weapon.minRange})`));
      }

      // Perform preliminary range check (note: this is only a preliminary check as positions can change)
      const attackerPos = actor.pos;
      const targetPos = targetActor.pos;

      const attackerHex = gridPositionToHex(attackerPos);
      const targetHex = gridPositionToHex(targetPos);
      const distance = attackerHex.distance(targetHex);

      if (distance < actor.weapon.minRange || distance > actor.weapon.maxRange) {
        logger.info(`Preliminary range check: Target ${targetActor.id} is out of range for ${actorId} (min: ${actor.weapon.minRange}, max: ${actor.weapon.maxRange}, distance: ${distance}). Note: This is a preliminary check as actor positions may change before execution.`);
      }
    }
  }

  try {
    turnOrders.orders = await validateRequestOrders(requestOrders);
  } catch (e) {
    logger.debug(
      util.format("validateOrders: failed validate request orders: %j", e)
    );
    return Promise.reject(e);
  }

  return Promise.resolve(turnOrders);
}

async function storeOrders(
  turnOrders: TurnOrders
): Promise<PostOrdersResponse> {
  logger.debug("storeOrders()");

  const existing = await store.readAll<TurnOrders>(
    store.keys.turnOrders,
    anyExistingOrders(turnOrders)
  );
  if (existing.length > 0) {
    const msg =
      "storeOrders: turnOrders already exists for this game-turn-player";
    return Promise.reject(new Error(msg));
  }
  const ordersId = await store.create<TurnOrders>(
    store.keys.turnOrders,
    turnOrders
  );
  const turnStatus = await rules.process(ordersId);
  return Promise.resolve({ turnStatus: turnStatus });
}

async function postOrdersResponseOf(
  response: PostOrdersResponse | PromiseLike<PostOrdersResponse>
): Promise<PostOrdersResponse> {
  return response;
}

export async function postOrders(
  body: PostOrdersBody,
  gameId: number,
  turn: number,
  playerId: number
): Promise<PostOrdersResponse> {
  logger.debug("postOrders promise");
  let validatedOrders: TurnOrders;
  try {
    validatedOrders = await validateOrders(body.orders, gameId, turn, playerId);
  } catch (e) {
    logger.debug("postOrders: order validation failed");
    return Promise.reject(e);
  }
  return Promise.resolve(postOrdersResponseOf(storeOrders(validatedOrders)));
}
