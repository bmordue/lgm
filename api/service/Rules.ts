'use strict';

import * as store from './DatabaseStore';
import logger = require('../utils/Logger');
import util = require('util');
import {
    Game, GridPosition, Direction, ActorOrders, Actor, ActorState, World,
    Terrain, TurnStatus, TurnOrders, TurnResult, OrderType, Weapon
} from './Models';
import { JoinGameResponse } from './GameService';
// Removed 'visibility' import, replaced 'hasLineOfSight' with 'getVisibleWorldForPlayer' and specific 'hasLineOfSight as combatLineOfSight'
import { getVisibleWorldForPlayer, hasLineOfSight  } from '../service/Visibility';
import { Hex } from '../Hex';
import { getConfig } from '../config/GameConfig';
import { getDefaultWeapon } from '../config/WeaponsConfig';

const config = getConfig();
export const TIMESTEP_MAX = config.timestepMax;

// Store the original world state that processGameTurn loads.
// This is a bit of a module-level variable, which isn't ideal, but
// helps pass the terrain info to turnResultsPerPlayer without major refactoring of processGameTurn.
let currentTurnWorldTerrain: Terrain[][] | undefined;

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

export async function applyMovementOrders(actorOrders: ActorOrders, game: Game, world: World, timestep: number, allActorsInWorld: Actor[]): Promise<Actor> {
    const actorIndex = allActorsInWorld.findIndex(a => a.id === actorOrders.actorId);
    if (actorIndex === -1) {
        throw new Error(`Actor with ID ${actorOrders.actorId} not found in world`);
    }

    if (actorOrders.orderType !== OrderType.MOVE || !actorOrders.ordersList || actorOrders.ordersList.length === 0) {
        // If not a move order, or no directions, or empty directions list, return actor unchanged.
        // Explicitly checking ordersList.length === 0 as empty array might pass !actorOrders.ordersList if it's just an empty array vs undefined/null.
        return allActorsInWorld[actorIndex];
    }

    const moveDirections: Array<Direction> = actorOrders.ordersList;
    const moveDirection: Direction = timestep < moveDirections.length
        ? moveDirections[timestep]
        : Direction.NONE;

    const newGridPos = applyDirection(allActorsInWorld[actorIndex].pos, moveDirection as Direction); // Use actor.pos directly

    // check against world.terrain boundaries
    if (newGridPos.x < 0
        || newGridPos.y < 0
        || newGridPos.x >= world.terrain.length
        || newGridPos.y >= world.terrain[newGridPos.x].length) {

        logger.debug(util.format("Actor ID %s attempted to move outside world.terrain to (%s,%s); remained at (%s,%s) instead",
            allActorsInWorld[actorIndex].id, newGridPos.x, newGridPos.y, allActorsInWorld[actorIndex].pos.x, allActorsInWorld[actorIndex].pos.y));
        return allActorsInWorld[actorIndex];
    }

    const newPosTerrain = world.terrain[newGridPos.x][newGridPos.y];

    switch (newPosTerrain) {
        case Terrain.EMPTY: {
            // Update the actor directly in the array
            allActorsInWorld[actorIndex].pos = newGridPos;
            break;
        }

        case Terrain.BLOCKED: {
            logger.debug(util.format("Actor ID %s attempted to move to blocked position at (%s,%s); remained at (%s,%s) instead",
                allActorsInWorld[actorIndex].id, newGridPos.x, newGridPos.y, allActorsInWorld[actorIndex].pos.x, allActorsInWorld[actorIndex].pos.y));
            break;
        }
        default: {
            logger.error(util.format("Unrecognised terrain type: %s", newPosTerrain));
        }
    }

    return allActorsInWorld[actorIndex];
}

