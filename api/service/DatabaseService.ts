/**
 * Database Service for LGM
 * This service provides database connectivity and operations
 * Initially designed to replace the in-memory Store.ts with PostgreSQL
 */

import { PrismaClient } from '@prisma/client';

// Create a single instance of PrismaClient
const prisma = new PrismaClient();

// Initialize the database connection
async function connect() {
  try {
    await prisma.$connect();
    console.log('Connected to database successfully');
  } catch (error) {
    console.error('Failed to connect to database:', error);
    process.exit(1);
  }
}

// Disconnect from the database
async function disconnect() {
  await prisma.$disconnect();
}

// Export the prisma client and connection functions
export { prisma, connect, disconnect };

// Define types that mirror the current in-memory store structure
export interface StoreKeys {
  games: 'games';
  players: 'players'; 
  actors: 'actors';
  worlds: 'worlds';
  turnResults: 'turnResults';
  users: 'users';
}

export const storeKeys: StoreKeys = {
  games: 'games',
  players: 'players',
  actors: 'actors',
  worlds: 'worlds',
  turnResults: 'turnResults',
  users: 'users'
};