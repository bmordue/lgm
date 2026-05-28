'use strict';

import * as store from './DatabaseStore';
import logger = require('../utils/Logger');
import util = require('util');
import {
    Game, GridPosition, Direction, ActorOrders, Actor, ActorState, World,
    Terrain, TurnStatus, TurnOrders, TurnResult, OrderType, Weapon
} from './Models';
import { JoinGameResponse } from './GameService';
import { getVisibleWorldForPlayer, hasLineOfSight } from '../service/Visibility';
import { Hex } from '../Hex';
import { getConfig } from '../config/GameConfig';
import { getDefaultWeapon, getWeaponDamage } from '../config/WeaponsConfig';
import * as RangeValidation from './RangeValidation';
import * as ActorPlacement from './ActorPlacement';
import { calculateDamage, applyDamage } from './CombatMath';

const config = getConfig();
export const TIMESTEP_MAX = config.timestepMax;

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

export function applyMovementOrders(actor: Actor, actorOrders: ActorOrders, world: World, timestep: number): Actor {
    if (actor.id !== actorOrders.actorId) {
        throw new Error(`Actor ID mismatch: actor.id=${actor.id}, actorOrders.actorId=${actorOrders.actorId}`);
    }

    if (actorOrders.orderType !== OrderType.MOVE || !actorOrders.ordersList || actorOrders.ordersList.length === 0) {
        return actor;
    }

    const moveDirections: Array<Direction> = actorOrders.ordersList;
    const moveDirection: Direction = timestep < moveDirections.length
        ? moveDirections[timestep]
        : Direction.NONE;

    if (moveDirection === Direction.NONE) {
        return actor;
    }

    const newGridPos = applyDirection(actor.pos, moveDirection);

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

    if (newPosTerrain === Terrain.EMPTY) {
        return {
            ...actor,
            pos: newGridPos
        };
    } else if (newPosTerrain === Terrain.BLOCKED) {
        logger.debug(util.format("Actor ID %s attempted to move to blocked position at (%s,%s); remained at (%s,%s) instead",
            actor.id, newGridPos.x, newGridPos.y, actor.pos.x, actor.pos.y));
        return actor;
    } else {
        logger.error(util.format("Unrecognised terrain type: %s", newPosTerrain));
        return actor;
    }
}

function applyFiringRules(actorOrders: ActorOrders, world: World, actorsAtStartOfTimestep: Actor[], currentActorsInTimestep: Actor[]): Actor[] {
    if (actorOrders.orderType !== OrderType.ATTACK) {
        return []; // No actors updated by this rule
    }

    const attacker = actorsAtStartOfTimestep.find(a => a.id === actorOrders.actorId);
    if (!attacker) {
        logger.warn(`Attacker actor with ID ${actorOrders.actorId} not found in world`);
        return [];
    }

    if (typeof actorOrders.targetId === 'undefined') {
        logger.debug(`Actor ${attacker.id} has ATTACK order but no targetId.`);
        return [];
    }

    if (!attacker.weapon) {
        logger.error(`Actor ${attacker.id} has no weapon, cannot execute ATTACK order.`);
        return [];
    }

    const targetAtStart = actorsAtStartOfTimestep.find(a => a.id === actorOrders.targetId);
    if (!targetAtStart) {
        logger.warn(`ATTACK order: Target actor with ID ${actorOrders.targetId} not found for attacker ${attacker.id}.`);
        return [];
    }

    // Use RangeValidation service for comprehensive validation - based on positions at start of timestep
    const validation = RangeValidation.validateAttack(attacker, targetAtStart, world, actorsAtStartOfTimestep);
    
    if (!validation.valid) {
        logger.info(`ATTACK order invalid: ${validation.errors.join(', ')}`);
        return [];
    }

    // Validation passed - calculate damage using CombatMath for full calculation
    const attackerTerrain = world.terrain[attacker.pos.x][attacker.pos.y];
    const targetTerrain = world.terrain[targetAtStart.pos.x][targetAtStart.pos.y];
    const damageResult = calculateDamage(
        attacker,
        targetAtStart,
        validation.distance,
        attackerTerrain,
        targetTerrain,
        validation.hasLineOfSight
    );

    // Apply damage to the target as it exists in the current timestep (accumulating damage)
    const targetInTimestep = currentActorsInTimestep.find(a => a.id === actorOrders.targetId);
    if (!targetInTimestep) {
        return [];
    }

    const updatedTarget = applyDamage(targetInTimestep, damageResult.finalDamage);
    
    logger.info(`Actor ${attacker.id} attacked Actor ${targetInTimestep.id} with ${attacker.weapon.name}. ${damageResult.breakdown}`);

    if (updatedTarget.state === ActorState.DEAD && targetInTimestep.state !== ActorState.DEAD) {
        logger.info(`Actor ${targetInTimestep.id} has been defeated.`);
    }

    return [updatedTarget];
}

