import { ExegesisContext } from "exegesis";
import * as store from "../service/DatabaseStore";
import GameService = require("../service/GameService");
import GameLifecycleService = require("../service/GameLifecycleService");
import { RuntimeUser } from "../middleware/auth";
import { Player, Game, World, Actor } from "../service/Models";
import { NotFoundError } from "../utils/Errors";
import * as RangeValidation from "../service/RangeValidation";
import { webSocketService } from "../service/WebSocketService";

module.exports.createGame = async function createGame(context: ExegesisContext) {
  const maxPlayers = context.requestBody?.maxPlayers; // Optional parameter
  try {
    const result = await GameLifecycleService.createGame(maxPlayers);
    webSocketService.emitGamesUpdated();
    // Return with 'id' property to match API expectations
    return { id: result.gameId };
  } catch (err: any) {
    context.res.status(err.status || 500);
    return { message: err.message || "An unexpected error occurred while creating a game" };
  }
};

module.exports.joinGame = async function joinGame(context: ExegesisContext) {
  // context.user is the RuntimeUser provisioned by the loadUser middleware
  const email = context.user?.email;
  const userId = context.user?.id;
  try {
    const result = await GameService.joinGame(context.params.path.id, email, userId);
    webSocketService.emitGamesUpdated();
    webSocketService.emitGameUpdated({ gameId: result.gameId, turn: result.turn });
    return result;
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
    const result = await GameService.postOrders(body, gameId, turn, playerId);
    webSocketService.emitGameUpdated({ gameId, turn, turnStatus: result.turnStatus });
    return result;
  } catch (err: any) {
    context.res.status(err.status || 500); // Set status if available on error, else 500
    return { message: err.message || "An unexpected error occurred while posting orders." };
  }
};

module.exports.turnResults = async function turnResults(context: ExegesisContext) {
  const gameId = context.params.path.gameId;
  const turn = context.params.path.turn;
  const playerId = context.params.path.playerId;
  try {
    return await GameService.turnResults(gameId, turn, playerId);
  } catch (err: any) {
    context.res.status(err.status || 500);
    return { message: err.message || "An unexpected error occurred while fetching turn results" };
  }
};

module.exports.listGames = async function listGames(context: ExegesisContext) {
  try {
    const result = await GameService.listGames();
    return { gameIds: result.gameIds, games: result.games };
  } catch (err: any) {
    context.res.status(err.status || 500);
    return { message: err.message || "An unexpected error occurred while listing games" };
  }
};

module.exports.kickPlayer = async function kickPlayer(context: ExegesisContext) {
    const { gameId, playerId } = context.params.path;
    const requestingPlayerId = context.user?.playerId;

    try {
        await GameLifecycleService.kickPlayer(
            gameId,
            playerId,
            requestingPlayerId
        );
        webSocketService.emitGamesUpdated();
        webSocketService.emitGameUpdated({ gameId });

        return { success: true };
    } catch (err: any) {
        context.res.status(err.status || 500);
        return { message: err.message || "An error occurred while kicking the player" };
    }
}

module.exports.startGame = async function startGame(context: ExegesisContext) {
    const { gameId } = context.params.path;
    const requestingPlayerId = context.user?.playerId;

    try {
        await GameLifecycleService.startGame(gameId, requestingPlayerId);
        webSocketService.emitGamesUpdated();
        webSocketService.emitGameUpdated({ gameId });
        return { success: true };
    } catch (err: any) {
        context.res.status(err.status || 500);
        return { message: err.message || "An error occurred while starting the game" };
    }
}

module.exports.transferHost = async function transferHost(context: ExegesisContext) {
    const { gameId } = context.params.path;
    const { newHostPlayerId } = context.requestBody;
    const requestingPlayerId = context.user?.playerId;

    try {
        await GameLifecycleService.transferHost(
            gameId,
            newHostPlayerId,
            requestingPlayerId
        );
        webSocketService.emitGamesUpdated();
        webSocketService.emitGameUpdated({ gameId });

        return { success: true };
    } catch (err: any) {
        context.res.status(err.status || 500);
        return { message: err.message || "An error occurred while transferring the host" };
    }
}

module.exports.getPlayerGameState = async function getPlayerGameState(context: ExegesisContext) {
    const { gameId, playerId } = context.params.path;

    try {
        // Authorization check
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

        return await GameLifecycleService.getPlayerGameState(gameId, playerId);
    } catch (err: any) {
        if (err instanceof NotFoundError) {
            context.res.status(404);
            return { message: "Player not found" };
        }
        context.res.status(err.status || 500);
        return { message: err.message || "An unexpected error occurred while fetching player game state" };
    }
}

module.exports.getValidTargets = async function getValidTargets(context: ExegesisContext) {
    const { gameId, actorId } = context.params.path;
    const authenticatedUser = context.user as RuntimeUser;

    try {
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
    } catch (err: any) {
        context.res.status(err.status || 500);
        return { message: err.message || "An unexpected error occurred while getting valid targets" };
    }
};
