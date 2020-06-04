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

function calculateOutcome() {
    return new Promise((resolve, reject) => {
        resolve("unknown!");
    });
}

function recordPlayerTurnResult(game, turn, playerId) {
    return new Promise((resolve, reject) => {
        calculateOutcome(game, turn, playerId)
            .then((outcome) => {
                resolve(store.create(store.keys.turnResults, {gameId: game.id, turn: turn, playerId: playerId, outcome: outcome}));
            })
            .catch(reject);
    });
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
            .then((idArray) => {
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
            let row = '..........';
            terrain.push(row);
        }
        resolve(terrain);
    });
};

module.exports.createWorld = function() {
    return new Promise((resolve, reject) => {
        generateTerrain()
            .then((terrain) => {
                resolve(store.create(store.keys.worlds, {terrain: terrain, actors: []}));
            }).catch(reject);
    });
};

function filterWorldForPlayer(world, playerId) {
    return world; // everyone can see everything!
}

module.exports.filterGameForPlayer = function(gameId, playerId) {
    return new Promise((resolve, reject) => {
        let game;
        store.read(store.keys.games, gameId)
            .then((g) => {
                game = g;
                return store.read(store.keys.worlds, game.worldId);
            })
            .then((world) => {
                return filterWorldForPlayer(world, playerId);
            })
            .then((filteredWorld) => {
                resolve({ gameId: game.id, playerId: playerId, turn: game.turn, world: filteredWorld});
            })
            .catch(reject);
    });
};

module.exports.setupActors = function(game, playerId) {
    return [];
    // return new Promise((resolve, reject) => {
    //     resolve([]);
    // }).catch(reject);
};