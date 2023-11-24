import { ExegesisContext } from 'exegesis';
import GameService = require('../service/GameService');

module.exports.createGame = async function createGame() {
    const existingGame = await GameService.checkExistingGame();
    if (existingGame) {
        return existingGame;
    }
    return GameService.createGame();
};

module.exports.joinGame = function joinGame(context: ExegesisContext) {
    return GameService.joinGame(context.params.path.id);
};

module.exports.postOrders = function postOrders(context: ExegesisContext) {
    const body = context.requestBody;
    const gameId = context.params.path.gameId;
    const turn = context.params.path.turn;
    const playerId = context.params.path.playerId;

    return GameService.postOrders(body, gameId, turn, playerId);
};

module.exports.turnResults = function turnResults(context: ExegesisContext) {
    const gameId = context.params.path.gameId;
    const turn = context.params.path.turn;
    const playerId = context.params.path.playerId;
    return GameService.turnResults(gameId, turn, playerId);
};
