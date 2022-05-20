'use strict';

import store = require('./Store');
import logger = require('../utils/Logger');
import util = require('util');
import { Game, GridPosition, Direction, ActorOrders, Actor, ActorState, World,
    Terrain, TurnStatus, TurnOrders, TurnResult } from './Models';

export const TIMESTEP_MAX = 10;

function findOrdersForTurn(gameId, turn) {
    logger.debug("rules.ordersForTurn");
    return store.readAll(store.keys.turnOrders, (o) => {
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

function applyDirection(oldPos :GridPosition, direction :Direction) :GridPosition {
    let newPos = {
        x: oldPos.x,
        y: oldPos.y
    };
    const applyDir = function(pos, xOffset, yOffset) {
        pos.x += xOffset;
        pos.y += yOffset;
        return pos;
    }
    switch (direction) {
        case Direction.DOWN_LEFT: {
            newPos = applyDir(oldPos, -1, -1);
        }
        case Direction.DOWN_RIGHT: {
            newPos = applyDir(oldPos, 1, -1);
        }
        case Direction.LEFT: {
            newPos = applyDir(oldPos, -1, 0);
        }
        case Direction.RIGHT: {
            newPos = applyDir(oldPos, 1, 0);
        }
        case Direction.UP_LEFT: {
            newPos = applyDir(oldPos, -1, 1);
        }
        case Direction.UP_RIGHT: {
            newPos = applyDir(oldPos, 1, 1);
        }
        case Direction.NONE: {
            // no op
        }
        default: {
            logger.error(util.format("applyDirection(): unrecognised direction", direction));
        }
    }
    return newPos;
}

async function applyMovementOrders(actorOrders :ActorOrders, game :Game, world :World, timestep :number, ) :Promise<Actor>{
   const moveDirection = actorOrders.ordersList[timestep];
   const actor = actorOrders.actor;

   if (!actor) {
       const msg = "Rules.applyMovementOrders(): actor is not present in actorOrders";
       logger.error(util.format(msg));
       logger.error(util.format("%j", actorOrders));
       throw new Error(msg);
   }

   const newGridPos = applyDirection(actorOrders.actor.pos, moveDirection)
   const newPosTerrain = world.terrain[newGridPos.x][newGridPos.y];

   switch (newPosTerrain) {
       case Terrain.EMPTY: {
           actor.pos = newGridPos;
       }

       case Terrain.BLOCKED: {
            logger.debug(util.format("Actor ID %s attempted to move to blocked position at (%s,%s); remained at (%s,%s) instead",
                actor.id, newGridPos.x, newGridPos.y, actor.pos.x, actor.pos.y));
       }
       default: {
           logger.error(util.format("Unrecognised terrain type: %s", newPosTerrain));
       }
   }
   return actor;
}

async function applyFiringRules(actorOrders :ActorOrders, game :Game, world :World, timestep :number, ) :Promise<Actor> {
    const visibleEnemies = [];
    if (visibleEnemies.length > 0) {
        const target :Actor = visibleEnemies[0];
        target.state = ActorState.DEAD; // insta-kill!
    }
    return actorOrders.actor;    
}

// update actors based on turn orders
async function applyRulesToActorOrders(game :Game, world :World, allActorOrders :Array<ActorOrders>) :Promise<Array<Actor>> {
    if (!allActorOrders) {
        return [];
    }

    // iterate over timesteps!
    for (let ts = 0; ts < TIMESTEP_MAX; ts++) {
        for (let i = 0; i < allActorOrders.length; i++) {
            let ao = allActorOrders[i];
            await applyMovementOrders(ao, game, world, ts);
            await applyFiringRules(ao, game, world, ts);
        }
    }

    return allActorOrders.map((a) => a.actor);
}

function turnResultsPerPlayer(game :Game, updatedActors :Array<Actor>) :Array<TurnResult> {
    return game.players.map((playerId) => {
        return {
            gameId: game.id,
            playerId: playerId,
            turn: game.turn,
            updatedActors: updatedActors.filter((a) => a.owner == playerId)
        };
    });
}

function filterOrdersForGameTurn(o :TurnOrders, gameId, turn) {
    return o.gameId == gameId && o.turn == turn;
}

function flatten(arr :Array<any>) {
    // cf mdn article on Array.flat()
    return arr.reduce((acc, val) => acc.concat(val, []));
}

export function unique(arr :Array<any>) {
    return arr.filter((val, i, arr) => arr.indexOf(val) === i);
}

function processGameTurn(gameId) :Promise<TurnStatus> {
    return new Promise(async function(resolve, reject) {
        // load in relevant objects and do some rearranging
        let game;
        let world;
        let gameTurnOrders;
        try {
            game = await store.read<Game>(store.keys.games, gameId);
            world = await store.read<World>(store.keys.worlds, game.worldId);
    
            gameTurnOrders = await store.readAll<TurnOrders>(store.keys.turnOrders, (o) => {
                return filterOrdersForGameTurn(o, gameId, game.turn);
            });
        } catch (e) {
            logger.error("processGameTurn: failed to load stored objects");
            return reject(e);
        }

        const actorOrdersLists = gameTurnOrders.map((gto) => gto.orders);
        const flattenedActorOrders :Array<ActorOrders> = flatten(actorOrdersLists);

        // apply rules
        let updatedActors :Array<Actor>;
        logger.debug("processGameTurn: about to apply rules");
        try {
            updatedActors = await applyRulesToActorOrders(game, world, flattenedActorOrders);
        } catch (e) {
            logger.error("processGameTurn: exception thrown by applyRulesToActorOrders()");
            return reject(e.message);
        }

        // record results
        logger.debug("processGameTurn: record results");
        let playerTurnResults;
        try {
            playerTurnResults = await turnResultsPerPlayer(game, updatedActors);
        } catch (e) {
            logger.error("processGameTurn: failed to record results");
            return reject(e.message);
        }

        logger.debug(util.format("playerTurnResults length: %s", playerTurnResults.length));
        try {
            await Promise.all(playerTurnResults.map((turnResult) => {
                store.create<TurnResult>(store.keys.turnResults, turnResult); 
            }));
            } catch (e) {
            logger.error("processGameTurn: failed to store turnResults");
            return reject(e.message);
        }

        try {
            await store.update(store.keys.games, game.id, {turn: game.turn + 1});
        } catch (e) {
            logger.error("processGameTurn: failed to update game object");
            return reject(e.message);
        }
        logger.debug("rules.processGameTurn: resolve with turn status");
        resolve(<TurnStatus>{complete: true, msg: "Turn complete", turn: game.turn});
    });
}

export function process (ordersId) :Promise<TurnStatus> {
    return new Promise(async function(resolve, reject) {
        logger.debug("rules.process promise");
        const orders = await store.read<TurnOrders>(store.keys.turnOrders, ordersId);
        logger.debug("rules.process: retrieved orders");
        const complete = await allTurnOrdersReceived(orders.gameId, orders.turn);
        if (complete) {
            logger.debug("rules.process: Turn is complete; process orders");
            const status :TurnStatus = await processGameTurn(orders.gameId);
            resolve(status);
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
        actors.push({owner: playerId, pos: {x: Math.floor(i/3), y: i % 3}});
    }
    await Promise.all(actors.map((a) => {
        return store.create<Actor>(store.keys.actors, a);
    }));
    return actors;
};