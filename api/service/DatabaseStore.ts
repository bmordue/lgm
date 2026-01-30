'use strict';

import { inspect } from 'util';
import util = require('util');
import logger = require('../utils/Logger.js');
import { NotFoundError } from '../utils/Errors';
import { Client } from 'pg';

const STORE_DEBUG = false;

const store_debug = (obj) => { if (STORE_DEBUG) logger.debug(obj) };

// Connection pool for database operations
let dbClient: Client;

async function getDbClient(): Promise<Client> {
  if (!dbClient) {
    dbClient = new Client({
      connectionString: process.env.DATABASE_URL,
    });
    await dbClient.connect();
  }
  return dbClient;
}

export enum keys {
    games = "games",
    turnResults = "turnResults",
    turnOrders = "turnOrders",
    worlds = "worlds",
    players = "players",
    actors = "actors"
}

export async function deleteAll(): Promise<void> {
  const client = await getDbClient();
  
  // Delete all records from all tables
  await client.query('DELETE FROM turn_results;');
  await client.query('DELETE FROM turn_orders;');
  await client.query('DELETE FROM actors;');
  await client.query('DELETE FROM players;');
  await client.query('DELETE FROM games;');
  await client.query('DELETE FROM worlds;');
}

export async function create<T>(key: keys, obj: T): Promise<number> {
    store_debug("store.create");
    const client = await getDbClient();
    
    let query = '';
    let values: any[];
    
    switch (key) {
        case keys.games:
            query = `
                INSERT INTO games (host_player_id, max_players, game_state, turn, world_id, started_at)
                VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`;
            const gameData = obj as any;
            values = [
                gameData.hostPlayerId || null,
                gameData.maxPlayers || null,
                gameData.gameState || 'LOBBY',
                gameData.turn || 0,
                gameData.worldId,
                gameData.startedAt || null
            ];
            break;

        case keys.players:
            query = `
                INSERT INTO players (game_id, username, is_host, session_id)
                VALUES ($1, $2, $3, $4) RETURNING id`;
            const playerData = obj as any;
            values = [
                playerData.gameId,
                playerData.username || '',
                playerData.isHost || false,
                playerData.sessionId || null
            ];
            break;

        case keys.worlds:
            query = `
                INSERT INTO worlds (actor_ids, terrain)
                VALUES ($1, $2) RETURNING id`;
            const worldData = obj as any;
            values = [
                JSON.stringify(worldData.actorIds || []),
                JSON.stringify(worldData.terrain)
            ];
            break;

        case keys.actors:
            query = `
                INSERT INTO actors (pos, state, owner, health, weapon)
                VALUES ($1, $2, $3, $4, $5) RETURNING id`;
            const actorData = obj as any;
            values = [
                JSON.stringify(actorData.pos),
                actorData.state || 'ALIVE',
                actorData.owner,
                actorData.health || null,
                actorData.weapon ? JSON.stringify(actorData.weapon) : null
            ];
            break;

        case keys.turnOrders:
            query = `
                INSERT INTO turn_orders (game_id, turn, player_id, orders)
                VALUES ($1, $2, $3, $4) RETURNING id`;
            const turnOrdersData = obj as any;
            values = [
                turnOrdersData.gameId,
                turnOrdersData.turn,
                turnOrdersData.playerId,
                JSON.stringify(turnOrdersData.orders)
            ];
            break;

        case keys.turnResults:
            query = `
                INSERT INTO turn_results (game_id, turn, player_id, world)
                VALUES ($1, $2, $3, $4) RETURNING id`;
            const turnResultData = obj as any;
            values = [
                turnResultData.gameId,
                turnResultData.turn,
                turnResultData.playerId,
                JSON.stringify(turnResultData.world)
            ];
            break;

        default:
            throw new Error(`Unknown key: ${key}`);
    }
    
    const result = await client.query(query, values);
    return result.rows[0].id;
}

export async function read<T>(key: keys, id: number): Promise<T> {
    store_debug("store.read");
    const client = await getDbClient();
    
    let query = '';
    let result;
    
    switch (key) {
        case keys.games:
            query = 'SELECT * FROM games WHERE id = $1';
            result = await client.query(query, [id]);
            break;
            
        case keys.players:
            query = 'SELECT * FROM players WHERE id = $1';
            result = await client.query(query, [id]);
            break;
            
        case keys.worlds:
            query = 'SELECT * FROM worlds WHERE id = $1';
            result = await client.query(query, [id]);
            break;
            
        case keys.actors:
            query = 'SELECT * FROM actors WHERE id = $1';
            result = await client.query(query, [id]);
            break;
            
        case keys.turnOrders:
            query = 'SELECT * FROM turn_orders WHERE id = $1';
            result = await client.query(query, [id]);
            break;
            
        case keys.turnResults:
            query = 'SELECT * FROM turn_results WHERE id = $1';
            result = await client.query(query, [id]);
            break;
            
        default:
            throw new Error(`Unknown key: ${key}`);
    }
    
    if (!result || result.rows.length === 0) {
        throw new NotFoundError(key, id);
    }
    
    // Parse JSON fields as needed
    const record = result.rows[0];
    if (key === keys.worlds) {
        record.actor_ids = JSON.parse(record.actor_ids);
        record.terrain = JSON.parse(record.terrain);
    } else if (key === keys.actors && record.weapon) {
        record.weapon = JSON.parse(record.weapon);
    } else if (key === keys.turnOrders) {
        record.orders = JSON.parse(record.orders);
    } else if (key === keys.turnResults) {
        record.world = JSON.parse(record.world);
    }
    
    // Add the id property to match the original store behavior
    record.id = id;
    return record as T;
}

