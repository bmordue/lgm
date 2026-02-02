"use strict";

import store = require("./Store");
import rules = require("./Rules");
import logger = require("../utils/Logger");
import util = require("util");

import {
  Game,
  World,
  GameState,
  Player,
  Actor,
} from "./Models";
import { inspect } from "util";

export interface CreateGameResponse {
  gameId: number;
}

export interface JoinGameResponse {
  gameId: number;
  playerId: number;
  turn: number;
  world: World;
  playerCount: number;
  maxPlayers: number;
}

export interface GameSummary {
  id: number;
  playerCount: number;
  maxPlayers: number;
  isFull: boolean;
}

export interface ListGamesResponse {
  gameIds: Array<number>;
  games: Array<GameSummary>;
}

/**
 * create a new game
 *
 * returns GameCreatedResponse
 **/
export async function createGame(maxPlayers?: number): Promise<CreateGameResponse> {
  const playerLimit = Math.min(Math.max(maxPlayers || 4, 2), 8); // Clamp 2-8
  const worldId = await rules.createWorld();

  const newGame: Game = {
      turn: 1,
      worldId: worldId,
      maxPlayers: playerLimit,
      gameState: GameState.LOBBY,
      createdAt: new Date(),
      players: []
  };

  const gameId = await store.create<Game>(store.keys.games, newGame);
  return { gameId };
}

/**
 * join a game
 *
 * id Integer
 * no response value expected for this operation
 **/
export async function joinGame(gameId: number, username?: string, sessionId?: string): Promise<JoinGameResponse> {
    const game = await store.read<Game>(store.keys.games, gameId);
    
    // Validation checks
    if (game.gameState !== GameState.LOBBY) {
        throw new Error("Cannot join game: Game already started");
    }
    
    if (game.players.length >= game.maxPlayers) {
        throw new Error("Game is full");
    }

    // Check for duplicate username in this game
    await validateUniqueUsername(game, username);

    // Check for duplicate session in this game
    await validateUniqueSession(game, sessionId);

    // Create player
    const isHost = game.players.length === 0; // First player is host
    const player: Player = {
        gameId,
        username,
        isHost,
        sessionId,
        joinedAt: new Date()
    };

    const playerId = await store.create(store.keys.players, player);

    // Update game
    game.players.push(playerId);
    if (isHost) {
        game.hostPlayerId = playerId;
    }
    
    await store.replace(store.keys.games, gameId, game);

    // Setup actors and return filtered game
    const world = await store.read<World>(store.keys.worlds, game.worldId);
    const actorIds = await rules.setupActors(game, playerId);
    world.actorIds = world.actorIds.concat(actorIds);
    await store.replace(store.keys.worlds, game.worldId, world);

    return await rules.filterGameForPlayer(gameId, playerId);
}

async function validateUniqueUsername(game: Game, username: string) {
    if (!username) return;
    for (const existingPlayerId of game.players) {
        const existingPlayer = await store.read<Player>(store.keys.players, existingPlayerId);
        if (existingPlayer.username === username) {
            throw new Error("Player already joined this game");
        }
    }
}

async function validateUniqueSession(game: Game, sessionId: string) {
    if (!sessionId) return;
    for (const existingPlayerId of game.players) {
        const existingPlayer = await store.read<Player>(store.keys.players, existingPlayerId);
        if (existingPlayer.sessionId === sessionId) {
            throw new Error("Player with this session has already joined the game");
        }
    }
}

export async function kickPlayer(gameId: number, playerIdToKick: number, requestingPlayerId: number): Promise<void> {
    const game = await store.read<Game>(store.keys.games, gameId);
    await validateHostPermissions(game, requestingPlayerId);

    if (game.gameState !== GameState.LOBBY) {
        throw new Error("Cannot kick players: Game already started");
    }

    if (playerIdToKick === game.hostPlayerId) {
        throw new Error("Cannot kick the host player");
    }

    // Remove player from game
    game.players = game.players.filter(pid => pid !== playerIdToKick);
    await store.replace(store.keys.games, gameId, game);

    // Remove player's actors from world
    await removePlayerActors(game.worldId, playerIdToKick);

    // Delete player record
    await store.remove(store.keys.players, playerIdToKick);
}

export async function startGame(gameId: number, requestingPlayerId: number): Promise<void> {
    const game = await store.read<Game>(store.keys.games, gameId);
    await validateHostPermissions(game, requestingPlayerId);

    if (game.gameState !== GameState.LOBBY) {
        throw new Error("Game already started");
    }

    if (game.players.length < 2) {
        throw new Error("Need at least 2 players to start game");
    }

    game.gameState = GameState.IN_PROGRESS;
    game.startedAt = new Date();
    await store.replace(store.keys.games, gameId, game);
}

export async function transferHost(gameId: number, newHostPlayerId: number, requestingPlayerId: number): Promise<void> {
    const game = await store.read<Game>(store.keys.games, gameId);
    await validateHostPermissions(game, requestingPlayerId);

    if (!game.players.includes(newHostPlayerId)) {
        throw new Error("New host must be a player in the game");
    }

    // Update host in game
    game.hostPlayerId = newHostPlayerId;
    await store.replace(store.keys.games, gameId, game);

    // Update player records to reflect host status
    const oldHostPlayer = await store.read<Player>(store.keys.players, requestingPlayerId);
    const newHostPlayer = await store.read<Player>(store.keys.players, newHostPlayerId);

    oldHostPlayer.isHost = false;
    newHostPlayer.isHost = true;

    await store.replace(store.keys.players, requestingPlayerId, oldHostPlayer);
    await store.replace(store.keys.players, newHostPlayerId, newHostPlayer);
}

async function validateHostPermissions(game: Game, requestingPlayerId: number) {
    if (game.hostPlayerId !== requestingPlayerId) {
        throw new Error("Only the host can perform this action");
    }
}

async function removePlayerActors(worldId: number, playerId: number) {
    const world = await store.read<World>(store.keys.worlds, worldId);
    const actorObjects = await Promise.all(world.actorIds.map(id => store.read<Actor>(store.keys.actors, id)));
    const remainingActorIds = actorObjects
        .filter(actor => actor.owner !== playerId)
        .map(actor => actor.id);
    world.actorIds = remainingActorIds;
    await store.replace(store.keys.worlds, worldId, world);
}

export async function getPlayerGameState(gameId: number, playerId: number): Promise<JoinGameResponse> {
    // Verify that the player belongs to the game
    const game = await store.read<Game>(store.keys.games, gameId);

    if (!game.players || !game.players.includes(playerId)) {
        throw new Error("Player does not belong to this game");
    }

    // Return the filtered game state for this player
    return await rules.filterGameForPlayer(gameId, playerId);
}

export async function listGames(): Promise<ListGamesResponse> {
  const games = await store.readAll<Game>(store.keys.games, () => true);
  const ids = games.map((g) => g.id);
  const gameSummaries: GameSummary[] = games.map((g) => {
    const playerCount = g.players ? g.players.length : 0;
    return {
      id: g.id!,
      playerCount,
      maxPlayers: g.maxPlayers || 0,
      isFull: playerCount >= (g.maxPlayers || 0)
    };
  });
  return { gameIds: ids, games: gameSummaries };
}
