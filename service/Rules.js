'use strict';

const store = require('./Store.js');
const logger = require('../utils/Logger.js');
const util = require('util');

function findOrdersForTurn(gameId, turn) {
    logger.debug("rules.ordersForTurn");
    return store.readAll(store.keys.turnOrders, (o) => {
        logger.debug("findOrdersForTurn filter applied");
        return o.gameId == gameId && o.turn == turn;
    });
}

function allTurnOrdersReceived(gameId, turn) {
    return new Promise((resolve, reject) => {
        logger.debug("rules.allTurnOrdersReceived promise");
        Promise.all([
            findOrdersForTurn(gameId, turn),
            store.read(store.keys.games, gameId)
        ]).then((results) => {
            const orders = results[0];
            const game = results[1];
            logger.debug(util.format("rules.allTurnOrdersReceived: orders.length: %s; game.players.length: %s", orders.length, game.players.length));
            resolve(orders.length == game.players.length);
        }).catch(reject);
    });
}

function recordPlayerTurnResult(game, turn, playerId) {
    return store.create(store.keys.turnResults, {gameId: game.id, turn: turn, playerId: playerId, outcome: "unknown!"});
    // return new Promise((resolve, reject) => {
    //     resolve();
    // });
}

function processGameTurn(gameId) {
    return new Promise((resolve, reject) => {
        let game;
        store.read(store.keys.games, gameId)
            .then((g) => {
                game = g;
                logger.debug("rules.processGameTurn: update turn result for each player");
                return Promise.all(game.players.map((p) => recordPlayerTurnResult(game, game.turn, p)));
            })
            // .then((results) => {
            //     logger.debug("rules.processGameTurn: record turn results");
            //     return store.create(store.keys.turnResults, {gameId: game.id, turn: game.turn, results: results});
            // })
            .then((turnResultsId) => {
                logger.debug("rules.processGameTurn: incr turn number");
                return store.update(store.keys.games, game.id, {turn: game.turn + 1});
            })
            .then((game) => {
                logger.debug("rules.processGameTurn: resolve with turn status");
                resolve({complete: true, msg: "Turn complete", turn: game.turn});
            })
            .catch((e) => {
                logger.error("Failed to process game turn");
                logger.error(e);
                reject(e);
            });
    });
}

module.exports.process = function(ordersId) {
    return new Promise(function(resolve, reject) {
        logger.debug("rules.process promise");
        let orders;
        store.read(store.keys.turnOrders, ordersId)
            .then((o) => {
                logger.debug("rules.process: retrieved orders");
                orders = o;
                const gameId = orders.gameId;
                return allTurnOrdersReceived(orders.gameId, orders.turn);
            })
            .then((complete) => {
            if (complete) {
                logger.debug("rules.process: Turn is complete; process orders");
                resolve(processGameTurn(orders.gameId));
            } else {
                logger.debug("rules.process: Turn is not yet complete");
                resolve({complete: false, msg: "Not all turn orders have been submitted."});
            }
        }).catch(reject);
    });
};

function generateTerrain() {
    return new Promise((resolve, reject) => {
        let terrain = [];
        for (let i = 0; i < 10; i++) {
            terrain.push(new Array(10));
        }
        resolve(terrain);
    });
};

module.exports.createWorld = function() {
    return new Promise((resolve, reject) => {
        generateTerrain()
            .then((terrain) => {
                resolve(store.create(store.keys.worlds, {terrain: terrain, actors: {}}));
            }).catch(reject);
    });
};