export async function readAll<T>(key: keys, filterFunc: (item: T) => boolean): Promise<Array<T>> {
    store_debug("store.readAll");
    const client = await getDbClient();
    
    let query = '';
    
    switch (key) {
        case keys.games:
            query = 'SELECT * FROM games';
            break;
            
        case keys.players:
            query = 'SELECT * FROM players';
            break;
            
        case keys.worlds:
            query = 'SELECT * FROM worlds';
            break;
            
        case keys.actors:
            query = 'SELECT * FROM actors';
            break;
            
        case keys.turnOrders:
            query = 'SELECT * FROM turn_orders';
            break;
            
        case keys.turnResults:
            query = 'SELECT * FROM turn_results';
            break;
            
        default:
            throw new Error(`Unknown key: ${key}`);
    }
    
    const result = await client.query(query);
    let records = result.rows;
    
    // Parse JSON fields as needed
    records = records.map(record => {
        if (key === keys.worlds) {
            record.actor_ids = JSON.parse(record.actor_ids);
            record.terrain = JSON.parse(record.terrain);
        } else if (key === keys.actors && record.weapon) {
            record.weapon = JSON.parse(record.weapon);
        } else if (key === keys.turnOrders) {
            record.orders = JSON.parse(record.orders);
        } else if (key === keys.turnResults) {
            record.world = JSON.parse(record.world);
        }
        
        // Add id property to match original store behavior
        record.id = record.id;
        return record;
    });
    
    // Apply the filter function
    return records.filter(filterFunc) as T[];
}

export async function replace<T>(key: keys, id: number, newObj: T): Promise<T> {
    store_debug("store.replace");
    const client = await getDbClient();
    
    let query = '';
    let values: any[];
    
    switch (key) {
        case keys.games:
            query = `
                UPDATE games 
                SET host_player_id = $1, max_players = $2, game_state = $3, turn = $4, world_id = $5, started_at = $6
                WHERE id = $7
                RETURNING *`;
            const gameData = newObj as any;
            values = [
                gameData.hostPlayerId || null,
                gameData.maxPlayers || null,
                gameData.gameState || 'LOBBY',
                gameData.turn || 0,
                gameData.worldId,
                gameData.startedAt || null,
                id
            ];
            break;
            
        case keys.players:
            query = `
                UPDATE players 
                SET game_id = $1, username = $2, is_host = $3, session_id = $4
                WHERE id = $5
                RETURNING *`;
            const playerData = newObj as any;
            values = [
                playerData.gameId,
                playerData.username || '',
                playerData.isHost || false,
                playerData.sessionId || null,
                id
            ];
            break;
            
        case keys.worlds:
            query = `
                UPDATE worlds 
                SET actor_ids = $1, terrain = $2
                WHERE id = $3
                RETURNING *`;
            const worldData = newObj as any;
            values = [
                JSON.stringify(worldData.actorIds || []),
                JSON.stringify(worldData.terrain),
                id
            ];
            break;
            
        case keys.actors:
            query = `
                UPDATE actors 
                SET pos = $1, state = $2, owner = $3, health = $4, weapon = $5
                WHERE id = $6
                RETURNING *`;
            const actorData = newObj as any;
            values = [
                JSON.stringify(actorData.pos),
                actorData.state || 'ALIVE',
                actorData.owner,
                actorData.health || null,
                actorData.weapon ? JSON.stringify(actorData.weapon) : null,
                id
            ];
            break;
            
        case keys.turnOrders:
            query = `
                UPDATE turn_orders 
                SET game_id = $1, turn = $2, player_id = $3, orders = $4
                WHERE id = $5
                RETURNING *`;
            const turnOrdersData = newObj as any;
            values = [
                turnOrdersData.gameId,
                turnOrdersData.turn,
                turnOrdersData.playerId,
                JSON.stringify(turnOrdersData.orders),
                id
            ];
            break;
            
        case keys.turnResults:
            query = `
                UPDATE turn_results 
                SET game_id = $1, turn = $2, player_id = $3, world = $4
                WHERE id = $5
                RETURNING *`;
            const turnResultData = newObj as any;
            values = [
                turnResultData.gameId,
                turnResultData.turn,
                turnResultData.playerId,
                JSON.stringify(turnResultData.world),
                id
            ];
            break;
            
        default:
            throw new Error(`Unknown key: ${key}`);
    }
    
    const result = await client.query(query, values);
    
    if (!result || result.rows.length === 0) {
        throw new NotFoundError(key, id);
    }
    
    // Parse JSON fields as needed
    let record = result.rows[0];
    if (key === keys.worlds) {
        record.actor_ids = JSON.parse(record.actor_ids);
        record.terrain = JSON.parse(record.terrain);
    } else if (key === keys.actors && record.weapon) {
        record.weapon = JSON.parse(record.weapon);
    } else if (key === keys.turnOrders) {
        record.orders = JSON.parse(record.orders);
    } else if (key === keys.turnResults) {
        record.world = JSON.parse(record.world);
    }
    
    // Add the id property to match the original store behavior
    record.id = id;
    return record as T;
}

