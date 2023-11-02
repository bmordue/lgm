'use strict';

import store = require('./Store');
import rules = require('./Rules');
import logger = require('../utils/Logger');
import util = require('util');

import { Game, Direction, ActorOrders, Actor, World, TurnOrders, TurnResult } from './Models';
import { inspect } from 'util';


export interface RequestActorOrders {
    actorId: number;
    ordersList: Array<number>;
}

export interface PostOrdersBody {
    orders: Array<RequestActorOrders>;
}

export interface PostOrdersResponse {
    turnStatus: {
        complete: boolean
    }
}

export interface CreateGameResponse {
    id: number;
}

export interface JoinGameResponse {
    gameId: number;
    playerId: number;
    turn: number;
    world: World;
}

export interface TurnResultsResponse {
    success: boolean;
    results?: TurnResult;
    message?: string;
}

/**
 * create a new game
 *
 * returns GameCreatedResponse
 **/
export async function createGame(): Promise<CreateGameResponse> {
    const worldId = await rules.createWorld();
    const gameId = await store.create<Game>(store.keys.games, { turn: 1, worldId: worldId });
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

export async function joinGame(gameId: number): Promise<JoinGameResponse> {
    logger.debug("joinGame");
    try {
        logger.debug(`gameId: ${inspect(gameId)}`);
        const game = await store.read<Game>(store.keys.games, gameId);
        const playerId = await store.create(store.keys.players, { gameId: gameId });
        const updatedGame = addPlayerToGame(game, playerId);
        logger.debug("joinGame update game");
        await store.replace(store.keys.games, gameId, updatedGame);
        logger.debug("joinGame: read world object");
        const world = await store.read<World>(store.keys.worlds, game.worldId);
        logger.debug("joinGame: set up actors for player");
        const actors = await rules.setupActors(game, playerId); // TODO: should return ids, not objects
        logger.debug("joinGame: add new actors to world");
        world.actors = world.actors.concat(actors);  // TODO: world.actors should be world.actorIds -- ids, not objects
        await store.replace(store.keys.worlds, game.worldId, world);
        logger.debug("joinGame resolve with filtered game");
        return Promise.resolve(joinGameResponseOf(await rules.filterGameForPlayer(gameId, playerId)));
    } catch (e) {
        logger.error(util.format("failed to join game: %j", e));
        return Promise.reject(e);
    }
}

function addPlayerToGame(game: Game, playerId: number) {
    // return new Promise(function (resolve) {
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

/**
 * post turn orders
 *
 * body TurnOrders 
 * id Integer 
 * no response value expected for this operation
 **/

function anyExistingOrders(to: TurnOrders) {
    return (o: { gameId: number; turn: number; playerId: number; }) => { return o.gameId == to.gameId && o.turn == to.turn && o.playerId == to.playerId; };
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

function validateRequestOrders(requestOrders: Array<RequestActorOrders>): Promise<Array<ActorOrders>> {
    const outs = requestOrders.map(async function (o) {
        const out = {
            actor: await store.read<Actor>(store.keys.actors, o.actorId),
            ordersList: fillOrTruncateOrdersList(numbersToDirections(o.ordersList))
        };
        logger.debug(util.format("ActorOrder: %j", out));

        return <ActorOrders>out;
    });
    return Promise.all(outs);
}

async function validateOrders(requestOrders: Array<RequestActorOrders>, gameId: number, turn: number, playerId: number): Promise<TurnOrders> {
    logger.debug("validateOrders()");
    let game: Game;
    try {
        game = await store.read<Game>(store.keys.games, gameId);
    } catch (e) {
        logger.debug(util.format("validateOrders: failed to load game object: %j", e));
        return Promise.reject(e);
    }
    const turnOrders: TurnOrders = {
        gameId: gameId,
        turn: turn,
        playerId: playerId,
        orders: []
    };
    if (!game.players.includes(playerId)) {
        logger.debug("reject: playerId is not in game.players array");
        return Promise.reject(new Error("playerId is not in game.players array"));
    }

    if (game.turn != turn) {
        logger.debug(util.format("reject: orders turn (%s) does not match game turn (%s)", turn, game.turn));
        return Promise.reject(new Error("orders turn does not match game turn"));
    }

    try {
        turnOrders.orders = await validateRequestOrders(requestOrders);
    } catch (e) {
        logger.debug(util.format("validateOrders: failed validate request orders: %j", e));
        return Promise.reject(e);
    }

    return Promise.resolve(turnOrders);
}


async function storeOrders(turnOrders: TurnOrders): Promise<PostOrdersResponse> {
    logger.debug("storeOrders()");

    const existing = await store.readAll<TurnOrders>(store.keys.turnOrders, anyExistingOrders(turnOrders));
    if (existing.length > 0) {
        const msg = "storeOrders: turnOrders already exists for this game-turn-player";
        return Promise.reject(new Error(msg));
    }
    const ordersId = await store.create<TurnOrders>(store.keys.turnOrders, turnOrders);
    const turnStatus = await rules.process(ordersId);
    return Promise.resolve({ turnStatus: turnStatus });
}

async function postOrdersResponseOf(response: PostOrdersResponse | PromiseLike<PostOrdersResponse>): Promise<PostOrdersResponse> {
    return response;
}

export async function postOrders(body: PostOrdersBody, gameId: number, turn: number, playerId: number): Promise<PostOrdersResponse> {
    logger.debug("postOrders promise");
    let validatedOrders: TurnOrders;
    try {
        validatedOrders = await validateOrders(body.orders, gameId, turn, playerId);
    } catch (e) {
        logger.debug("postOrders: order validation failed")
        return Promise.reject(e);
    }
    return Promise.resolve(postOrdersResponseOf(storeOrders(validatedOrders)));
}


/**
 * get turn results
 *
 * id Integer 
 * returns TurnResultsResponse
 **/

export async function turnResults(gameId: number, turn: number, playerId: number): Promise<TurnResultsResponse> {
    const results = await store.readAll<TurnResult>(store.keys.turnResults,
        (r: TurnResult) => { return r.gameId == gameId && r.turn == turn && r.playerId == playerId; });

    logger.debug(util.format("turnResults: found %s results", results.length));

    if (results.length == 0) {
        return Promise.resolve({ success: false, message: "turn results not available" });
    } else if (results.length == 1) {
        return Promise.resolve({ success: true, results: results[0] });
    } else {
        return Promise.reject(new Error("expected a single result for turn results"));
    }
}

// DANGER - testing only; drop everything in the store
export function deleteStore() {
    store.deleteAll();
}