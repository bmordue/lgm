'use strict';

import store = require('./Store');
import logger = require('../utils/Logger');
import util = require('util');

function findOrdersForTurn(gameId, turn) {
    logger.debug("rules.ordersForTurn");
    return store.readAll(store.keys.turnOrders, (o) => {
        logger.debug("findOrdersForTurn filter applied");
        return o.gameId == gameId && o.turn == turn;
    });
}

function allTurnOrdersReceived(gameId :number, turn :number) {
    return new Promise(async function(resolve, reject) {
        logger.debug("rules.allTurnOrdersReceived promise");
        const results = await Promise.all([
            findOrdersForTurn(gameId, turn),
            store.read<Game>(store.keys.games, gameId)
        ])
        const orders = results[0];
        const game = results[1];
        logger.debug(util.format("rules.allTurnOrdersReceived: orders.length: %s; game.players.length: %s", orders.length, game.players.length));
        resolve(orders.length == game.players.length);
    });
}

// function filterOrdersForPlayerTurn(orders) {
//     return orders.
// }

function calculateOutcome(game, turn, playerId) {
    return new Promise(async function(resolve, reject) {
        // const player = await store.read(store.keys.players, playerId);
        // const orders = await store.readAll(store.keys.turnOrders, (o) => {
        //     return filterOrdersForPlayerTurn(o, );
        // });

        resolve("unknown!");
    });
}

function recordPlayerTurnResult(game, turn, playerId) {
    return new Promise(async function(resolve, reject) {
        try {
            const outcome = await calculateOutcome(game, turn, playerId);
            resolve(store.create(store.keys.turnResults, {gameId: game.id, turn: turn, playerId: playerId, outcome: outcome}));
        } catch (e) {
            reject(e);
        }
    });
}

function processGameTurn(gameId) {
    return new Promise(async function(resolve, reject) {
        try {
            const game = await store.read<Game>(store.keys.games, gameId);
            //const orders = await store.readAll(store.keys.turnOrders, filterFn);
            logger.debug("rules.processGameTurn: update turn result for each player");
            const idArray = await Promise.all(game.players.map((p) => recordPlayerTurnResult(game, game.turn, p)));
            logger.debug("rules.processGameTurn: incr turn number");

            await store.update(store.keys.games, game.id, {turn: game.turn + 1});
            logger.debug("rules.processGameTurn: resolve with turn status");
            resolve({complete: true, msg: "Turn complete", turn: game.turn});
        } catch(e) {
            logger.error("Failed to process game turn");
            logger.error(e);
            reject(e);
        }
    });
}

export function process (ordersId) {
    return new Promise(async function(resolve, reject) {
        logger.debug("rules.process promise");
        const orders = await store.read<TurnOrders>(store.keys.turnOrders, ordersId);
        logger.debug("rules.process: retrieved orders");
        const complete = await allTurnOrdersReceived(orders.gameId, orders.turn);
        if (complete) {
            logger.debug("rules.process: Turn is complete; process orders");
            resolve(processGameTurn(orders.gameId));
        } else {
            logger.debug("rules.process: Turn is not yet complete");
            resolve({complete: false, msg: "Not all turn orders have been submitted."});
        }
    });
};

function generateTerrain() {
    return new Promise(async function(resolve, reject) {
        let terrain = [];
        for (let i = 0; i < 10; i++) {
            let row = '..........';
            terrain.push(row);
        }
        resolve(terrain);
    });
};

export function createWorld() :Promise<number> {
    return new Promise(async function(resolve, reject) {
        try {
            let terrain = await generateTerrain();
            resolve(store.create(store.keys.worlds, {terrain: terrain, actors: []}));
        } catch (e) {
            reject(e);
        }
    });
};

function filterWorldForPlayer(world, playerId) {
    return world; // TODO: everyone can see everything!
}

export function filterGameForPlayer (gameId, playerId) {
    return new Promise(async function(resolve, reject) {
        try {
            let game = await store.read<Game>(store.keys.games, gameId);
            let world = await store.read(store.keys.worlds, game.worldId);
            let filteredWorld = await filterWorldForPlayer(world, playerId);
            resolve({ gameId: game.id, playerId: playerId, turn: game.turn, world: filteredWorld});
        } catch (e) {
            reject(e);
        }
    });
};

function inBox(item, left, bottom, right, top) {
    return item.pos.x >= left
        && item.pos.x <= right
        && item.pos.y >= bottom
        && item.pos.y <= top;
}

export async function setupActors(game, playerId) {
    let actors = [];
    let world = await store.read<World>(store.keys.worlds, game.worldId);
    const existingActors = world.actors;
    // find an unoccupied spot
    const MAX_ATTEMPTS = 5;
    let done = false;
    let attempts = 0;
    let x = 0;
    let y = 0;
    while (!done) {
        let empty = existingActors
            .filter(actor => inBox(actor, x, y, x + 2, y + 2))
            .length == 0;

        if (empty) {
            done = true;
            logger.debug(util.format("Found an empty box: (%s, %s), (%s, %s)", x, y, x + 2, y + 2));
        }

        attempts++;
        if (attempts >= MAX_ATTEMPTS) {
            const msg = "failed to place actors for new player";
            logger.error(msg);
            done = true;
        }
    }

    for (let i = 0; i < 9; i++) {
        actors.push({owner: playerId, id: playerId * 1000 + i, pos: {x: Math.floor(i/3), y: i % 3}});
    }
    return actors;
};