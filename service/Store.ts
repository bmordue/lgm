'use strict';

const util = require('util');
const logger = require('../utils/Logger.js')

const STORE_DEBUG = false;

var store = {}; // { "someKey": [{},...] }

let store_debug = (obj) => {if (STORE_DEBUG) logger.debug(obj)};

module.exports.keys = {
    games: "games",
    turnResults: "turnResults",
    turnOrders: "turnOrders",
    worlds: "worlds"
}

function initSlot(x) {
    if (!store[x]) store[x] = [];
}

function exists(key, id) {
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

module.exports.create = function(key, obj) {
    store_debug("store.create");
    return new Promise(function(resolve, reject) {
        store_debug("store.create promise");
        initSlot(key);
        const id = store[key].push(obj) - 1;
        store[key][id].id = id;
        resolve(id);
    });
};

module.exports.read = function(key, id) {
    store_debug("store.read");
    return new Promise(function(resolve, reject) {
        store_debug("store.read promise");
        exists(key, id)
            .then((found) => {
                if (found) {
                    resolve(store[key][id]);
                } else {
                    reject({message: util.format("id %s not found for key %s", id, key)});
                } 
            })
            .catch(reject);
    });
};

module.exports.readAll = function(key, filterFunc) {
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

module.exports.replace = function(key, id, newObj) {
    return new Promise(function(resolve, reject) {
        exists(key, id)
            .then((found) => {
                if (found) {
                    store[key][id] = newObj;
                    resolve(newObj);
                } else {
                    reject();
                }
            })
            .catch(reject);
    });
};

// warning: might not work as expeced for nested objects
// a = { b: { c: 1, d = 2} }
// aDiff = {b: { d: 3}}
// a after applying aDiff = {b: { d: 3}}, NOT { b: { c: 1, d = 3} }
module.exports.update = function(key, id, diffObj) {
    return new Promise(function(resolve, reject) {
        exists(key, id)
        .then((found) => {
            if (!found) {
                reject({message: util.format("Did not find stored object %s[%s] to update", key, id)});
            } else {
                Object.keys(diffObj).forEach(k => {store[key][id][k] = diffObj[k];})
                resolve(store[key][id]);
            }
        })
        .catch(reject);
    });
};
