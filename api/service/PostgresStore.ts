'use strict';

import { Client } from 'pg';
import { Store, keys } from './StoreInterface';
import { NotFoundError } from '../utils/Errors';
import logger = require('../utils/Logger.js');

const STORE_DEBUG = false;
const store_debug = (obj) => { if (STORE_DEBUG) logger.debug(obj) };

export class PostgresStore implements Store {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  private mapDbRecordToModel(record: any, key: keys): any {
    const mappedRecord: any = { ...record };

    // Map common snake_case fields to camelCase
    if (record.host_player_id !== undefined) {
      mappedRecord.hostPlayerId = record.host_player_id;
      delete mappedRecord.host_player_id;
    }
    if (record.max_players !== undefined) {
      mappedRecord.maxPlayers = record.max_players;
      delete mappedRecord.max_players;
    }
    if (record.game_state !== undefined) {
      mappedRecord.gameState = record.game_state;
      delete mappedRecord.game_state;
    }
    if (record.world_id !== undefined) {
      mappedRecord.worldId = record.world_id;
      delete mappedRecord.world_id;
    }
    if (record.created_at !== undefined) {
      mappedRecord.createdAt = record.created_at;
      delete mappedRecord.created_at;
    }
    if (record.started_at !== undefined) {
      mappedRecord.startedAt = record.started_at;
      delete mappedRecord.started_at;
    }
    if (record.game_id !== undefined) {
      mappedRecord.gameId = record.game_id;
      delete mappedRecord.game_id;
    }
    if (record.is_host !== undefined) {
      mappedRecord.isHost = record.is_host;
      delete mappedRecord.is_host;
    }
    if (record.joined_at !== undefined) {
      mappedRecord.joinedAt = record.joined_at;
      delete mappedRecord.joined_at;
    }
    if (record.session_id !== undefined) {
      mappedRecord.sessionId = record.session_id;
      delete mappedRecord.session_id;
    }
    if (record.player_id !== undefined) {
      mappedRecord.playerId = record.player_id;
      delete mappedRecord.player_id;
    }

    // Parse and map JSON fields based on key type
    if (key === keys.worlds) {
      if (record.actor_ids != null) {
        mappedRecord.actorIds = JSON.parse(record.actor_ids);
        delete mappedRecord.actor_ids;
      }
      if (record.terrain != null) {
        mappedRecord.terrain = JSON.parse(record.terrain);
      }
    } else if (key === keys.actors) {
      if (record.pos != null) {
        mappedRecord.pos = JSON.parse(record.pos);
      }
      if (record.weapon != null) {
        mappedRecord.weapon = JSON.parse(record.weapon);
      }
    } else if (key === keys.turnOrders && record.orders) {
      mappedRecord.orders = JSON.parse(record.orders);
    } else if (key === keys.turnResults && record.world) {
      mappedRecord.world = JSON.parse(record.world);
    }

    return mappedRecord;
  }

  async deleteAll(): Promise<void> {
    await this.client.query('DELETE FROM turn_results;');
    await this.client.query('DELETE FROM turn_orders;');
    await this.client.query('DELETE FROM actors;');
    await this.client.query('DELETE FROM players;');
    await this.client.query('DELETE FROM games;');
    await this.client.query('DELETE FROM worlds;');
  }

  async create<T>(key: keys, obj: T): Promise<number> {
    store_debug("PostgresStore.create");
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

    const result = await this.client.query(query, values);
    return result.rows[0].id;
  }

  async read<T>(key: keys, id: number): Promise<T> {
    store_debug("PostgresStore.read");
    let query = '';
    let result;

    switch (key) {
      case keys.games:
        query = 'SELECT * FROM games WHERE id = $1';
        result = await this.client.query(query, [id]);
        break;
      case keys.players:
        query = 'SELECT * FROM players WHERE id = $1';
        result = await this.client.query(query, [id]);
        break;
      case keys.worlds:
        query = 'SELECT * FROM worlds WHERE id = $1';
        result = await this.client.query(query, [id]);
        break;
      case keys.actors:
        query = 'SELECT * FROM actors WHERE id = $1';
        result = await this.client.query(query, [id]);
        break;
      case keys.turnOrders:
        query = 'SELECT * FROM turn_orders WHERE id = $1';
        result = await this.client.query(query, [id]);
        break;
      case keys.turnResults:
        query = 'SELECT * FROM turn_results WHERE id = $1';
        result = await this.client.query(query, [id]);
        break;
      default:
        throw new Error(`Unknown key: ${key}`);
    }

    if (!result || result.rows.length === 0) {
      throw new NotFoundError(key, id);
    }

    const record = this.mapDbRecordToModel(result.rows[0], key);
    record.id = id;
    return record as T;
  }

