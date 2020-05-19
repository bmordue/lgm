'use strict';

const store = require('./Store.js');
const logger = require('../utils/Logger.js');

module.exports.process = function(ordersId) {
    return new Promise(function(resolve, reject) {
        const orders = store.read(store.keys.turnOrders, ordersId);
        const gameId = orders.gameId;
        const game = store.read(store.keys.games, gameId);
        var status = {complete: true, success: false, msg: "none"};
        logger.debug("finished rules.process");
        resolve(status);
    });
}