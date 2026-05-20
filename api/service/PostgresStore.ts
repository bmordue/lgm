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

  async deleteAll(): Promise<void> {
    await this.client.query('DELETE FROM "turnResults";');
    await this.client.query('DELETE FROM "turnOrders";');
    await this.client.query('DELETE FROM actors;');
    await this.client.query('DELETE FROM players;');
    await this.client.query('DELETE FROM games;');
    await this.client.query('DELETE FROM worlds;');
  }

  async create<T>(key: keys, obj: T): Promise<number> {
    store_debug("PostgresStore.create");
    let query = '';
    let values: any[];
    const data = obj as any;

    switch (key) {
      case keys.games:
        query = `
          INSERT INTO games ("hostPlayerId", "maxPlayers", "gameState", turn, "worldId", "startedAt")
          VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`;
        values = [
          data.hostPlayerId || null,
          data.maxPlayers || null,
          data.gameState || 'LOBBY',
          data.turn || 0,
          data.worldId,
          data.startedAt || null
        ];
        break;

      case keys.players:
        query = `
          INSERT INTO players ("gameId", username, "isHost", "sessionId")
          VALUES ($1, $2, $3, $4) RETURNING id`;
        values = [
          data.gameId,
          data.username || '',
          data.isHost || false,
          data.sessionId || null
        ];
        break;

      case keys.worlds:
        query = `
          INSERT INTO worlds ("actorIds", terrain)
          VALUES ($1, $2) RETURNING id`;
        values = [
          JSON.stringify(data.actorIds || []),
          JSON.stringify(data.terrain)
        ];
        break;

      case keys.actors:
        query = `
          INSERT INTO actors (pos, state, owner, health, weapon)
          VALUES ($1, $2, $3, $4, $5) RETURNING id`;
        values = [
          JSON.stringify(data.pos),
          data.state || 'ALIVE',
          data.owner,
          data.health || null,
          data.weapon ? JSON.stringify(data.weapon) : null
        ];
        break;

      case keys.turnOrders:
        query = `
          INSERT INTO "turnOrders" ("gameId", turn, "playerId", orders)
          VALUES ($1, $2, $3, $4) RETURNING id`;
        values = [
          data.gameId,
          data.turn,
          data.playerId,
          JSON.stringify(data.orders)
        ];
        break;

      case keys.turnResults:
        query = `
          INSERT INTO "turnResults" ("gameId", turn, "playerId", world)
          VALUES ($1, $2, $3, $4) RETURNING id`;
        values = [
          data.gameId,
          data.turn,
          data.playerId,
          JSON.stringify(data.world)
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
    let tableName = key;
    if (key === keys.turnOrders) tableName = '"turnOrders"' as keys;
    if (key === keys.turnResults) tableName = '"turnResults"' as keys;

    query = `SELECT * FROM ${tableName} WHERE id = $1`;
    const result = await this.client.query(query, [id]);

    if (!result || result.rows.length === 0) {
      throw new NotFoundError(key, id);
    }

    return result.rows[0] as T;
  }

  async readAll<T>(key: keys, filterFunc: (item: T) => boolean): Promise<Array<T>> {
    store_debug("PostgresStore.readAll");
    let tableName = key;
    if (key === keys.turnOrders) tableName = '"turnOrders"' as keys;
    if (key === keys.turnResults) tableName = '"turnResults"' as keys;

    const query = `SELECT * FROM ${tableName}`;
    const result = await this.client.query(query);
    return (result.rows as T[]).filter(filterFunc);
  }

  async replace<T>(key: keys, id: number, newObj: T): Promise<T> {
    store_debug("PostgresStore.replace");
    let query = '';
    let values: any[];
    const data = newObj as any;

    switch (key) {
      case keys.games:
        query = `
          UPDATE games
          SET "hostPlayerId" = $1, "maxPlayers" = $2, "gameState" = $3, turn = $4, "worldId" = $5, "startedAt" = $6
          WHERE id = $7
          RETURNING *`;
        values = [
          data.hostPlayerId || null,
          data.maxPlayers || null,
          data.gameState || 'LOBBY',
          data.turn || 0,
          data.worldId,
          data.startedAt || null,
          id
        ];
        break;
      case keys.players:
        query = `
          UPDATE players
          SET "gameId" = $1, username = $2, "isHost" = $3, "sessionId" = $4
          WHERE id = $5
          RETURNING *`;
        values = [
          data.gameId,
          data.username || '',
          data.isHost || false,
          data.sessionId || null,
          id
        ];
        break;
      case keys.worlds:
        query = `
          UPDATE worlds
          SET "actorIds" = $1, terrain = $2
          WHERE id = $3
          RETURNING *`;
        values = [
          JSON.stringify(data.actorIds || []),
          JSON.stringify(data.terrain),
          id
        ];
        break;
      case keys.actors:
        query = `
          UPDATE actors
          SET pos = $1, state = $2, owner = $3, health = $4, weapon = $5
          WHERE id = $6
          RETURNING *`;
        values = [
          JSON.stringify(data.pos),
          data.state || 'ALIVE',
          data.owner,
          data.health || null,
          data.weapon ? JSON.stringify(data.weapon) : null,
          id
        ];
        break;
      case keys.turnOrders:
        query = `
          UPDATE "turnOrders"
          SET "gameId" = $1, turn = $2, "playerId" = $3, orders = $4
          WHERE id = $5
          RETURNING *`;
        values = [
          data.gameId,
          data.turn,
          data.playerId,
          JSON.stringify(data.orders),
          id
        ];
        break;
      case keys.turnResults:
        query = `
          UPDATE "turnResults"
          SET "gameId" = $1, turn = $2, "playerId" = $3, world = $4
          WHERE id = $5
          RETURNING *`;
        values = [
          data.gameId,
          data.turn,
          data.playerId,
          JSON.stringify(data.world),
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
    return result.rows[0] as T;
  }

  async update<T>(key: keys, id: number, diffObj: T): Promise<T> {
    store_debug("PostgresStore.update");

    let tableName = key;
    if (key === keys.turnOrders) tableName = '"turnOrders"' as keys;
    if (key === keys.turnResults) tableName = '"turnResults"' as keys;

    // First, check if the record exists
    const checkQuery = `SELECT id FROM ${tableName} WHERE id = $1`;
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
        // Wrap field name in double quotes for camelCase preservation
        const dbField = `"${field}"`;

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
    const updateQuery = `UPDATE ${tableName} SET ${updateFields.join(', ')} WHERE id = $${valueIndex} RETURNING *`;
    const result = await this.client.query(updateQuery, values);

    if (!result || result.rows.length === 0) {
      throw new NotFoundError(key, id);
    }
    return result.rows[0] as T;
  }

  async remove<T>(key: keys, id: number): Promise<boolean> {
    store_debug("PostgresStore.remove");
    let tableName = key;
    if (key === keys.turnOrders) tableName = '"turnOrders"' as keys;
    if (key === keys.turnResults) tableName = '"turnResults"' as keys;

    const query = `DELETE FROM ${tableName} WHERE id = $1 RETURNING id`;
    const result = await this.client.query(query, [id]);
    if (!result || result.rows.length === 0) {
      throw new NotFoundError(key, id);
    }
    return true;
  }
}
