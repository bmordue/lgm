'use strict';

import store = require('./Store');
import logger = require('../utils/Logger');
import util = require('util');
import {
    Game, GridPosition, Direction, ActorOrders, Actor, ActorState, World,
    Terrain, TurnStatus, TurnOrders, TurnResult
} from './Models';
import { JoinGameResponse } from './DefaultService';

export const TIMESTEP_MAX = 10;

function findOrdersForTurn(gameId: number, turn: number) {
    logger.debug("rules.ordersForTurn");
    return store.readAll<TurnOrders>(store.keys.turnOrders, (o: { gameId: number; turn: number; }) => {
        return o.gameId == gameId && o.turn == turn;
    });
}

async function allTurnOrdersReceived(gameId: number, turn: number) {
    logger.debug("rules.allTurnOrdersReceived promise");
    const results = await Promise.all([
        findOrdersForTurn(gameId, turn),
        store.read<Game>(store.keys.games, gameId)
    ])
    const orders = results[0];
    const game = results[1];
    logger.debug(util.format("rules.allTurnOrdersReceived: orders.length: %s; game.players.length: %s", orders.length, game.players.length));
    return Promise.resolve(orders.length == game.players.length);
}

export function applyDirection(oldPos: GridPosition, direction: Direction): GridPosition {
    let newPos = {
        x: oldPos.x,
        y: oldPos.y
    };
    const applyDir = function (pos: GridPosition, xOffset: number, yOffset: number) {
        return { x: pos.x + xOffset, y: pos.y + yOffset };
    }
    switch (direction) {
        case Direction.DOWN_LEFT: {
            newPos = applyDir(oldPos, -1, -1);
            break;
        }
        case Direction.DOWN_RIGHT: {
            newPos = applyDir(oldPos, 0, -1);
            break;
        }
        case Direction.LEFT: {
            newPos = applyDir(oldPos, -1, 0);
            break;
        }
        case Direction.RIGHT: {
            newPos = applyDir(oldPos, 1, 0);
            break;
        }
        case Direction.UP_LEFT: {
            newPos = applyDir(oldPos, -1, 1);
            break;
        }
        case Direction.UP_RIGHT: {
            newPos = applyDir(oldPos, 0, 1);
            break;
        }
        case Direction.NONE: {
            // no op
            break;
        }
        default: {
            const msg = util.format("applyDirection(): unrecognised direction", direction);
            throw new Error(msg);
        }
    }
    return newPos;
}

export async function applyMovementOrders(actorOrders: ActorOrders, game: Game, world: World, timestep: number,): Promise<Actor> {


    const moveDirection = timestep < actorOrders.ordersList.length
        ? actorOrders.ordersList[timestep]
        : Direction.NONE;

    const actor = actorOrders.actor;

    if (!actor) {
        const msg = "Rules.applyMovementOrders(): actor is not present in actorOrders";
        logger.error(util.format(msg));
        logger.error(util.format("%j", actorOrders));
        throw new Error(msg);
    }

    const newGridPos = applyDirection(actorOrders.actor.pos, moveDirection);
    const newPosTerrain = world.terrain[newGridPos.x][newGridPos.y];

    console.log(util.inspect(newPosTerrain, null, 2));

    switch (newPosTerrain) {
        case Terrain.EMPTY: {
            actor.pos = newGridPos;
            break;
        }

        case Terrain.BLOCKED: {
            logger.debug(util.format("Actor ID %s attempted to move to blocked position at (%s,%s); remained at (%s,%s) instead",
                actor.id, newGridPos.x, newGridPos.y, actor.pos.x, actor.pos.y));
            break;
        }
        default: {
            logger.error(util.format("Unrecognised terrain type: %s", newPosTerrain));
        }
    }
    return actor;
}

async function applyFiringRules(actorOrders: ActorOrders, game: Game, world: World, timestep: number,): Promise<Actor> {
    const visibleEnemies = [];
    if (visibleEnemies.length > 0) {
        const target: Actor = visibleEnemies[0];
        target.state = ActorState.DEAD; // insta-kill!
    }
    return actorOrders.actor;
}