async function applyFiringRules(actorOrders: ActorOrders, game: Game, world: World, allActorsInWorld: Actor[], timestep: number): Promise<Actor> {
    const attackerIndex = allActorsInWorld.findIndex(a => a.id === actorOrders.actorId);
    if (attackerIndex === -1) {
        throw new Error(`Attacker actor with ID ${actorOrders.actorId} not found in world`);
    }

    if (actorOrders.orderType !== OrderType.ATTACK) {
        return allActorsInWorld[attackerIndex]; // Not an attack order
    }

    if (typeof actorOrders.targetId === 'undefined') {
        logger.debug(`Actor ${allActorsInWorld[attackerIndex].id} has ATTACK order but no targetId.`);
        return allActorsInWorld[attackerIndex]; // No target specified
    }

    if (!allActorsInWorld[attackerIndex].weapon) {
        logger.error(`Actor ${allActorsInWorld[attackerIndex].id} has no weapon, cannot execute ATTACK order.`);
        return allActorsInWorld[attackerIndex];
    }

    const targetIndex = allActorsInWorld.findIndex(a => a.id === actorOrders.targetId);

    if (targetIndex === -1) {
        logger.warn(`ATTACK order: Target actor with ID ${actorOrders.targetId} not found for attacker ${allActorsInWorld[attackerIndex].id}.`);
        return allActorsInWorld[attackerIndex];
    }

    if (allActorsInWorld[targetIndex].state === ActorState.DEAD) {
        logger.info(`ATTACK order: Target actor ${allActorsInWorld[targetIndex].id} is already dead.`);
        return allActorsInWorld[attackerIndex];
    }

    if (allActorsInWorld[attackerIndex].id === allActorsInWorld[targetIndex].id) {
        logger.info(`ATTACK order: Actor ${allActorsInWorld[attackerIndex].id} cannot target itself.`);
        return allActorsInWorld[attackerIndex];
    }

    const startHex = gridPositionToHex(allActorsInWorld[attackerIndex].pos);
    const targetHex = gridPositionToHex(allActorsInWorld[targetIndex].pos);

    // 1. Check Weapon Range
    const distance = startHex.distance(targetHex); // Axial distance
    if (distance < allActorsInWorld[attackerIndex].weapon.minRange || distance > allActorsInWorld[attackerIndex].weapon.maxRange) {
        logger.info(`ATTACK order: Target ${allActorsInWorld[targetIndex].id} is out of range for ${allActorsInWorld[attackerIndex].id} (min: ${allActorsInWorld[attackerIndex].weapon.minRange}, max: ${allActorsInWorld[attackerIndex].weapon.maxRange}, distance: ${distance}).`);
        return allActorsInWorld[attackerIndex];
    }

    // 2. Check Line of Sight
    const losClear = hasLineOfSight(startHex, targetHex, world.terrain, allActorsInWorld);
    if (!losClear) {
        logger.info(`ATTACK order: Line of sight from ${allActorsInWorld[attackerIndex].id} to ${allActorsInWorld[targetIndex].id} is blocked.`);
        return allActorsInWorld[attackerIndex];
    }

    // Apply damage - modify the actor directly in the array
    allActorsInWorld[targetIndex].health -= allActorsInWorld[attackerIndex].weapon.damage;
    logger.info(`Actor ${allActorsInWorld[attackerIndex].id} attacked Actor ${allActorsInWorld[targetIndex].id} with ${allActorsInWorld[attackerIndex].weapon.name} for ${allActorsInWorld[attackerIndex].weapon.damage} damage. Target health now: ${allActorsInWorld[targetIndex].health}`);

    if (allActorsInWorld[targetIndex].health <= 0) {
        allActorsInWorld[targetIndex].health = 0; // Ensure health doesn't go negative
        allActorsInWorld[targetIndex].state = ActorState.DEAD;
        logger.info(`Actor ${allActorsInWorld[targetIndex].id} has been defeated.`);
    }

    return allActorsInWorld[attackerIndex];
}

// update actors based on turn orders
export async function applyRulesToActorOrders(game: Game, world: World, allActorOrders: Array<ActorOrders>, allActorsInWorld: Actor[]): Promise<Array<Actor>> {
    if (!allActorOrders || allActorOrders.length === 0) {
        logger.warn("applyRulesToActorOrders: did not receive any orders");
        return []; // Return empty array when no orders
    }

    // iterate over timesteps!
    for (let ts = 0; ts < TIMESTEP_MAX; ts++) {
        for (let i = 0; i < allActorOrders.length; i++) {
            const ao = allActorOrders[i];
            // applyMovementOrders might also need allActorsInWorld if it checks for collisions with other actors,
            // or it might just need the terrain from the world object.
            await applyMovementOrders(ao, game, world, ts, allActorsInWorld); // Pass allActorsInWorld as well
            await applyFiringRules(ao, game, world, allActorsInWorld, ts);
        }
    }

    // Return all actors in the world (modified actors have updated state)
    // The actors in allActorOrders are references to objects in allActorsInWorld,
    // so modifications are already applied to allActorsInWorld
    return allActorsInWorld;
}

