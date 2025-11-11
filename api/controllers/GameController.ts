import { ExegesisContext } from "exegesis";
import GameService = require("../service/GameService");
import GameLifecycleService = require("../service/GameLifecycleService");

module.exports.createGame = function createGame(context: ExegesisContext) {
  if (!context.requestBody || typeof context.requestBody.maxPlayers === 'undefined') {
    return {
      status: 400,
      body: { message: "Missing required field: maxPlayers" }
    };
  }
  const maxPlayers = context.requestBody.maxPlayers;
  return GameLifecycleService.createGame(maxPlayers);
};

module.exports.joinGame = function joinGame(context: ExegesisContext) {
  const username = context.user?.username;
  const sessionId = context.user?.sessionId;
  return GameLifecycleService.joinGame(context.params.path.id, username, sessionId);
};

module.exports.postOrders = function postOrders(context: ExegesisContext) {
  const body = context.requestBody;
  const gameId = context.params.path.gameId;
  const turn = context.params.path.turn;
  const playerId = context.params.path.playerId;

  // TODO: should not need a GameService and GameLifecycleService!
  // GameLifecycleService is newer, but lacks the postOrders() method
  return GameService.postOrders(body, gameId, turn, playerId);
};

module.exports.turnResults = function turnResults(context: ExegesisContext) {
  //gameId: number, turn: number, playerId: number) {
  const gameId = context.params.path.gameId;
  const turn = context.params.path.turn;
  const playerId = context.params.path.playerId;
  return GameService.turnResults(gameId, turn, playerId);
};

module.exports.listGames = function listGames() {
  return GameService.listGames();
};

module.exports.kickPlayer = async function kickPlayer(context: ExegesisContext) {
    const { gameId, playerId } = context.params.path;
    const requestingPlayerId = context.user.playerId;

    await GameLifecycleService.kickPlayer(
        gameId,
        playerId,
        requestingPlayerId
    );

    return { success: true };
}

module.exports.startGame = async function startGame(context: ExegesisContext) {
    const { gameId } = context.params.path;
    const requestingPlayerId = context.user.playerId;

    await GameLifecycleService.startGame(gameId, requestingPlayerId);
    return { success: true };
}

module.exports.transferHost = async function transferHost(context: ExegesisContext) {
    const { gameId } = context.params.path;
    const { newHostPlayerId } = context.requestBody;
    const requestingPlayerId = context.user.playerId;

    await GameLifecycleService.transferHost(
        gameId,
        newHostPlayerId,
        requestingPlayerId
    );

    return { success: true };
}
