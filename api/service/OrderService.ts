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
} from "./Models";

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

function anyExistingOrders(to: TurnOrders) {
  return (o: { gameId: number; turn: number; playerId: number }) => {
    return (
      o.gameId == to.gameId && o.turn == to.turn && o.playerId == to.playerId
    );
  };
}

function numbersToDirections(orderNos: Array<number>): Array<Direction> {
  return orderNos.map((n) => <Direction>n);
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
  const outs = requestOrders.map(async function (o) {
    const out = {
      actor: await store.read<Actor>(store.keys.actors, o.actorId),
      ordersList: fillOrTruncateOrdersList(numbersToDirections(o.ordersList)),
      orderType: OrderType.MOVE,
    };
    logger.debug(util.format("ActorOrder: %j", out));

    return <ActorOrders>out;
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