// update actors based on turn orders
export async function applyRulesToActorOrders(game: Game, world: World, allActorOrders: Array<ActorOrders>): Promise<Array<Actor>> {
    if (!allActorOrders || allActorOrders.length === 0) {
        logger.warn("applyRulesToActorOrders: did not receive any orders");
        return [];
    }

    // iterate over timesteps!
    for (let ts = 0; ts < TIMESTEP_MAX; ts++) {
        for (let i = 0; i < allActorOrders.length; i++) {
            const ao = allActorOrders[i];
            await applyMovementOrders(ao, game, world, ts);
            await applyFiringRules(ao, game, world, ts);
        }
    }

    return allActorOrders.map((a: ActorOrders) => a.actor);
}

function turnResultsPerPlayer(game: Game, updatedActors: Array<Actor>): Array<TurnResult> {
    return game.players.map((playerId) => {
        return {
            gameId: game.id,
            playerId: playerId,
            turn: game.turn,
            updatedActors: updatedActors.filter((a) => a.owner == playerId)
        };
    });
}

function filterOrdersForGameTurn(o: TurnOrders, gameId: number, turn: number) {
    return o.gameId == gameId && o.turn == turn;
}

export function flatten<T>(arr: Array<Array<T>>): Array<T> {
    // cf mdn article on Array.flat()
    return arr.reduce((acc: Array<T>, val: Array<T>) => acc.concat(val, [])) as Array<T>;
}

export function unique(arr: Array<unknown>) {
    return arr.filter((val, i, arr) => arr.indexOf(val) === i);
}

async function processGameTurn(gameId: number): Promise<TurnStatus> {
    // load in relevant objects and do some rearranging
    let game: Game;
    let world: World;
    let gameTurnOrders: Array<TurnOrders>;
    try {
        game = await store.read<Game>(store.keys.games, gameId);
        world = await store.read<World>(store.keys.worlds, game.worldId);

        gameTurnOrders = await store.readAll<TurnOrders>(store.keys.turnOrders, (o: TurnOrders) => {
            return filterOrdersForGameTurn(o, gameId, game.turn);
        });
    } catch (e) {
        logger.error("processGameTurn: failed to load stored objects");
        return Promise.reject(e);
    }

    const actorOrdersLists = gameTurnOrders.map((to: TurnOrders) => to.orders);
    const flattenedActorOrders: Array<ActorOrders> = flatten(actorOrdersLists);

    // apply rules
    let updatedActors: Array<Actor>;
    logger.debug("processGameTurn: about to apply rules");
    try {
        updatedActors = await applyRulesToActorOrders(game, world, flattenedActorOrders);
    } catch (e) {
        logger.error("processGameTurn: exception thrown by applyRulesToActorOrders()");
        return Promise.reject(e.message);
    }

    // record results
    logger.debug("processGameTurn: record results");
    let playerTurnResults: TurnResult[];
    try {
        playerTurnResults = turnResultsPerPlayer(game, updatedActors);
    } catch (e) {
        logger.error("processGameTurn: failed to record results");
        return Promise.reject(e.message);
    }

    logger.debug(util.format("playerTurnResults length: %s", playerTurnResults.length));
    try {
        await Promise.all(playerTurnResults.map((turnResult: TurnResult) => {
            store.create<TurnResult>(store.keys.turnResults, turnResult);
        }));
    } catch (e) {
        logger.error("processGameTurn: failed to store turnResults");
        return Promise.reject(e.message);
    }

    try {
        await store.update(store.keys.games, game.id, { turn: game.turn + 1 });
    } catch (e) {
        logger.error("processGameTurn: failed to update game object");
        return Promise.reject(e.message);
    }
    logger.debug("rules.processGameTurn: resolve with turn status");
    return Promise.resolve(<TurnStatus>{ complete: true, msg: "Turn complete", turn: game.turn });
}

