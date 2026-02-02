/**
 * Store Service - Database Implementation
 * Replaces the in-memory store with database operations
 */

import { prisma } from './DatabaseService';
import { Game, Player, Actor, World, TurnResult, User } from '@prisma/client';

// Define the keys for different entity types
export const keys = {
  games: 'games',
  players: 'players',
  actors: 'actors',
  worlds: 'worlds',
  turnResults: 'turnResults',
  users: 'users'
};

// Generic create function
export async function create<T>(key: keyof typeof keys, data: any): Promise<number> {
  switch(key) {
    case 'games':
      const game = await prisma.game.create({
        data: data as any
      });
      return game.id;
    case 'players':
      const player = await prisma.player.create({
        data: data as any
      });
      return player.id;
    case 'actors':
      const actor = await prisma.actor.create({
        data: data as any
      });
      return actor.id;
    case 'worlds':
      const world = await prisma.world.create({
        data: data as any
      });
      return world.id;
    case 'turnResults':
      const turnResult = await prisma.turnResult.create({
        data: data as any
      });
      return turnResult.id;
    case 'users':
      const user = await prisma.user.create({
        data: data as any
      });
      return user.id;
    default:
      throw new Error(`Unknown key: ${key}`);
  }
}

// Generic read function
export async function read<T>(key: keyof typeof keys, id: number): Promise<T> {
  switch(key) {
    case 'games':
      return await prisma.game.findUnique({
        where: { id }
      }) as unknown as T;
    case 'players':
      return await prisma.player.findUnique({
        where: { id }
      }) as unknown as T;
    case 'actors':
      return await prisma.actor.findUnique({
        where: { id }
      }) as unknown as T;
    case 'worlds':
      return await prisma.world.findUnique({
        where: { id }
      }) as unknown as T;
    case 'turnResults':
      return await prisma.turnResult.findUnique({
        where: { id }
      }) as unknown as T;
    case 'users':
      return await prisma.user.findUnique({
        where: { id }
      }) as unknown as T;
    default:
      throw new Error(`Unknown key: ${key}`);
  }
}

// Generic readAll function
export async function readAll<T>(key: keyof typeof keys, filterFn?: (item: T) => boolean): Promise<T[]> {
  let items: any[] = [];

  switch(key) {
    case 'games':
      items = await prisma.game.findMany();
      break;
    case 'players':
      items = await prisma.player.findMany();
      break;
    case 'actors':
      items = await prisma.actor.findMany();
      break;
    case 'worlds':
      items = await prisma.world.findMany();
      break;
    case 'turnResults':
      items = await prisma.turnResult.findMany();
      break;
    case 'users':
      items = await prisma.user.findMany();
      break;
    default:
      throw new Error(`Unknown key: ${key}`);
  }

  // Apply filter if provided
  if (filterFn) {
    return items.filter(filterFn as any) as T[];
  }

  return items as T[];
}

// Generic replace function
export async function replace<T>(key: keyof typeof keys, id: number, data: Partial<T>): Promise<void> {
  switch(key) {
    case 'games':
      await prisma.game.update({
        where: { id },
        data: data as any
      });
      break;
    case 'players':
      await prisma.player.update({
        where: { id },
        data: data as any
      });
      break;
    case 'actors':
      await prisma.actor.update({
        where: { id },
        data: data as any
      });
      break;
    case 'worlds':
      await prisma.world.update({
        where: { id },
        data: data as any
      });
      break;
    case 'turnResults':
      await prisma.turnResult.update({
        where: { id },
        data: data as any
      });
      break;
    case 'users':
      await prisma.user.update({
        where: { id },
        data: data as any
      });
      break;
    default:
      throw new Error(`Unknown key: ${key}`);
  }
}

// Generic remove function
export async function remove(key: keyof typeof keys, id: number): Promise<void> {
  switch(key) {
    case 'games':
      await prisma.game.delete({
        where: { id }
      });
      break;
    case 'players':
      await prisma.player.delete({
        where: { id }
      });
      break;
    case 'actors':
      await prisma.actor.delete({
        where: { id }
      });
      break;
    case 'worlds':
      await prisma.world.delete({
        where: { id }
      });
      break;
    case 'turnResults':
      await prisma.turnResult.delete({
        where: { id }
      });
      break;
    case 'users':
      await prisma.user.delete({
        where: { id }
      });
      break;
    default:
      throw new Error(`Unknown key: ${key}`);
  }
}

// Delete all entries for a key
export async function deleteAll(key: keyof typeof keys): Promise<void> {
  switch(key) {
    case 'games':
      await prisma.game.deleteMany({});
      break;
    case 'players':
      await prisma.player.deleteMany({});
      break;
    case 'actors':
      await prisma.actor.deleteMany({});
      break;
    case 'worlds':
      await prisma.world.deleteMany({});
      break;
    case 'turnResults':
      await prisma.turnResult.deleteMany({});
      break;
    case 'users':
      await prisma.user.deleteMany({});
      break;
    default:
      throw new Error(`Unknown key: ${key}`);
  }
}