/**
 * Core game turn simulation logic.
 * Pure function that takes current state and orders and returns updated state.
 */
export function simulateTurn(
    game: Game,
    world: World,
    orders: Array<ActorOrders>,
    actors: Array<Actor>
): { updatedActors: Array<Actor>, turnResults: Array<TurnResult> } {
    // 1. Apply rules to get updated actors
    const updatedActors = applyRulesToActorOrders(game, world, orders, actors);

    // 2. Generate turn results for each player based on updated actors and terrain
    const turnResults = game.players.map((playerId) => {
        const fullWorldState = {
            terrain: world.terrain,
            actors: updatedActors
        };
        const visibleWorld = getVisibleWorldForPlayer(fullWorldState, playerId);
        return {
            gameId: game.id,
            playerId: playerId,
            turn: game.turn,
            world: {
                terrain: visibleWorld.terrain,
                actorIds: visibleWorld.actorIds,
                actors: visibleWorld.actors
            }
        };
    });

    return { updatedActors, turnResults };
}

// update actors based on turn orders
export function applyRulesToActorOrders(game: Game, world: World, allActorOrders: Array<ActorOrders>, allActorsInWorld: Actor[]): Array<Actor> {
    if (!allActorOrders || allActorOrders.length === 0) {
        logger.warn("applyRulesToActorOrders: did not receive any orders");
        return allActorsInWorld; // Return actors unchanged
    }

    let currentActors = allActorsInWorld.map(a => ({ ...a }));

    // iterate over timesteps!
    for (let ts = 0; ts < TIMESTEP_MAX; ts++) {
        let nextActors = currentActors.map(a => ({ ...a }));

        for (let i = 0; i < allActorOrders.length; i++) {
            const ao = allActorOrders[i];

            // Apply movement - based on position at start of timestep
            if (ao.orderType === OrderType.MOVE) {
                const actorAtStart = currentActors.find(a => a.id === ao.actorId);
                if (!actorAtStart) continue;

                const updatedActor = applyMovementOrders(actorAtStart, ao, world, ts);
                if (updatedActor !== actorAtStart) {
                    const idx = nextActors.findIndex(a => a.id === updatedActor.id);
                    // Update only position to preserve other changes (like damage) in this TS
                    if (idx !== -1) {
                        nextActors[idx] = {
                            ...nextActors[idx],
                            pos: { ...updatedActor.pos }
                        };
                    }
                }
            }

            // Apply firing - based on positions at start of timestep
            if (ao.orderType === OrderType.ATTACK) {
                const updatedActors = applyFiringRules(ao, world, currentActors, nextActors);
                for (const updated of updatedActors) {
                    const idx = nextActors.findIndex(a => a.id === updated.id);
                    if (idx !== -1) {
                        nextActors[idx] = updated;
                    }
                }
            }
        }
        currentActors = nextActors;
    }

    return currentActors;
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
    // 1. Load state
    let game: Game;
    let world: World;
    let gameTurnOrders: Array<TurnOrders>;
    let allActorsInWorld: Actor[];
    try {
        game = await store.read<Game>(store.keys.games, gameId);
        world = await store.read<World>(store.keys.worlds, game.worldId);
        allActorsInWorld = await Promise.all(world.actorIds.map(id => store.read<Actor>(store.keys.actors, id)));

        gameTurnOrders = await store.readAll<TurnOrders>(store.keys.turnOrders, (o: TurnOrders) => {
            return filterOrdersForGameTurn(o, gameId, game.turn);
        });
    } catch (e) {
        logger.error("processGameTurn: failed to load stored objects");
        return Promise.reject(e);
    }

    const flattenedActorOrders: Array<ActorOrders> = flatten(gameTurnOrders.map(to => to.orders));

    // 2. Simulate turn (pure logic)
    let updatedActors: Array<Actor>;
    let playerTurnResults: TurnResult[];
    logger.debug("processGameTurn: about to simulate turn");
    try {
        const result = simulateTurn(game, world, flattenedActorOrders, allActorsInWorld);
        updatedActors = result.updatedActors;
        playerTurnResults = result.turnResults;
    } catch (e) {
        logger.error(`processGameTurn: exception during simulation: ${e.message}`);
        return Promise.reject(e.message);
    }

    // 3. Persist results
    logger.debug("processGameTurn: record results");
    try {
        await Promise.all(playerTurnResults.map((turnResult: TurnResult) => {
            return store.create<TurnResult>(store.keys.turnResults, turnResult);
        }));

        await Promise.all(updatedActors.map((actor: Actor) => {
            return store.replace(store.keys.actors, actor.id, actor);
        }));

        await store.update(store.keys.games, game.id, { turn: game.turn + 1 });
    } catch (e) {
        logger.error(`processGameTurn: failed to persist results: ${e.message}`);
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
    const terrain = emptyGrid(config.world.width, config.world.height);
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

    // Ensure that the owning player's actors are always included in the filtered
    // result. In some edge cases the visibility function can return an empty
    // actor list (e.g. unexplored world). We still want the player to see their
    // own actors immediately after joining or during turn results.
    const owningActors = actors.filter(a => a.owner === playerId);
    if (owningActors.length > 0) {
        const existingIds = new Set(visibleWorld.actors.map(a => a.id));
        for (const oa of owningActors) {
            if (!existingIds.has(oa.id)) {
                visibleWorld.actors.push(oa);
                visibleWorld.actorIds.push(oa.id);
                existingIds.add(oa.id);
            }
        }
    }

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
            gameId: game.id!,
            playerId: playerId, 
            turn: game.turn, 
            world: filteredWorld,
            playerCount: playerCount,
            maxPlayers: game.maxPlayers || config.players.maxPlayers,
            hostPlayerId: game.hostPlayerId,
            gameState: game.gameState
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
    const world = await store.read<World>(store.keys.worlds, game.worldId);
    const existingActorObjects = await Promise.all(world.actorIds.map(id => store.read<Actor>(store.keys.actors, id)));

    const ACTOR_GRID_SIZE = config.actors.formationWidth; // Formation grid size for actor placement
    const existingPlayerOrigins = ActorPlacement.getPlayerSpawnOrigins(existingActorObjects);
    const playerIndex = game.players ? game.players.indexOf(playerId) : -1;
    const spawnZones = ActorPlacement.getSpawnZonesForPlayerCount(
        Math.max(game.maxPlayers || game.players?.length || 2, 2),
        { width: world.terrain.length, height: world.terrain[0].length },
        ACTOR_GRID_SIZE
    );
    const preferredZone = playerIndex >= 0 ? spawnZones[Math.min(playerIndex, spawnZones.length - 1)] : undefined;
    const spawnOrigin = ActorPlacement.findSpawnOrigin(
        world.terrain,
        ACTOR_GRID_SIZE,
        existingActorObjects,
        existingPlayerOrigins,
        preferredZone
    );

    if (!spawnOrigin) {
        logger.error(`Actor placement: could not find any suitable position for player ${playerId}. World may be too full.`);
        return [];
    }

    const x = spawnOrigin.x;
    const y = spawnOrigin.y;
    logger.debug(util.format("Actor placement: found spawn box: (%s, %s), (%s, %s)", x, y, x + ACTOR_GRID_SIZE - 1, y + ACTOR_GRID_SIZE - 1));

    const defaultWeapon: Weapon = getDefaultWeapon();

    const newActorsData: Omit<Actor, 'id'>[] = [];
    for (let i = 0; i < config.actors.countPerPlayer; i++) {
        newActorsData.push({
            owner: playerId,
            pos: { x: x + Math.floor(i / config.actors.formationWidth), y: y + i % config.actors.formationHeight },
            health: config.actors.startingHealth,
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