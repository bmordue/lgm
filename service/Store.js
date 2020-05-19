'use strict';

const util = require('util');
const logger = require('../utils/Logger.js')

let store = {}; // { "someKey": [{},...] }

module.exports.keys = {
    games: "games",
    turns: "turns",
    turnOrders: "turnOrders",
}

function initArray(x) {
    return new Promise(function(resolve, reject) {
        resolve(x ? x : []);
    });
}

function exists(key, id) {
    return new Promise(function(resolve, reject) {
        if (!store[key]) {
            logger.debug(util.format("store for key %s does not exist", key));
            resolve(false);
        }
    
        if (id >= store[key].length) {
            logger.debug(util.format("id %s is out of range for store key %s", key));
            resolve(false);
        }
        resolve(true);
    });
}

module.exports.create = function(key, obj) {
    return new Promise(function(resolve, reject) {
        initArray(store[key])
            .then(function(storeSlot) {
                const id = storeSlot.push(obj) - 1;
                resolve(id);
            })
            .catch(reject);
    });
};

module.exports.read = function(key, id) {
    return new Promise(function(resolve, reject) {
        exists(key, id)
            .then((found) => resolve(found ? store[key][id] : null))
            .catch(reject);
    });
};

module.exports.replace = function(key, id, newObj) {
    return new Promise(function(resolve, reject) {
        exists(key, id)
            .then((found) => {
                if (found) {
                    store[key][id] = newObj;
                    resolve(newObj);
                }
                resolve(null);
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
                resolve(null);
            } else {
                Object.keys(diffObj).forEach(a => {store[key][id] = a;})
                resolve(store[key][id]);
            }
        })
        .catch(reject);
};
