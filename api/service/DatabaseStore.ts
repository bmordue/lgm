'use strict';

import { Client } from 'pg';
import { Store, keys as StoreKeys } from './StoreInterface';
import { MemoryStore } from './MemoryStore';
import { PostgresStore } from './PostgresStore';

export import keys = StoreKeys;

let storeInstance: Store;

async function getStore(): Promise<Store> {
  if (storeInstance) {
    return storeInstance;
  }

  if (!process.env.DATABASE_URL) {
    storeInstance = new MemoryStore();
  } else {
    const dbClient = new Client({
      connectionString: process.env.DATABASE_URL,
    });
    await dbClient.connect();
    storeInstance = new PostgresStore(dbClient);
  }
  return storeInstance;
}

export async function deleteAll(): Promise<void> {
  const store = await getStore();
  return store.deleteAll();
}

export async function create<T>(key: StoreKeys, obj: T): Promise<number> {
  const store = await getStore();
  return store.create(key, obj);
}

export async function read<T>(key: StoreKeys, id: number): Promise<T> {
  const store = await getStore();
  return store.read(key, id);
}

export async function readAll<T>(key: StoreKeys, filterFunc: (item: T) => boolean): Promise<Array<T>> {
  const store = await getStore();
  return store.readAll(key, filterFunc);
}

export async function replace<T>(key: StoreKeys, id: number, newObj: T): Promise<T> {
  const store = await getStore();
  return store.replace(key, id, newObj);
}

export async function update<T>(key: StoreKeys, id: number, diffObj: T): Promise<T> {
  const store = await getStore();
  return store.update(key, id, diffObj);
}

export async function remove<T>(key: StoreKeys, id: number): Promise<boolean> {
  const store = await getStore();
  return store.remove(key, id);
}
