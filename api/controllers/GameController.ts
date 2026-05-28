import { ExegesisContext } from "exegesis";
import * as store from "../service/DatabaseStore";
import GameService = require("../service/GameService");
import GameLifecycleService = require("../service/GameLifecycleService");
import { RuntimeUser } from "../middleware/auth";
import { Game, Player } from "../service/Models";
import { NotFoundError } from "../utils/Errors";

async function resolvePlayerIdForUser(gameId: number, user?: RuntimeUser): Promise<number> {
  if (!user || user.isGuest) {
    const err: any = new Error("Authentication required");
    err.status = 401;
    throw err;
  }

  const game = await store.read<Game>(store.keys.games, gameId);
  for (const existingPlayerId of game.players || []) {
    const player = await store.read<Player>(store.keys.players, existingPlayerId);
    // Match the canonical session-backed identity first, with username/email as a
    // compatibility fallback for players created before session tracking existed.
    if (player.sessionId === user.id || player.username === user.email) {
      return existingPlayerId;
    }
  }

  const err: any = new Error("You must join this game before performing player management actions");
  err.status = 403;
  throw err;
}

module.exports.createGame = async function createGame(context: ExegesisContext) {
  const maxPlayers = context.requestBody?.maxPlayers; // Optional parameter
  const result = await GameLifecycleService.createGame(maxPlayers);
  // TODO: remove gameId once all API consumers have migrated to id.
  return { id: result.gameId, gameId: result.gameId };
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

    try {
      const requestingPlayerId = await resolvePlayerIdForUser(gameId, context.user as RuntimeUser | undefined);
      await GameLifecycleService.kickPlayer(
          gameId,
          playerId,
          requestingPlayerId
      );

      return { success: true };
    } catch (err: any) {
      context.res.status(err.status || 500);
      return { message: err.message || "An unexpected error occurred while trying to kick the player." };
    }
}

module.exports.startGame = async function startGame(context: ExegesisContext) {
    const { gameId } = context.params.path;

    try {
      const requestingPlayerId = await resolvePlayerIdForUser(gameId, context.user as RuntimeUser | undefined);
      await GameLifecycleService.startGame(gameId, requestingPlayerId);
      return { success: true };
    } catch (err: any) {
      context.res.status(err.status || 500);
      return { message: err.message || "An unexpected error occurred while trying to start the game." };
    }
}

module.exports.transferHost = async function transferHost(context: ExegesisContext) {
    const { gameId } = context.params.path;
    const { newHostPlayerId } = context.requestBody;

    try {
      const requestingPlayerId = await resolvePlayerIdForUser(gameId, context.user as RuntimeUser | undefined);
      await GameLifecycleService.transferHost(
          gameId,
          newHostPlayerId,
          requestingPlayerId
      );

      return { success: true };
    } catch (err: any) {
      context.res.status(err.status || 500);
      return { message: err.message || "An unexpected error occurred while trying to transfer host." };
    }
}

module.exports.getPlayerGameState = async function getPlayerGameState(context: ExegesisContext) {
    const { gameId, playerId } = context.params.path;

    // Authorization check
    try {
        const player = await store.read<Player>(store.keys.players, playerId);
        const authenticatedUser = context.user as RuntimeUser;

        if (player.gameId !== gameId) {
            context.res.status(404);
            return { message: "Player not found" };
        }

        if (player.sessionId !== authenticatedUser.id && player.username !== authenticatedUser.email) {
            context.res.status(403);
            return { message: "You can only access your own game state" };
        }
    } catch (err) {
        if (!(err instanceof NotFoundError)) {
            throw err;
        }
        context.res.status(404);
        return { message: "Player not found" };
    }

    return await GameLifecycleService.getPlayerGameState(gameId, playerId);
}
