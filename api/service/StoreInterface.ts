'use strict';

export enum keys {
  games = "games",
  turnResults = "turnResults",
  turnOrders = "turnOrders",
  worlds = "worlds",
  players = "players",
  actors = "actors"
}

export interface Store {
  deleteAll(): Promise<void>;
  create<T>(key: keys, obj: T): Promise<number>;
  read<T>(key: keys, id: number): Promise<T>;
  readAll<T>(key: keys, filterFunc: (item: T) => boolean): Promise<Array<T>>;
  replace<T>(key: keys, id: number, newObj: T): Promise<T>;
  update<T>(key: keys, id: number, diffObj: T): Promise<T>;
  remove<T>(key: keys, id: number): Promise<boolean>;
}
