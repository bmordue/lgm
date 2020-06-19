'use strict';

import util = require('util');
import logger = require('../utils/Logger.js')

const STORE_DEBUG = false;

var store = {}; // { "someKey": [{},...] }

let store_debug = (obj) => {if (STORE_DEBUG) logger.debug(obj)};

export enum keys {
    games = "games",
    turnResults = "turnResults",
    turnOrders = "turnOrders",
    worlds = "worlds",
    players = "players"
}

function initSlot(x) {
    if (!store[x]) store[x] = [];
}

function exists(key :keys, id :number) {
    return new Promise(function(resolve, reject) {
        store_debug("store.exists()");
        if (!store[key]) {
            store_debug(util.format("store for key %s does not exist", key));
            return resolve(false);
        }
    
        if (id >= store[key].length) {
            store_debug(util.format("id %s is out of range for store key %s", key));
            return resolve(false);
        }
        store_debug("seems to exist...");
        resolve(true);
    });
}

export function create<T>(key :keys, obj :T) :Promise<number> {
    store_debug("store.create");
    return new Promise(function(resolve, reject) {
        store_debug("store.create promise");
        initSlot(key);
        const id = store[key].push(obj) - 1;
        store[key][id].id = id;
        resolve(id);
    });
};

export function read<T>(key :keys, id :number) :Promise<T> {
    store_debug("store.read");
    return new Promise(async function(resolve, reject) {
        store_debug("store.read promise");
        if (await exists(key, id)) {
            resolve(store[key][id]);
        } else {
            reject({message: util.format("id %s not found for key %s", id, key)});
        } 
    });
};

export function readAll<T>(key :keys, filterFunc :Function) :Promise<Array<T>> {
    return new Promise((resolve, reject) => {
        store_debug("store.readAll promise");
        try {
            if (!Array.isArray(store[key])) {
                store_debug(util.format("store.readAll no slot for key; typeof(store[%s]) is %s", key, typeof(store[key])));
                resolve([]);
            } else {
                store_debug("store.readAll filtering entries");
                resolve(store[key].filter(filterFunc));
            } 
            } catch (e) {
            logger.error("store.readAll failed");
            logger.error(e);
            reject(e);
        }
    });
};

export function replace<T>(key :keys, id :number, newObj :T) :Promise<T> {
    return new Promise(async function(resolve, reject) {
        if (await exists(key, id)) {
            store[key][id] = newObj;
            resolve(newObj);
        } else {
            reject();
        }
    });
};

// warning: might not work as expeced for nested objects
// a = { b: { c: 1, d = 2} }
// aDiff = {b: { d: 3}}
// a after applying aDiff = {b: { d: 3}}, NOT { b: { c: 1, d = 3} }
export function update<T>(key :keys, id: number, diffObj :T) :Promise<number> {
    return new Promise(async function(resolve, reject) {
        const found = await exists(key, id);
        if (!found) {
            reject({message: util.format("Did not find stored object %s[%s] to update", key, id)});
        } else {
            Object.keys(diffObj).forEach(k => {store[key][id][k] = diffObj[k];})
            resolve(store[key][id]);
        }
    });
};
