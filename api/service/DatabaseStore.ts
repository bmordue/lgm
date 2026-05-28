'use strict';

import { Client } from 'pg';
import { Store, keys as StoreKeys } from './StoreInterface';
import { MemoryStore } from './MemoryStore';
import { PostgresStore } from './PostgresStore';
import { runDatabaseMigrations } from './DatabaseMigrations';

export import keys = StoreKeys;

let storePromise: Promise<Store> | undefined;
let operationQueue: Promise<unknown> = Promise.resolve();

async function createStore(): Promise<Store> {
  if (!process.env.DATABASE_URL) {
    return new MemoryStore();
  }

  const dbClient = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  await dbClient.connect();
  await runDatabaseMigrations(dbClient);
  return new PostgresStore(dbClient);
}

async function getStore(): Promise<Store> {
  if (!storePromise) {
    storePromise = createStore().catch((error) => {
      storePromise = undefined;
      throw error;
    });
  }
  return storePromise;
}

function queueStoreOperation<T>(operation: (store: Store) => Promise<T>): Promise<T> {
  const queuedOperation = operationQueue.then(async () => {
    const store = await getStore();
    return operation(store);
  });
  operationQueue = queuedOperation.then(() => undefined, () => undefined);
  return queuedOperation;
}

export async function deleteAll(): Promise<void> {
  return queueStoreOperation((store) => store.deleteAll());
}

export async function create<T>(key: StoreKeys, obj: T): Promise<number> {
  return queueStoreOperation((store) => store.create(key, obj));
}

export async function read<T>(key: StoreKeys, id: number): Promise<T> {
  return queueStoreOperation((store) => store.read(key, id));
}

export async function readAll<T>(key: StoreKeys, filterFunc: (item: T) => boolean): Promise<Array<T>> {
  return queueStoreOperation((store) => store.readAll(key, filterFunc));
}

export async function replace<T>(key: StoreKeys, id: number, newObj: T): Promise<T> {
  return queueStoreOperation((store) => store.replace(key, id, newObj));
}

export async function update<T>(key: StoreKeys, id: number, diffObj: T): Promise<T> {
  return queueStoreOperation((store) => store.update(key, id, diffObj));
}

export async function remove<T>(key: StoreKeys, id: number): Promise<boolean> {
  return queueStoreOperation((store) => store.remove(key, id));
}
