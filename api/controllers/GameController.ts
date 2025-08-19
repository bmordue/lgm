import { ExegesisContext } from "exegesis";
import GameService = require("../service/GameService");

module.exports.createGame = async function createGame(context: ExegesisContext) {
  const game = await GameService.createGame();
  // Construct join_url based on how Exegesis routes requests.
  // This assumes a path like /games/{id}/join, but needs verification
  // against the actual OpenAPI definition's paths.
  // For now, let's assume a base path from the incoming request.
  const serverUrl = `${context.req.protocol}://${context.req.get('host')}`;
  return {
    id: game.id,
    join_url: `${serverUrl}/games/${game.id}/join` // This needs to match the actual join path in OpenAPI spec
  };
};

module.exports.joinGame = async function joinGame(context: ExegesisContext) {
  const username = context.user?.username;
  try {
    // GameService.joinGame already returns a JoinGameResponse or rejects with Error
    // If it rejects, Exegesis should handle it by default.
    // Let's explicitly catch and re-format to ensure OpenAPI compliance for error messages.
    return await GameService.joinGame(context.params.path.id, username);
  } catch (err: any) {
    // Assuming err is an Error object, it will have a message property.
    // Exegesis can define specific status codes for certain errors in the OpenAPI document (e.g. 400, 403).
    // We'll let Exegesis determine the status code based on the error type or default to 500.
    // The key is to ensure the response body has a `message` field.
    context.res.status(err.status || 500); // Set status if available on error, else 500
    return { message: err.message || "An unexpected error occurred while trying to join the game." };
  }
};

module.exports.postOrders = function postOrders(context: ExegesisContext) {
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
  //gameId: number, turn: number, playerId: number) {
  const gameId = context.params.path.gameId;
  const turn = context.params.path.turn;
  const playerId = context.params.path.playerId;
  const result = await GameService.turnResults(gameId, turn, playerId);

  if (result.success && result.results) {
    return { placeholder: JSON.stringify(result.results) };
  } else if (!result.success && result.message) {
    return { placeholder: result.message };
  } else if (result.success) {
    return { placeholder: "Turn results processed, but no specific data returned."};
  } else {
    return { placeholder: "Failed to process turn results or results not available." };
  }
};

module.exports.listGames = async function listGames() {
  const result = await GameService.listGames();
  return { games: result.games };
};
