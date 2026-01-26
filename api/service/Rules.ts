'use strict';

import store = require('./Store');
import logger = require('../utils/Logger');
import util = require('util');
import {
    Game, GridPosition, Direction, ActorOrders, Actor, ActorState, World,
    Terrain, TurnStatus, TurnOrders, TurnResult, OrderType, Weapon
} from './Models';
import { JoinGameResponse } from './GameService';
// Removed 'visibility' import, replaced 'hasLineOfSight' with 'getVisibleWorldForPlayer' and specific 'hasLineOfSight as combatLineOfSight'
import { getVisibleWorldForPlayer, hasLineOfSight as combatLineOfSight } from '../service/Visibility';
import { Hex } from '../Hex';

export const TIMESTEP_MAX = 10;

// Helper function to convert GridPosition to Hex
function gridPositionToHex(pos: GridPosition): Hex {
    const q = pos.y; // column is q
    const r = pos.x - (pos.y - (pos.y & 1)) / 2; // row is x, convert to axial r for odd-q
    return new Hex(q, r, -q - r); // s = -q - r
}

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
            newPos = applyDir(oldPos, 0, -1);
            break;
        }
        case Direction.DOWN_RIGHT: {
            newPos = applyDir(oldPos, 1, -1);
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
    const actor = actorOrders.actor; // Moved to top

    if (actorOrders.orderType !== OrderType.MOVE || !actorOrders.ordersList || actorOrders.ordersList.length === 0) {
        // If not a move order, or no directions, or empty directions list, return actor unchanged.
        // Explicitly checking ordersList.length === 0 as empty array might pass !actorOrders.ordersList if it's just an empty array vs undefined/null.
        return actor;
    }

    const moveDirections: Array<Direction> = actorOrders.ordersList;
    const moveDirection: Direction = timestep < moveDirections.length
        ? moveDirections[timestep]
        : Direction.NONE;

    // Removed redundant actor null check, actor is guaranteed by this point.
    // Removed redundant actor declaration.

    const newGridPos = applyDirection(actor.pos, moveDirection as Direction); // Use actor.pos directly

    // check against world.terrain boundaries
    if (newGridPos.x < 0
        || newGridPos.y < 0
        || newGridPos.x >= world.terrain.length
        || newGridPos.y >= world.terrain[newGridPos.x].length) {

        logger.debug(util.format("Actor ID %s attempted to move outside world.terrain to (%s,%s); remained at (%s,%s) instead",
            actor.id, newGridPos.x, newGridPos.y, actor.pos.x, actor.pos.y));
        return actor;
    }

    const newPosTerrain = world.terrain[newGridPos.x][newGridPos.y];

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

async function applyFiringRules(actorOrders: ActorOrders, game: Game, world: World, timestep: number): Promise<Actor> {
    const attacker = actorOrders.actor;

    if (actorOrders.orderType !== OrderType.ATTACK) {
        return attacker; // Not an attack order
    }

    if (typeof actorOrders.targetId === 'undefined') {
        logger.debug(`Actor ${attacker.id} has ATTACK order but no targetId.`);
        return attacker; // No target specified
    }

    if (!attacker.weapon) {
        logger.error(`Actor ${attacker.id} has no weapon, cannot execute ATTACK order.`);
        return attacker;
    }

    const targetActor = world.actors.find(a => a.id === actorOrders.targetId);

    if (!targetActor) {
        logger.warn(`ATTACK order: Target actor with ID ${actorOrders.targetId} not found for attacker ${attacker.id}.`);
        return attacker;
    }

    if (targetActor.state === ActorState.DEAD) {
        logger.info(`ATTACK order: Target actor ${targetActor.id} is already dead.`);
        return attacker;
    }

    if (attacker.id === targetActor.id) {
        logger.info(`ATTACK order: Actor ${attacker.id} cannot target itself.`);
        return attacker;
    }

    const startHex = gridPositionToHex(attacker.pos);
    const targetHex = gridPositionToHex(targetActor.pos);

    // 1. Check Weapon Range
    const distance = startHex.distance(targetHex); // Axial distance
    if (distance > attacker.weapon.range) {
        logger.info(`ATTACK order: Target ${targetActor.id} is out of range for ${attacker.id} (range: ${attacker.weapon.range}, distance: ${distance}).`);
        return attacker;
    }

    // 2. Check Line of Sight
    const losClear = combatLineOfSight(startHex, targetHex, world.terrain, world.actors); // Use renamed import
    if (!losClear) {
        logger.info(`ATTACK order: Line of sight from ${attacker.id} to ${targetActor.id} is blocked.`);
        return attacker;
    }

    // Apply damage
    targetActor.health -= attacker.weapon.damage;
    logger.info(`Actor ${attacker.id} attacked Actor ${targetActor.id} with ${attacker.weapon.name} for ${attacker.weapon.damage} damage. Target health now: ${targetActor.health}`);

    if (targetActor.health <= 0) {
        targetActor.health = 0; // Ensure health doesn't go negative
        targetActor.state = ActorState.DEAD;
        logger.info(`Actor ${targetActor.id} has been defeated.`);
    }

    return attacker;
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
            // Shallow clone actors to ensure all enumerable properties are on the returned objects
            updatedActors: updatedActors
                .filter((a) => a.owner == playerId)
                .map(a => ({ ...a }))
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
            return store.create<TurnResult>(store.keys.turnResults, turnResult);
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

// Wrapper for backward compatibility - delegates to Visibility.getVisibleWorldForPlayer
export async function filterWorldForPlayer(world: World, playerId: number): Promise<World> {
    const filteredWorldPayload = getVisibleWorldForPlayer(world, playerId);
    return Promise.resolve({ ...world, actors: filteredWorldPayload.actors, terrain: filteredWorldPayload.terrain });
}

export async function filterGameForPlayer(gameId: number, playerId: number): Promise<JoinGameResponse> {
    try {
        const game = await store.read<Game>(store.keys.games, gameId);
        const world = await store.read<World>(store.keys.worlds, game.worldId);
        // Use the new getVisibleWorldForPlayer from Visibility service
        const filteredWorldPayload = getVisibleWorldForPlayer(world, playerId);
        const filteredWorld: World = { ...world, actors: filteredWorldPayload.actors, terrain: filteredWorldPayload.terrain };


        const playerCount = game.players ? game.players.length : 0;
        return Promise.resolve({ 
            gameId: game.id, 
            playerId: playerId, 
            turn: game.turn, 
            world: filteredWorld,
            playerCount: playerCount,
            maxPlayers: 4
        });
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

            // Check if new x,y would place actors out of bounds for a 3x3 grid
            if (x + 2 >= world.terrain.length || y + 2 >= world.terrain[0].length) {
                logger.error(`Actor placement: new base (x:${x}, y:${y}) is out of bounds for world (${world.terrain.length}x${world.terrain[0].length}). Cannot place actors for player ${playerId}.`);
                done = true; // Exit loop, this will result in no actors for this player.
                // This situation implies the world is too full or placement logic needs improvement.
            } else {
                attempts++;
                if (attempts >= MAX_ATTEMPTS) {
                    const msg = `Actor placement: failed to place actors for new player ${playerId} after ${MAX_ATTEMPTS} attempts.`;
                    logger.error(msg);
                    done = true; // Still mark as done to exit loop, even if placement is not ideal.
                }
            }
        }
    }

    // If done is true but x,y are such that actors would be out of bounds (e.g. MAX_ATTEMPTS hit, then x,y were set too high)
    // This check is a safeguard, primary check is above.
    if (x + 2 >= world.terrain.length || y + 2 >= world.terrain[0].length) {
      if (actors.length === 0) { // Only log if we haven't already logged the error above and decided not to create actors.
        logger.warn(`Actor placement: final base position (x:${x}, y:${y}) for player ${playerId} is out of bounds. No actors will be created.`);
      }
      return []; // Return empty list of actors
    }

    const defaultWeapon: Weapon = {
        name: "Standard Issue Blaster",
        range: 5, // Example range
        damage: 10 // Example damage
        // ammo is optional, so not included here
    };

    for (let i = 0; i < 9; i++) {
        actors.push({
            owner: playerId,
            pos: { x: x + Math.floor(i / 3), y: y + i % 3 }, // Use the determined x, y for starting position
            health: 100, // Example starting health
            state: ActorState.ALIVE,
            weapon: defaultWeapon
        });
    }
    // Only proceed to create and store actors if placement was successful (i.e., x,y are valid)
    // The check for x+2, y+2 at the start of this block ensures this.
    // If actors array remained empty due to placement issues, this loop won't run.

    if (actors.length > 0) { // Should only be > 0 if valid placement was found and defaultWeapon was set.
        await Promise.all(actors.map((a) => {
            return store.create<Actor>(store.keys.actors, a as Actor);
        }));
    } else {
        // This case implies placement failed and loop for actor creation was skipped.
        // Ensure we return an empty array, consistent with the earlier return [] if x,y were bad.
        logger.warn(`Actor placement: No actors were created for player ${playerId} due to placement issues.`);
        return [];
    }
    return actors; // Returns actors if created, or an empty array if placement failed.
}