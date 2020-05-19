'use strict';

const store = require('./Store.js');
const rules = require('./Rules.js');

/**
 * create a new game
 *
 * returns GameCreatedResponse
 **/
module.exports.createGame = function () {
  return store.create(store.keys.games, {turn: 1, turnComplete: false});
}


/**
 * join a game
 *
 * id Integer 
 * no response value expected for this operation
 **/
module.exports.joinGame = function(gameId) {
  return new Promise(function (resolve, reject) {
    const playerId = store.create(store.keys.players, {gameId: gameId});
    let game = store.read(store.keys.games, gameId);
    if (!game) {
      reject({message: "could not find game to join"});
    }
    if (game.players) {
      game.players.push(playerId);
    } else {
      game.players = [playerId];
    }
    store.replace(store.keys.games, gameId, game);
    resolve({gameId: gameId, playerId: playerId, turn: game.turn});
  });
}


/**
 * post turn orders
 *
 * body TurnOrders 
 * id Integer 
 * no response value expected for this operation
 **/
module.exports.postOrders = function(body, gameId, turn, playerId) {
  return new Promise(function (resolve, reject) {
    ordersId = store.create(store.keys.turnOrders, {gameId: gameId, turn: turn, playerId: playerId, body: body});
    rules.process(ordersId)
         .then(resolve, reject);
  });
}


/**
 * get turn results
 *
 * id Integer 
 * returns TurnResultsResponse
 **/
module.exports.turnResults = function(gameId, turn, playerId) {
  return new Promise(function (resolve, reject) {
    const result = false;
    result ? resolve({success: true, result: result}) : resolve({success: false, message: "turn results not available"});
  });
}

