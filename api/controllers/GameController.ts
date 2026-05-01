import { ExegesisContext } from "exegesis";
import GameService = require("../service/GameService");
import GameLifecycleService = require("../service/GameLifecycleService");

module.exports.createGame = async function createGame(context: ExegesisContext) {
  const maxPlayers = context.requestBody?.maxPlayers; // Optional parameter
  const result = await GameLifecycleService.createGame(maxPlayers);
  // Return with 'id' property to match API expectations
  return { id: result.gameId };
};

module.exports.joinGame = async function joinGame(context: ExegesisContext) {
  // context.user is the RuntimeUser provisioned by the loadUser middleware
  const email = context.user?.email;
  const userId = context.user?.id;
  try {
    return await GameService.joinGame(context.params.path.id, email, userId);
  } catch (err: any) {
    context.res.status(err.status || 500);
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
    const requestingPlayerId = context.user?.playerId;

    await GameLifecycleService.kickPlayer(
        gameId,
        playerId,
        requestingPlayerId
    );

    return { success: true };
}

module.exports.startGame = async function startGame(context: ExegesisContext) {
    const { gameId } = context.params.path;
    const requestingPlayerId = context.user?.playerId;

    await GameLifecycleService.startGame(gameId, requestingPlayerId);
    return { success: true };
}

module.exports.transferHost = async function transferHost(context: ExegesisContext) {
    const { gameId } = context.params.path;
    const { newHostPlayerId } = context.requestBody;
    const requestingPlayerId = context.user?.playerId;

    await GameLifecycleService.transferHost(
        gameId,
        newHostPlayerId,
        requestingPlayerId
    );

    return { success: true };
}

module.exports.getPlayerGameState = async function getPlayerGameState(context: ExegesisContext) {
    const { gameId, playerId } = context.params.path;
    const requestingPlayerId = context.user?.playerId;

    if (playerId !== requestingPlayerId) {
        context.res.status(403);
        return { message: "You can only access your own game state." };
    }

    return await GameLifecycleService.getPlayerGameState(gameId, playerId);
}
