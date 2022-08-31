import { ExegesisContext } from 'exegesis';
import { inspect } from 'util';
import Default = require('../service/DefaultService');

module.exports.createGame = function createGame() {
    return Default.createGame();
};

module.exports.joinGame = function joinGame(context: ExegesisContext) {
    return Default.joinGame(context.params.path.id);
};

module.exports.postOrders = function postOrders(context: ExegesisContext) {
    const body = context.requestBody;
    const gameId = context.params.path.gameId;
    const turn = context.params.path.turn;
    const playerId = context.params.path.playerId;

    return Default.postOrders(body, gameId, turn, playerId);
};

module.exports.turnResults = function turnResults(context: ExegesisContext) {
    //gameId: number, turn: number, playerId: number) {
    const gameId = context.params.path.gameId;
    const turn = context.params.path.turn;
    const playerId = context.params.path.playerId;
    return Default.turnResults(gameId, turn, playerId);
};
