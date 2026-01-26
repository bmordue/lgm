import { ExegesisContext } from "exegesis";
import GameService = require("../service/GameService");
import GameLifecycleService = require("../service/GameLifecycleService");

module.exports.createGame = async function createGame(context: ExegesisContext) {
  if (!context.requestBody || typeof context.requestBody.maxPlayers === 'undefined') {
    return {
      status: 400,
      body: { message: "Missing required field: maxPlayers" }
    };
  }
  const maxPlayers = context.requestBody.maxPlayers;
  return GameLifecycleService.createGame(maxPlayers);
};

module.exports.joinGame = async function joinGame(context: ExegesisContext) {
  const username = context.user?.username;
  try {
    // GameService.joinGame already returns a JoinGameResponse or rejects with Error
    // If it rejects, Exegesis should handle it by default.
    // Let's explicitly catch and re-format to ensure OpenAPI compliance for error messages.
    const sessionId = context.user?.sessionId;
    return await GameService.joinGame(context.params.path.id, username, sessionId);
  } catch (err: any) {
    // Assuming err is an Error object, it will have a message property.
    // Exegesis can define specific status codes for certain errors in the OpenAPI document (e.g. 400, 403).
    // We'll let Exegesis determine the status code based on the error type or default to 500.
    // The key is to ensure the response body has a `message` field.
    context.res.status(err.status || 500); // Set status if available on error, else 500
    return { message: err.message || "An unexpected error occurred while trying to join the game." };
  }
};

module.exports.postOrders = async function postOrders(context: ExegesisContext) {
  const body = context.requestBody;
  const gameId = context.params.path.gameId;
  const turn = context.params.path.turn;
  const playerId = context.params.path.playerId;

  try {
    // GameService.postOrders returns PostOrdersResponse or rejects with Error
    return await GameService.postOrders(body, gameId, turn, playerId);
  } catch (err: any) {
    context.res.status(err.status || 500); // Set status if available on error, else 500
    return { message: err.message || "An unexpected error occurred while posting orders." };
  }
};

module.exports.turnResults = async function turnResults(context: ExegesisContext) {
  const gameId = context.params.path.gameId;
  const turn = context.params.path.turn;
  const playerId = context.params.path.playerId;
  const result = await GameService.turnResults(gameId, turn, playerId);

  if (result.success && result.world) {
    return { world: result.world };
  } else if (!result.success && result.message) {
    return { message: result.message };
  } else if (result.success) {
    return { message: "Turn results processed, but world data not available." };
  } else {
    return { message: "Failed to process turn results or results not available." };
  }
};

module.exports.listGames = async function listGames() {
  const result = await GameService.listGames();
  return { games: result.games };
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