export async function process(ordersId: number): Promise<TurnStatus> {
    logger.debug("rules.process promise");
    const orders = await store.read<TurnOrders>(store.keys.turnOrders, ordersId);
    logger.debug("rules.process: retrieved orders");
    const complete = await allTurnOrdersReceived(orders.gameId, orders.turn);
    if (complete) {
        logger.debug("rules.process: Turn is complete; process orders");
        const status: TurnStatus = await processGameTurn(orders.gameId);
        return Promise.resolve(status);
    } else {
        logger.debug("rules.process: Turn is not yet complete");
        return Promise.resolve({ complete: false, msg: "Not all turn orders have been submitted." });
    }
}

function emptyGrid(xMax: number, yMax: number) {
    const terrain = [];
    terrain.push();
    for (let i = 0; i < xMax; i++) {
        const row = [];
        for (let j = 0; j < yMax; j++) {
            row.push(Terrain.EMPTY);
        }
        terrain.push(row);
    }
    return terrain;
}

export async function generateTerrain(): Promise<Array<Array<Terrain>>> {
    const terrain = emptyGrid(10, 10);
    terrain[1][3] = Terrain.BLOCKED;
    terrain[2][3] = Terrain.BLOCKED;
    terrain[3][0] = Terrain.BLOCKED;
    terrain[3][1] = Terrain.BLOCKED;
    terrain[3][4] = Terrain.BLOCKED;
    terrain[4][6] = Terrain.BLOCKED;
    terrain[4][7] = Terrain.BLOCKED;
    terrain[5][2] = Terrain.BLOCKED;
    terrain[5][3] = Terrain.BLOCKED;
    terrain[5][7] = Terrain.BLOCKED;
    terrain[5][8] = Terrain.BLOCKED;
    terrain[6][5] = Terrain.BLOCKED;
    terrain[7][4] = Terrain.BLOCKED;
    terrain[8][4] = Terrain.BLOCKED;

    return Promise.resolve(terrain);
}

export async function createWorld(): Promise<number> {
    try {
        const terrain = await generateTerrain();
        return Promise.resolve(store.create<World>(store.keys.worlds, { terrain: terrain, actors: [] }));
    } catch (e) {
        return Promise.reject(e);
    }
}

async function filterWorldForPlayer(world: World, playerId: number): Promise<World> {
    return Promise.resolve(world); // TODO: everyone can see everything!
}

export async function filterGameForPlayer(gameId: number, playerId: number): Promise<JoinGameResponse> {
    try {
        const game = await store.read<Game>(store.keys.games, gameId);
        const world = await store.read<World>(store.keys.worlds, game.worldId);
        const filteredWorld = await filterWorldForPlayer(world, playerId);
        return Promise.resolve({ gameId: game.id, playerId: playerId, turn: game.turn, world: filteredWorld });
    } catch (e) {
        return Promise.reject(e);
    }
}

function inBox(item: Actor, left: number, bottom: number, right: number, top: number) {
    return item.pos.x >= left
        && item.pos.x <= right
        && item.pos.y >= bottom
        && item.pos.y <= top;
}

export async function setupActors(game: Game, playerId: number) {
    const actors = [];
    const world = await store.read<World>(store.keys.worlds, game.worldId);
    const existingActors = world.actors;
    // find an unoccupied spot
    const MAX_ATTEMPTS = 5;
    let done = false;
    let attempts = 0;
    let x = 0;
    let y = 0;
    while (!done) {
        const empty = existingActors
            .filter(actor => inBox(actor, x, y, x + 2, y + 2))
            .length == 0;

        if (empty) {
            done = true;
            logger.debug(util.format("Actor placement: found an empty box: (%s, %s), (%s, %s)", x, y, x + 2, y + 2));
        } else {
            x += 2; // TODO this is a real poor way to place actors!!
            y += 2;

            attempts++;
            if (attempts >= MAX_ATTEMPTS) {
                const msg = "Actor placement: failed to place actors for new player";
                logger.error(msg);
                done = true;
            }
        }
    }

    for (let i = 0; i < 9; i++) {
        actors.push({ owner: playerId, pos: { x: Math.floor(i / 3), y: i % 3 } });
    }
    await Promise.all(actors.map((a) => {
        return store.create<Actor>(store.keys.actors, a);
    }));
    return actors;
}