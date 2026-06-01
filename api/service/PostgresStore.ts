'use strict';

import { Client } from 'pg';
import { Store, keys } from './StoreInterface';
import { NotFoundError } from '../utils/Errors';
import logger = require('../utils/Logger.js');
import { ActorState, Game, World } from './Models';

const STORE_DEBUG = false;
const store_debug = (obj) => { if (STORE_DEBUG) logger.debug(obj) };

export class PostgresStore implements Store {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  private getQuotedTableName(key: keys): string {
    if (key === keys.turnOrders) return '"turnOrders"';
    if (key === keys.turnResults) return '"turnResults"';
    return `"${key}"`;
  }

  private hydrateResult<T>(key: keys, row: any): T {
    if (key === keys.games) {
      const game = row as Game;
      return {
        ...game,
        players: Array.isArray(game.players) ? game.players : []
      } as T;
    }
    if (key === keys.worlds) {
      const world = row as World;
      return {
        ...world,
        actorIds: Array.isArray(world.actorIds) ? world.actorIds : []
      } as T;
    }
    return row as T;
  }

  async deleteAll(): Promise<void> {
    await this.client.query('TRUNCATE TABLE "turnResults", "turnOrders", "actors", "players", "games", "worlds" RESTART IDENTITY CASCADE;');
  }

  async create<T>(key: keys, obj: T): Promise<number> {
    store_debug("PostgresStore.create");
    let query = '';
    let values: any[];
    const data = obj as any;

    switch (key) {
      case keys.games:
        query = `
          INSERT INTO "games" ("players", "hostPlayerId", "maxPlayers", "gameState", "turn", "worldId", "startedAt")
          VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`;
        values = [
          JSON.stringify(data.players || []),
          data.hostPlayerId ?? null,
          data.maxPlayers ?? null,
          data.gameState ?? 'LOBBY',
          data.turn ?? 0,
          data.worldId,
          data.startedAt ?? null
        ];
        break;

      case keys.players:
        query = `
          INSERT INTO "players" ("gameId", "username", "isHost", "sessionId")
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
          INSERT INTO "worlds" ("actorIds", "terrain")
          VALUES ($1, $2) RETURNING id`;
        values = [
          JSON.stringify(data.actorIds || []),
          JSON.stringify(data.terrain)
        ];
        break;

      case keys.actors:
        query = `
          INSERT INTO "actors" ("pos", "state", "owner", "health", "weapon")
          VALUES ($1, $2, $3, $4, $5) RETURNING id`;
        values = [
          JSON.stringify(data.pos),
          data.state ?? ActorState.ALIVE,
          data.owner,
          data.health ?? null,
          data.weapon ? JSON.stringify(data.weapon) : null
        ];
        break;

      case keys.turnOrders:
        query = `
          INSERT INTO "turnOrders" ("gameId", "turn", "playerId", "orders")
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
          INSERT INTO "turnResults" ("gameId", "turn", "playerId", "world")
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
    const tableName = this.getQuotedTableName(key);
    const query = `SELECT * FROM ${tableName} WHERE id = $1`;
    const result = await this.client.query(query, [id]);

    if (!result || result.rows.length === 0) {
      throw new NotFoundError(key, id);
    }

    return this.hydrateResult<T>(key, result.rows[0]);
  }

  async readAll<T>(key: keys, filterFunc: (item: T) => boolean): Promise<Array<T>> {
    store_debug("PostgresStore.readAll");
    const tableName = this.getQuotedTableName(key);
    const query = `SELECT * FROM ${tableName}`;
    const result = await this.client.query(query);
    return result.rows.map((row) => this.hydrateResult<T>(key, row)).filter(filterFunc);
  }

  async replace<T>(key: keys, id: number, newObj: T): Promise<T> {
    store_debug("PostgresStore.replace");
    let query = '';
    let values: any[];
    const data = newObj as any;

    switch (key) {
      case keys.games:
        query = `
          UPDATE "games"
          SET "players" = $1, "hostPlayerId" = $2, "maxPlayers" = $3, "gameState" = $4, "turn" = $5, "worldId" = $6, "startedAt" = $7
          WHERE "id" = $8
          RETURNING *`;
        values = [
          JSON.stringify(data.players || []),
          data.hostPlayerId ?? null,
          data.maxPlayers ?? null,
          data.gameState ?? 'LOBBY',
          data.turn ?? 0,
          data.worldId,
          data.startedAt ?? null,
          id
        ];
        break;
      case keys.players:
        query = `
          UPDATE "players"
          SET "gameId" = $1, "username" = $2, "isHost" = $3, "sessionId" = $4
          WHERE "id" = $5
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
          UPDATE "worlds"
          SET "actorIds" = $1, "terrain" = $2
          WHERE "id" = $3
          RETURNING *`;
        values = [
          JSON.stringify(data.actorIds || []),
          JSON.stringify(data.terrain),
          id
        ];
        break;
      case keys.actors:
        query = `
          UPDATE "actors"
          SET "pos" = $1, "state" = $2, "owner" = $3, "health" = $4, "weapon" = $5
          WHERE "id" = $6
          RETURNING *`;
        values = [
          JSON.stringify(data.pos),
          data.state ?? ActorState.ALIVE,
          data.owner,
          data.health ?? null,
          data.weapon ? JSON.stringify(data.weapon) : null,
          id
        ];
        break;
      case keys.turnOrders:
        query = `
          UPDATE "turnOrders"
          SET "gameId" = $1, "turn" = $2, "playerId" = $3, "orders" = $4
          WHERE "id" = $5
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
          SET "gameId" = $1, "turn" = $2, "playerId" = $3, "world" = $4
          WHERE "id" = $5
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
    const tableName = this.getQuotedTableName(key);

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
        const dbField = `"${field}"`;

        if (['players', 'actorIds', 'terrain', 'pos', 'weapon', 'orders', 'world'].includes(field)) {
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
    return this.hydrateResult<T>(key, result.rows[0]);
  }

  async remove<T>(key: keys, id: number): Promise<boolean> {
    store_debug("PostgresStore.remove");
    const tableName = this.getQuotedTableName(key);
    const query = `DELETE FROM ${tableName} WHERE id = $1 RETURNING id`;
    const result = await this.client.query(query, [id]);
    if (!result || result.rows.length === 0) {
      throw new NotFoundError(key, id);
    }
    return true;
  }
}
