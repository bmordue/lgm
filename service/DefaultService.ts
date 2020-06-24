'use strict';

import store = require('./Store.js');
import rules = require('./Rules.js');
import logger = require('../utils/Logger.js');
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
            reject(e);
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

function validateRequestOrders(requestOrders :Array<RequestActorOrders>) :Promise<Array<ActorOrders> {
    const outs :Array<ActorOrder> = requestOrders.map((o) => {
        const out = {
            actor: await store.read<Actor>(store.keys.actors, o.actorId),
            orders: numbersToDirections(o.ordersList)
        };
        return <ActorOrder> out;
    });
    return Promise.all();
}

function validateOrders(requestOrders :Array<RequestActorOrders>, gameId, turn, playerId) :Promise<TurnOrders> {
    return new Promise(async function(resolve, reject) {
        const game = await store.read<Game>(store.keys.games, gameId);
        let turnOrders :TurnOrders = {
            gameId: gameId,
            turn: turn,
            playerId: playerId,
            orders: []
        };
        if (!game.players.includes(playerId)) {
            return reject("playerId is not in game.players array");
        }

        if (game.turn != turn) {
            return reject("orders turn does not match game turn");
        }

        turnOrders.orders = await validateRequestOrders(requestOrders);

        return resolve(turnOrders);
    });
}

function storeOrders(body, gameId, turn, playerId) {
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
        const result = await validateOrders(body, gameId, turn, playerId);
        if (result) {
            resolve(postOrdersResponseOf(storeOrders(body, gameId, turn, playerId)));
        } else {
            reject({valid: false, message: "postOrders: order validation failed"});
        }
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
            reject({message: "expected a single result for turn results", results: results});
        }
    });
}
