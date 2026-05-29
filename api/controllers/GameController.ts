import { ExegesisContext } from "exegesis";
import * as store from "../service/DatabaseStore";
import GameService = require("../service/GameService");
import GameLifecycleService = require("../service/GameLifecycleService");
import { RuntimeUser } from "../middleware/auth";
import { Player, Game, World, Actor } from "../service/Models";
import { NotFoundError, formatErrorResponse } from "../utils/Errors";
import * as RangeValidation from "../service/RangeValidation";

function handleControllerError(context: ExegesisContext, error: unknown) {
  const normalizedError = error instanceof Error ? error : new Error("Unexpected error");
  const { message, statusCode } = formatErrorResponse(normalizedError);
  context.res.status(statusCode);
  return { message };
}

module.exports.createGame = async function createGame(context: ExegesisContext) {
  try {
    const maxPlayers = context.requestBody?.maxPlayers;
    const result = await GameLifecycleService.createGame(maxPlayers);
    context.res.status(201);
    return { gameId: result.gameId };
  } catch (error) {
    return handleControllerError(context, error);
  }
};

module.exports.joinGame = async function joinGame(context: ExegesisContext) {
  try {
    const email = context.user?.email;
    const userId = context.user?.id;
    const result = await GameService.joinGame(context.params.path.id, email, userId);
    context.res.status(200);
    return result;
  } catch (error) {
    return handleControllerError(context, error);
  }
};

module.exports.postOrders = async function postOrders(context: ExegesisContext) {
  const body = context.requestBody;
  const gameId = context.params.path.gameId;
  const turn = context.params.path.turn;
  const playerId = context.params.path.playerId;

  try {
    const result = await GameService.postOrders(body, gameId, turn, playerId);
    context.res.status(200);
    return result;
  } catch (error) {
    return handleControllerError(context, error);
  }
};

module.exports.turnResults = async function turnResults(context: ExegesisContext) {
  try {
    const gameId = context.params.path.gameId;
    const turn = context.params.path.turn;
    const playerId = context.params.path.playerId;
    const result = await GameService.turnResults(gameId, turn, playerId);

    if (result.success && result.world) {
      context.res.status(200);
      return { world: result.world };
    }

    const message = result.message || "Turn results are unavailable.";
    context.res.status(message === "turn results not available" ? 404 : 500);
    return { message };
  } catch (error) {
    return handleControllerError(context, error);
  }
};

module.exports.listGames = async function listGames(context: ExegesisContext) {
  try {
    const result = await GameService.listGames();
    context.res.status(200);
    return { games: result.games };
  } catch (error) {
    return handleControllerError(context, error);
  }
};

module.exports.kickPlayer = async function kickPlayer(context: ExegesisContext) {
  try {
    const { gameId, playerId } = context.params.path;
    const requestingPlayerId = context.user?.playerId;

    await GameLifecycleService.kickPlayer(
      gameId,
      playerId,
      requestingPlayerId
    );

    context.res.status(200);
    return { success: true };
  } catch (error) {
    return handleControllerError(context, error);
  }
}

module.exports.startGame = async function startGame(context: ExegesisContext) {
  try {
    const { gameId } = context.params.path;
    const requestingPlayerId = context.user?.playerId;

    await GameLifecycleService.startGame(gameId, requestingPlayerId);
    context.res.status(200);
    return { success: true };
  } catch (error) {
    return handleControllerError(context, error);
  }
}

module.exports.transferHost = async function transferHost(context: ExegesisContext) {
  try {
    const { gameId } = context.params.path;
    const { newHostPlayerId } = context.requestBody;
    const requestingPlayerId = context.user?.playerId;

    await GameLifecycleService.transferHost(
      gameId,
      newHostPlayerId,
      requestingPlayerId
    );

    context.res.status(200);
    return { success: true };
  } catch (error) {
    return handleControllerError(context, error);
  }
}

module.exports.getPlayerGameState = async function getPlayerGameState(context: ExegesisContext) {
  const { gameId, playerId } = context.params.path;

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
  } catch (error) {
    if (!(error instanceof NotFoundError)) {
      throw error;
    }
    context.res.status(404);
    return { message: "Player not found" };
  }

  try {
    const result = await GameLifecycleService.getPlayerGameState(gameId, playerId);
    context.res.status(200);
    return result;
  } catch (error) {
    return handleControllerError(context, error);
  }
}

module.exports.getValidTargets = async function getValidTargets(context: ExegesisContext) {
    const { gameId, actorId } = context.params.path;
    const authenticatedUser = context.user as RuntimeUser;

    // 1. Get game and world
    const game = await store.read<Game>(store.keys.games, gameId);
    const world = await store.read<World>(store.keys.worlds, game.worldId);

    // 2. Get actor and verify it belongs to a player owned by the authenticated user
    const actor = await store.read<Actor>(store.keys.actors, actorId);

    // We need to find the player ID for this user in this game
    const players = await Promise.all(game.players.map(pid => store.read<Player>(store.keys.players, pid)));
    const currentPlayer = players.find(p => p.sessionId === authenticatedUser.id || p.username === authenticatedUser.email);

    if (!currentPlayer || actor.owner !== currentPlayer.id) {
        context.res.status(403);
        return { message: "Not your actor" };
    }

    // 3. Get all actors in the world
    const allActors = await Promise.all(
        world.actorIds.map(id => store.read<Actor>(store.keys.actors, id))
    );

    // 4. Get valid targets
    const targets = RangeValidation.getValidTargets(
        actor,
        allActors,
        world.terrain
    );

    return {
        targets: targets.map(t => ({
            actorId: t.id,
            distance: RangeValidation.calculateHexDistance(actor.pos, t.pos),
            canAttack: true
        }))
    };
};
