'use strict';

import store = require('./Store');
import rules = require('./Rules');
import logger = require('../utils/Logger');
import util = require('util');

export interface RequestActorOrders {
    actorId: number;
    ordersList: Array<number>;
}

export interface PostOrdersBody {
    orders: Array<RequestActorOrders>;
}

export interface PostOrdersResponse {
    orders: TurnOrders,
    turnStatus: {
        complete: Boolean
    }
}

export interface CreateGameResponse {
    id :number;
}

export interface JoinGameResponse {
    gameId :number;
    playerId :number;
    turn :number;
    world :World;
    id :number;
}

export interface TurnResultsResponse {
    success :Boolean;
    results :TurnResult
}

/**
 * create a new game
 *
 * returns GameCreatedResponse
 **/
export function createGame() :Promise<CreateGameResponse> {
    return new Promise(async function(resolve, reject) {
        const worldId = await rules.createWorld();
//        const gameId = await store.create<Game>(store.keys.games, { turn: 1, turnComplete: false, worldId: worldId });
        const gameId = await store.create<Game>(store.keys.games, { turn: 1, worldId: worldId });
        resolve({ id: gameId });
    });
}


/**
 * join a game
 *
 * id Integer 
 * no response value expected for this operation
 **/
async function joinGameResponseOf(resp) :Promise<JoinGameResponse> {
    return resp;
}

export function joinGame(gameId) :Promise<JoinGameResponse> {
    logger.debug("joinGame");
    return new Promise(async function(resolve, reject) {
        try {
            logger.debug("joinGame promise cb");
            const results = await Promise.all([
                store.read<Game>(store.keys.games, gameId),
                store.create(store.keys.players, { gameId: gameId }),
            ])
            logger.debug("joinGame add player to game");
            const game = results[0];
            const playerId = results[1];
            const updatedGame = await addPlayerToGame(game, playerId);
            logger.debug("joinGame update game");
            await store.replace(store.keys.games, gameId, updatedGame);
            logger.debug("joinGame: read world object");
            const world = await store.read<World>(store.keys.worlds, game.worldId);
            logger.debug("joinGame: set up actors for player");
            const actors = await rules.setupActors(game, playerId);
            logger.debug("joinGame: add new actors to world");
            world.actors = world.actors.concat(actors);
            await store.replace(store.keys.worlds, game.worldId, world);
            logger.debug("joinGame resolve with filtered game");
            resolve(joinGameResponseOf(rules.filterGameForPlayer(gameId, playerId)));
        } catch(e) {
            logger.error(util.format("failed to join game: %j", e));
            reject("failed to join game");
        }
    });
}

function addPlayerToGame(game, playerId) {
    return new Promise(function(resolve, reject) {
        logger.debug("addPlayerToGame promise");

        if (game.players) {
            logger.debug("addPlayerToGame append to existing");
            game.players.push(playerId);
        } else {
            logger.debug("addPlayerToGame new list");
            game.players = [playerId];
        }
        resolve(game);
    });
}

/**
 * post turn orders
 *
 * body TurnOrders 
 * id Integer 
 * no response value expected for this operation
 **/

 function anyExistingOrders(gameId, turn, playerId) {
    return (o) => { return o.gameId == gameId && o.turn == turn && o.playerId == playerId; };
}

function numbersToDirections(orderNos :Array<number>) :Array<Direction> {
    return orderNos.map((n) => <Direction> n);
}

export function fillOrTruncateOrdersList(ordersList :Array<Direction>) {
    var corrected = new Array(rules.TIMESTEP_MAX);
    for (let i = 0; i < corrected.length; i++) {
        corrected[i] = i < ordersList.length ? ordersList[i] : 6; //Direction.NONE;
    }
    return corrected;
}