function turnResultsPerPlayer(game: Game, allUpdatedActorsThisTurn: Array<Actor>): Array<TurnResult> {
    if (!currentTurnWorldTerrain) {
        logger.error("turnResultsPerPlayer: currentTurnWorldTerrain is not set. Cannot generate player-specific worlds.");
        // Potentially return empty results or throw, depending on desired error handling
        return [];
    }
    const fullWorldStateForThisTurn: { terrain: number[][], actors: Actor[] } = {
        // id: game.worldId, // The world itself doesn't change ID, but its content does.
        actors: allUpdatedActorsThisTurn.map(a => ({ ...a })), // Use all actors after turn resolution
        terrain: currentTurnWorldTerrain // Use the terrain from the start of processGameTurn
    };

    return game.players.map((playerId) => {
        // For each player, filter the full world state to what they can see
        const visibleWorld = getVisibleWorldForPlayer(fullWorldStateForThisTurn, playerId);
        return {
            gameId: game.id,
            playerId: playerId,
            turn: game.turn,
            world: {
                terrain: visibleWorld.terrain,
                actorIds: visibleWorld.actorIds,
                actors: visibleWorld.actors // Populate actors for API response
            }
        };
    });
}

function filterOrdersForGameTurn(o: TurnOrders, gameId: number, turn: number) {
    return o.gameId == gameId && o.turn == turn;
}

// Helper function to extract actor ID from order
function extractActorId(order: ActorOrders): number | undefined {
    return order.actorId;
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
    let allActorsInWorld: Actor[];
    try {
        game = await store.read<Game>(store.keys.games, gameId);
        world = await store.read<World>(store.keys.worlds, game.worldId);
        allActorsInWorld = await Promise.all(world.actorIds.map(id => store.read<Actor>(store.keys.actors, id)));

        // Store the terrain at the start of the turn for use in turnResultsPerPlayer
        currentTurnWorldTerrain = world.terrain;

        gameTurnOrders = await store.readAll<TurnOrders>(store.keys.turnOrders, (o: TurnOrders) => {
            return filterOrdersForGameTurn(o, gameId, game.turn);
        });
    } catch (e) {
        logger.error("processGameTurn: failed to load stored objects");
        return Promise.reject(e);
    }

    // No need to map actor IDs to objects anymore since ActorOrders now only uses IDs
    const actorOrdersLists = gameTurnOrders.map((to: TurnOrders) => {
        return to.orders;
    });
    const flattenedActorOrders: Array<ActorOrders> = flatten(actorOrdersLists);

    // apply rules
    let updatedActors: Array<Actor>;
    logger.debug("processGameTurn: about to apply rules");
    try {
        // Pass allActorsInWorld to applyRulesToActorOrders
        updatedActors = await applyRulesToActorOrders(game, world, flattenedActorOrders, allActorsInWorld);
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

    // Save updated actors back to the store
    try {
        await Promise.all(updatedActors.map((actor: Actor) => {
            return store.replace(store.keys.actors, actor.id, actor);
        }));
    } catch (e) {
        logger.error("processGameTurn: failed to update actors");
        return Promise.reject(e.message);
    }

    try {
        await store.update(store.keys.games, game.id, { turn: game.turn + 1 });
    } catch (e) {
        logger.error("processGameTurn: failed to update game object");
        return Promise.reject(e.message);
    }
    logger.debug("rules.processGameTurn: resolve with turn status");
    return Promise.resolve(<TurnStatus>{ complete: true, msg: "Turn complete", turn: game.turn + 1 });
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
        return Promise.resolve(store.create<World>(store.keys.worlds, { terrain: terrain, actorIds: [] }));
    } catch (e) {
        return Promise.reject(e);
    }
}

export async function filterWorldForPlayer(world: World, playerId: number, allActors?: Actor[]): Promise<World> {
    const actors = allActors || await Promise.all(world.actorIds.map(id => store.read<Actor>(store.keys.actors, id)));

    // Use the new getVisibleWorldForPlayer from Visibility service
    const visibleWorld = getVisibleWorldForPlayer({ terrain: world.terrain, actors }, playerId);

    return Promise.resolve({
        ...world,
        actorIds: visibleWorld.actorIds,
        actors: visibleWorld.actors, // Populate actors for API response
        terrain: visibleWorld.terrain
    });
}