// warning: might not work as expected for nested objects
// a = { b: { c: 1, d = 2} }
// aDiff = {b: { d: 3}}
// a after applying aDiff = {b: { d: 3}}, NOT { b: { c: 1, d = 3} }
export async function update<T>(key: keys, id: number, diffObj: T): Promise<T> {
    store_debug("store.update");
    const client = await getDbClient();
    
    // First, check if the record exists
    let checkQuery = '';
    switch (key) {
        case keys.games:
            checkQuery = 'SELECT id FROM games WHERE id = $1';
            break;
        case keys.players:
            checkQuery = 'SELECT id FROM players WHERE id = $1';
            break;
        case keys.worlds:
            checkQuery = 'SELECT id FROM worlds WHERE id = $1';
            break;
        case keys.actors:
            checkQuery = 'SELECT id FROM actors WHERE id = $1';
            break;
        case keys.turnOrders:
            checkQuery = 'SELECT id FROM turn_orders WHERE id = $1';
            break;
        case keys.turnResults:
            checkQuery = 'SELECT id FROM turn_results WHERE id = $1';
            break;
        default:
            throw new Error(`Unknown key: ${key}`);
    }
    
    const checkResult = await client.query(checkQuery, [id]);
    if (!checkResult || checkResult.rows.length === 0) {
        throw new NotFoundError(key, id);
    }
    
    // Build dynamic update query based on the properties in diffObj
    const updateFields: string[] = [];
    const values: any[] = [];
    let valueIndex = 1;
    
    const obj = diffObj as any;
    for (const field in obj) {
        if (obj.hasOwnProperty(field)) {
            // Map our object properties to database column names
            let dbField = field;
            if (field === 'hostPlayerId') dbField = 'host_player_id';
            else if (field === 'gameId') dbField = 'game_id';
            else if (field === 'isHost') dbField = 'is_host';
            else if (field === 'sessionId') dbField = 'session_id';
            else if (field === 'gameState') dbField = 'game_state';
            else if (field === 'worldId') dbField = 'world_id';
            else if (field === 'actorIds') dbField = 'actor_ids';
            else if (field === 'startedAt') dbField = 'started_at';
            
            if (field === 'actorIds' || field === 'terrain' || field === 'pos' || field === 'weapon' || field === 'orders' || field === 'world') {
                // For JSON fields, stringify the value
                values.push(JSON.stringify(obj[field]));
            } else {
                values.push(obj[field]);
            }
            
            updateFields.push(`${dbField} = $${valueIndex}`);
            valueIndex++;
        }
    }
    
    values.push(id); // Last value is the ID for WHERE clause
    
    const updateQuery = `
        UPDATE ${key}
        SET ${updateFields.join(', ')}
        WHERE id = $${valueIndex}
        RETURNING *`;
    
    const result = await client.query(updateQuery, values);
    
    if (!result || result.rows.length === 0) {
        throw new NotFoundError(key, id);
    }
    
    // Parse JSON fields as needed
    let record = result.rows[0];
    if (key === keys.worlds) {
        record.actor_ids = JSON.parse(record.actor_ids);
        record.terrain = JSON.parse(record.terrain);
    } else if (key === keys.actors && record.weapon) {
        record.weapon = JSON.parse(record.weapon);
    } else if (key === keys.turnOrders) {
        record.orders = JSON.parse(record.orders);
    } else if (key === keys.turnResults) {
        record.world = JSON.parse(record.world);
    }
    
    // Add the id property to match the original store behavior
    record.id = id;
    return record as T;
}

export async function remove<T>(key: keys, id: number): Promise<boolean> {
    store_debug("store.remove");
    const client = await getDbClient();
    
    let query = '';
    
    switch (key) {
        case keys.games:
            query = 'DELETE FROM games WHERE id = $1 RETURNING id';
            break;
            
        case keys.players:
            query = 'DELETE FROM players WHERE id = $1 RETURNING id';
            break;
            
        case keys.worlds:
            query = 'DELETE FROM worlds WHERE id = $1 RETURNING id';
            break;
            
        case keys.actors:
            query = 'DELETE FROM actors WHERE id = $1 RETURNING id';
            break;
            
        case keys.turnOrders:
            query = 'DELETE FROM turn_orders WHERE id = $1 RETURNING id';
            break;
            
        case keys.turnResults:
            query = 'DELETE FROM turn_results WHERE id = $1 RETURNING id';
            break;
            
        default:
            throw new Error(`Unknown key: ${key}`);
    }
    
    const result = await client.query(query, [id]);
    
    if (!result || result.rows.length === 0) {
        throw new NotFoundError(key, id);
    }
    
    return true;
}