function validateRequestOrders(requestOrders :Array<RequestActorOrders>) :Promise<Array<ActorOrders>> {
    const outs = requestOrders.map(async function(o) {
        const out = {
            actor: await store.read<Actor>(store.keys.actors, o.actorId),
            ordersList: fillOrTruncateOrdersList(numbersToDirections(o.ordersList))
        };
        
        return <ActorOrders> out;
    });
    return Promise.all(outs);
}

function validateOrders(requestOrders :Array<RequestActorOrders>, gameId, turn, playerId) :Promise<TurnOrders> {
    return new Promise(async function(resolve, reject) {
        logger.debug("validateOrders()");
        let game;
        try {
            game = await store.read<Game>(store.keys.games, gameId);
        } catch (e) {
            logger.debug(util.format("validateOrders: failed to load game object: %j", e));
            return reject("failed to load game object");
        }
        let turnOrders :TurnOrders = {
            gameId: gameId,
            turn: turn,
            playerId: playerId,
            orders: []
        };
        if (!game.players.includes(playerId)) {
            logger.debug("reject: playerId is not in game.players array");
            return reject("playerId is not in game.players array");
        }

        if (game.turn != turn) {
            logger.debug(util.format("reject: orders turn (%s) does not match game turn (%s)", turn, game.turn));
            return reject("orders turn does not match game turn");
        }

        try {
            turnOrders.orders = await validateRequestOrders(requestOrders);
        } catch (e) {
            logger.debug(util.format("validateOrders: failed validate request orders: %j", e));
            return reject("failed to validate request orders");
        }

        return resolve(turnOrders);
    });
}

function storeOrders(body, gameId, turn, playerId) {//:Promise<PostOrdersResponse> {
    return new Promise(async function(resolve, reject) {
        let summary = { gameId: gameId, turn: turn, playerId: playerId, ordersId: null};
        const existing = await store.readAll<TurnOrders>(store.keys.turnOrders, anyExistingOrders(gameId, turn, playerId));
        if (existing.length > 0) {
            logger.debug("postOrders: replace existing orders");
            await store.update(store.keys.turnOrders, existing[0].id, {orders: body.orders});
            summary.ordersId = existing[0].id;
        } else {
            logger.debug("postOrders: create new orders");
            const turnOrders :TurnOrders = { gameId: gameId, turn: turn, playerId: playerId, orders: body.orders, id: null };
            const ordersId = await store.create<TurnOrders>(store.keys.turnOrders,  turnOrders);
            logger.debug("postOrders: created new orders");
            summary.ordersId = ordersId;
        }
        logger.debug("postOrders: process rules");
        const turnSummary = await rules.process(summary.ordersId);
        logger.debug("postOrders: provide summary");
        resolve({turnStatus: turnSummary, orders: summary});
    });
}

async function postOrdersResponseOf(response) :Promise<PostOrdersResponse> {
    return response;
}

export function postOrders(body :PostOrdersBody, gameId, turn, playerId) :Promise<PostOrdersResponse> {
    return new Promise(async function(resolve, reject) {
        logger.debug("postOrders promise");
        try {
            const result = await validateOrders(body.orders, gameId, turn, playerId);
        } catch (e) {
            reject("postOrders: order validation failed");
        }
        resolve(postOrdersResponseOf(storeOrders(body, gameId, turn, playerId)));
    });
}


/**
 * get turn results
 *
 * id Integer 
 * returns TurnResultsResponse
 **/

export function turnResults(gameId, turn, playerId) {
    return new Promise(async function(resolve, reject) {
        const results = await store.readAll<TurnResult>(store.keys.turnResults, (r) => { return r.gameId == gameId && r.turn == turn && r.playerId == playerId; });
        logger.debug(util.format("turnResults: found %s results", results.length));
        if (results.length == 0) {
            resolve({ success: false, message: "turn results not available" });
        } else if (results.length == 1) {
            resolve({ success: true, results: results[0]});
        } else {
            reject("expected a single result for turn results");
        }
    });
}