  async readAll<T>(key: keys, filterFunc: (item: T) => boolean): Promise<Array<T>> {
    store_debug("PostgresStore.readAll");
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

    const result = await this.client.query(query);
    let records = result.rows.map(record => {
      const mappedRecord = this.mapDbRecordToModel(record, key);
      mappedRecord.id = record.id;
      return mappedRecord;
    });

    return records.filter(filterFunc) as T[];
  }

  async replace<T>(key: keys, id: number, newObj: T): Promise<T> {
    store_debug("PostgresStore.replace");
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

    const result = await this.client.query(query, values);
    if (!result || result.rows.length === 0) {
      throw new NotFoundError(key, id);
    }
    const record = this.mapDbRecordToModel(result.rows[0], key);
    record.id = id;
    return record as T;
  }

  async update<T>(key: keys, id: number, diffObj: T): Promise<T> {
    store_debug("PostgresStore.update");

    // First, check if the record exists
    let checkQuery = '';
    switch (key) {
      case keys.games: checkQuery = 'SELECT id FROM games WHERE id = $1'; break;
      case keys.players: checkQuery = 'SELECT id FROM players WHERE id = $1'; break;
      case keys.worlds: checkQuery = 'SELECT id FROM worlds WHERE id = $1'; break;
      case keys.actors: checkQuery = 'SELECT id FROM actors WHERE id = $1'; break;
      case keys.turnOrders: checkQuery = 'SELECT id FROM turn_orders WHERE id = $1'; break;
      case keys.turnResults: checkQuery = 'SELECT id FROM turn_results WHERE id = $1'; break;
      default: throw new Error(`Unknown key: ${key}`);
    }

    const checkResult = await this.client.query(checkQuery, [id]);
    if (!checkResult || checkResult.rows.length === 0) {
      throw new NotFoundError(key, id);
    }

    const updateFields: string[] = [];
    const values: any[] = [];
    let valueIndex = 1;
    const obj = diffObj as any;

    for (const field in obj) {
      if (obj.hasOwnProperty(field)) {
        let dbField = field;
        if (field === 'hostPlayerId') dbField = 'host_player_id';
        else if (field === 'gameId') dbField = 'game_id';
        else if (field === 'isHost') dbField = 'is_host';
        else if (field === 'sessionId') dbField = 'session_id';
        else if (field === 'gameState') dbField = 'game_state';
        else if (field === 'worldId') dbField = 'world_id';
        else if (field === 'actorIds') dbField = 'actor_ids';
        else if (field === 'startedAt') dbField = 'started_at';

        if (['actorIds', 'terrain', 'pos', 'weapon', 'orders', 'world'].includes(field)) {
          values.push(JSON.stringify(obj[field]));
        } else {
          values.push(obj[field]);
        }
        updateFields.push(`${dbField} = $${valueIndex}`);
        valueIndex++;
      }
    }

    values.push(id);
    const updateQuery = `UPDATE ${key} SET ${updateFields.join(', ')} WHERE id = $${valueIndex} RETURNING *`;
    const result = await this.client.query(updateQuery, values);

    if (!result || result.rows.length === 0) {
      throw new NotFoundError(key, id);
    }
    const record = this.mapDbRecordToModel(result.rows[0], key);
    record.id = id;
    return record as T;
  }

  async remove<T>(key: keys, id: number): Promise<boolean> {
    store_debug("PostgresStore.remove");
    let query = '';
    switch (key) {
      case keys.games: query = 'DELETE FROM games WHERE id = $1 RETURNING id'; break;
      case keys.players: query = 'DELETE FROM players WHERE id = $1 RETURNING id'; break;
      case keys.worlds: query = 'DELETE FROM worlds WHERE id = $1 RETURNING id'; break;
      case keys.actors: query = 'DELETE FROM actors WHERE id = $1 RETURNING id'; break;
      case keys.turnOrders: query = 'DELETE FROM turn_orders WHERE id = $1 RETURNING id'; break;
      case keys.turnResults: query = 'DELETE FROM turn_results WHERE id = $1 RETURNING id'; break;
      default: throw new Error(`Unknown key: ${key}`);
    }

    const result = await this.client.query(query, [id]);
    if (!result || result.rows.length === 0) {
      throw new NotFoundError(key, id);
    }
    return true;
  }
}