export async function filterGameForPlayer(gameId: number, playerId: number): Promise<JoinGameResponse> {
    try {
        const game = await store.read<Game>(store.keys.games, gameId);
        const world = await store.read<World>(store.keys.worlds, game.worldId);
        
        const filteredWorld = await filterWorldForPlayer(world, playerId);


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
    const actorPromises: Promise<Actor>[] = [];
    const world = await store.read<World>(store.keys.worlds, game.worldId);
    const existingActorObjects = await Promise.all(world.actorIds.map(id => store.read<Actor>(store.keys.actors, id)));

    // Find an unoccupied spot using a more intelligent algorithm
    const ACTOR_GRID_SIZE = 3; // 3x3 grid of actors
    const MAX_ATTEMPTS = 50; // Increased attempts for better search
    let placed = false;
    let attempts = 0;
    let x = 0;
    let y = 0;

    // Helper function to check if an area is empty
    const isAreaEmpty = (x: number, y: number, size: number, actors: Actor[]): boolean => {
        return !actors.some(actor =>
            actor.pos.x >= x &&
            actor.pos.x < x + size &&
            actor.pos.y >= y &&
            actor.pos.y < y + size
        );
    };

    // Create a list of all possible positions to try, shuffled for randomness
    const possiblePositions = [];
    for (let row = 0; row <= world.terrain.length - ACTOR_GRID_SIZE; row++) {
        for (let col = 0; col <= world.terrain[0].length - ACTOR_GRID_SIZE; col++) {
            possiblePositions.push({x: row, y: col});
        }
    }

    // Shuffle the positions for random placement
    for (let i = possiblePositions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [possiblePositions[i], possiblePositions[j]] = [possiblePositions[j], possiblePositions[i]];
    }

    // Try each position until we find one that works
    for (const pos of possiblePositions) {
        if (attempts >= MAX_ATTEMPTS) break;

        x = pos.x;
        y = pos.y;

        // Check if this position is suitable (no other actors in the 3x3 area)
        const empty = isAreaEmpty(x, y, ACTOR_GRID_SIZE, existingActorObjects);

        if (empty) {
            placed = true;
            logger.debug(util.format("Actor placement: found an empty box: (%s, %s), (%s, %s)", x, y, x + ACTOR_GRID_SIZE - 1, y + ACTOR_GRID_SIZE - 1));
            break;
        }

        attempts++;
    }

    // If we couldn't find a suitable position after many attempts
    if (!placed) {
        logger.warn(`Actor placement: failed to find suitable position for player ${playerId} after ${MAX_ATTEMPTS} attempts. Using fallback placement.`);

        // Fallback: try to find any available space by scanning the map systematically
        placed = false;
        for (let row = 0; row <= world.terrain.length - ACTOR_GRID_SIZE && !placed; row++) {
            for (let col = 0; col <= world.terrain[0].length - ACTOR_GRID_SIZE && !placed; col++) {
                x = row;
                y = col;

                const empty = isAreaEmpty(x, y, ACTOR_GRID_SIZE, existingActorObjects);

                if (empty) {
                    placed = true;
                    logger.debug(util.format("Actor placement: found fallback position: (%s, %s)", x, y));
                }
            }
        }
    }

    // If still couldn't place, return empty array
    if (!placed) {
        logger.error(`Actor placement: could not find any suitable position for player ${playerId}. World may be too full.`);
        return [];
    }

    const defaultWeapon: Weapon = getDefaultWeapon();

    const newActorsData: Omit<Actor, 'id'>[] = [];
    for (let i = 0; i < 9; i++) {
        newActorsData.push({
            owner: playerId,
            pos: { x: x + Math.floor(i / 3), y: y + i % 3 }, // Use the determined x, y for starting position
            health: 100, // Example starting health
            state: ActorState.ALIVE,
            weapon: defaultWeapon
        });
    }

    if (newActorsData.length > 0) {
        const createdActorPromises = newActorsData.map(async (actorData) => {
            const id = await store.create<Omit<Actor, 'id'>>(store.keys.actors, actorData);
            return id;
        });
        const createdActorIds = await Promise.all(createdActorPromises);
        return createdActorIds;
    } else {
        logger.warn(`Actor placement: No actors were created for player ${playerId} due to placement issues.`);
        return [];
    }
}