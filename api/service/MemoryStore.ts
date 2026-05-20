'use strict';

import { Store, keys } from './StoreInterface';
import { NotFoundError } from '../utils/Errors';
import logger = require('../utils/Logger.js');

const STORE_DEBUG = false;
const store_debug = (obj) => { if (STORE_DEBUG) logger.debug(obj) };

export class MemoryStore implements Store {
  private memoryStore: Record<string, any[]> = {};

  private getMemoryStore(key: string): any[] {
    if (!this.memoryStore[key]) {
      this.memoryStore[key] = [];
    }
    return this.memoryStore[key];
  }

  async deleteAll(): Promise<void> {
    Object.keys(this.memoryStore).forEach(key => {
      this.memoryStore[key] = [];
    });
  }

  async create<T>(key: keys, obj: T): Promise<number> {
    store_debug("MemoryStore.create");
    const store = this.getMemoryStore(key);
    const id = store.length;
    const newObj = { ...obj, id };
    store.push(newObj);
    return id;
  }

  async read<T>(key: keys, id: number): Promise<T> {
    store_debug("MemoryStore.read");
    const store = this.getMemoryStore(key);
    const item = store.find(i => i.id === id);
    if (!item) {
      throw new NotFoundError(key, id);
    }
    return item as T;
  }

  async readAll<T>(key: keys, filterFunc: (item: T) => boolean): Promise<Array<T>> {
    store_debug("MemoryStore.readAll");
    const store = this.getMemoryStore(key);
    return store.filter(filterFunc) as T[];
  }

  async replace<T>(key: keys, id: number, newObj: T): Promise<T> {
    store_debug("MemoryStore.replace");
    const store = this.getMemoryStore(key);
    const index = store.findIndex(i => i.id === id);
    if (index === -1) {
      throw new NotFoundError(key, id);
    }
    const updatedObj = { ...newObj, id };
    store[index] = updatedObj;
    return updatedObj as T;
  }

  async update<T>(key: keys, id: number, diffObj: T): Promise<T> {
    store_debug("MemoryStore.update");
    const store = this.getMemoryStore(key);
    const index = store.findIndex(i => i.id === id);
    if (index === -1) {
      throw new NotFoundError(key, id);
    }
    const updatedObj = { ...store[index], ...diffObj, id };
    store[index] = updatedObj;
    return updatedObj as T;
  }

  async remove<T>(key: keys, id: number): Promise<boolean> {
    store_debug("MemoryStore.remove");
    const store = this.getMemoryStore(key);
    const index = store.findIndex(i => i.id === id);
    if (index === -1) {
      throw new NotFoundError(key, id);
    }
    store.splice(index, 1);
    return true;
  }
}
