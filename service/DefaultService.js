'use strict';

const store = require('./Store.js');
const rules = require('./Rules.js');
const logger = require('../utils/Logger.js');
const util = require('util');

/**
 * create a new game
 *
 * returns GameCreatedResponse
 **/
module.exports.createGame = function () {
    return new Promise((resolve, reject) => {
        rules.createWorld()
            .then((worldId) => {
                return store.create(store.keys.games, { turn: 1, turnComplete: false, worldId: worldId })
            })
            .then((gameId) => {
                resolve({ id: gameId });
            })
            .catch((e) => {
                logger.error("Error in createGame");
                logger.error(e);
                reject(e);
            });
    });
}


/**
 * join a game
 *
 * id Integer 
 * no response value expected for this operation
 **/
module.exports.joinGame = function (gameId) {
    logger.debug("joinGame");
    return new Promise(function (resolve, reject) {
        let playerId;
        logger.debug("joinGame promise cb");
        Promise.all([
            store.read(store.keys.games, gameId),
            store.create(store.keys.players, { gameId: gameId }),
        ]).then((results) => {
            logger.debug("joinGame add player to game");
            const game = results[0];
            playerId = results[1];
            return addPlayerToGame(game, playerId);
        }).then((updatedGame) => {
            logger.debug("joinGame update game");
            return store.replace(store.keys.games, gameId, updatedGame);
        }).then((game) => {
            logger.debug("joinGame resolve");
            resolve(rules.filterGameForPlayer(gameId, playerId));
        })
        .catch((e) => {
            logger.error("Error in joinGame");
            logger.error(e);
            reject(e);
        });
    });
}

function addPlayerToGame(game, playerId) {
    return new Promise(function (resolve, reject) {
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

function validateOrders(body, gameId, turn, playerId) {
    return new Promise(function (resolve, reject) {
        store.read(store.keys.games, gameId).then((game) => {
            if (!game.players.includes(playerId)) {
                console.log("validateOrders: playerId is not in game.players array");
                return resolve(false);
            }

            if (game.turn != turn) {
                console.log("validateOrders: orders turn does not match game turn");
                return resolve(false);
            }

            return resolve(true);

        }).catch(reject);
    });
}

function storeOrders(body, gameId, turn, playerId) {
    return new Promise(function (resolve, reject) {
        let summary = { gameId: gameId, turn: turn, playerId: playerId};
        store.readAll(store.keys.turnOrders, anyExistingOrders(gameId, turn, playerId))
            .then((existing) => {
                if (existing.length > 0) {
                    logger.debug("postOrders: replace existing orders");
                    store.update(store.keys.turnOrders, existing[0].id, {body: body})
                        .then(() => {
                            summary.ordersId = existing[0].id;
                            return;
                        }, reject);
                } else {
                    logger.debug("postOrders: create new orders");
                    store.create(store.keys.turnOrders, { gameId: gameId, turn: turn, playerId: playerId, body: body })
                        .then((ordersId) => {
                            logger.debug("postOrders: created new orders");
                            summary.ordersId = ordersId;
                            return;
                        }, reject);
                }
            })
            .then(() => {
                logger.debug("postOrders: process rules");
                return rules.process(summary.ordersId);
            })
            .then((turnSummary) => {
                logger.debug("postOrders: provide summary");
                resolve({turnStatus: turnSummary, orders: summary});
            })
            .catch(reject);
    });
}

module.exports.postOrders = function (body, gameId, turn, playerId) {
    return new Promise(function (resolve, reject) {
        logger.debug("postOrders promise");
        validateOrders(body, gameId, turn, playerId)
            .then((result) => {
                if (result) {
                    resolve(storeOrders(body, gameId, turn, playerId));
                } else {
                    reject({valid: false, message: "postOrders: order validation failed"});
                }
            })
            .catch(reject);
    });
}


/**
 * get turn results
 *
 * id Integer 
 * returns TurnResultsResponse
 **/

module.exports.turnResults = function (gameId, turn, playerId) {
    return new Promise(function (resolve, reject) {
        store.readAll(store.keys.turnResults, (r) => { return r.gameId == gameId && r.turn == turn && r.playerId == playerId; })
            .then((results) => {
                logger.debug(util.format("turnResults: found %s results", results.length));
                if (results.length == 0) {
                    resolve({ success: false, message: "turn results not available" });
                } else if (results.length == 1) {
                    resolve({ success: true, results: results[0]});
                } else {
                    reject({message: "expected a single result for turn results", results: results});
                }
            })
            .catch(reject);
    });
}
