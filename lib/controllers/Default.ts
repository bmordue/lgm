'use strict';

import utils = require('../utils/writer');
import Default = require('../service/DefaultService');

module.exports.createGame = function createGame() {
    return Default.createGame();
        // .then(function (response) {
        //     utils.writeJson(response);
        // })
        // .catch(function (response) {
        //     utils.writeJson(response, 500);
        // });
};

module.exports.joinGame = function joinGame(req, res, next, id) {
    Default.joinGame(id)
        .then(function (response) {
            utils.writeJson(res, response);
        })
        .catch(function (response) {
            utils.writeJson(res, response, 500);
        });
};

module.exports.postOrders = function postOrders(req, res, next, body, gameId, turn, playerId) {
    Default.postOrders(body, gameId, turn, playerId)
        .then(function (response) {
            utils.writeJson(res, response);
        })
        .catch(function (response) {
            utils.writeJson(res, response, 500);
        });
};

module.exports.turnResults = function turnResults(req, res, next, gameId, turn, playerId) {
    Default.turnResults(gameId, turn, playerId)
        .then(function (response) {
            utils.writeJson(res, response);
        })
        .catch(function (response) {
            utils.writeJson(res, response, 500);
        });
};
