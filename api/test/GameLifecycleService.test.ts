import assert = require("assert");
import * as GameLifecycleService from "../service/GameLifecycleService";
import * as store from "../service/Store";
import { Game, Player, GameState } from "../service/Models";

describe("GameLifecycleService", function () {
  beforeEach(() => {
    store.deleteAll();
  });

  describe("kickPlayer", function () {
    it("should allow host to kick a player from the game", async function () {
      // Create a game and add players
      const createResponse = await GameLifecycleService.createGame(4);
      const gameId = createResponse.gameId;
      
      // Join as host (first player)
      const hostJoinResponse = await GameLifecycleService.joinGame(gameId, "host");
      const hostPlayerId = hostJoinResponse.playerId;
      
      // Join as another player
      const playerJoinResponse = await GameLifecycleService.joinGame(gameId, "player");
      const playerToKickId = playerJoinResponse.playerId;
      
      // Verify both players are in the game
      const gameBeforeKick = await store.read<Game>(store.keys.games, gameId);
      assert(gameBeforeKick.players.includes(hostPlayerId));
      assert(gameBeforeKick.players.includes(playerToKickId));
      assert.equal(gameBeforeKick.players.length, 2);
      
      // Host kicks the player
      await GameLifecycleService.kickPlayer(gameId, playerToKickId, hostPlayerId);
      
      // Verify player was removed from the game
      const gameAfterKick = await store.read<Game>(store.keys.games, gameId);
      assert(gameAfterKick.players.includes(hostPlayerId));
      assert(!gameAfterKick.players.includes(playerToKickId));
      assert.equal(gameAfterKick.players.length, 1);
      
      // Verify player record was deleted
      try {
        await store.read<Player>(store.keys.players, playerToKickId);
        assert.fail("Player record should have been deleted");
      } catch (error) {
        // Expected - player record was deleted
        assert.ok(error);
      }
    });

    it("should fail if non-host tries to kick a player", async function () {
      // Create a game and add players
      const createResponse = await GameLifecycleService.createGame(4);
      const gameId = createResponse.gameId;
      
      // Join as host (first player)
      const hostJoinResponse = await GameLifecycleService.joinGame(gameId, "host");
      const hostPlayerId = hostJoinResponse.playerId;
      
      // Join as another player (non-host)
      const playerJoinResponse = await GameLifecycleService.joinGame(gameId, "player");
      const nonHostPlayerId = playerJoinResponse.playerId;
      const playerToKickId = hostPlayerId; // Try to kick the host
      
      // Non-host tries to kick someone - should fail
      try {
        await GameLifecycleService.kickPlayer(gameId, playerToKickId, nonHostPlayerId);
        assert.fail("Expected kickPlayer to throw an error");
      } catch (error) {
        assert.equal(error.message, "Only the host can perform this action");
      }
    });

    it("should fail if trying to kick the host", async function () {
      // Create a game and add players
      const createResponse = await GameLifecycleService.createGame(4);
      const gameId = createResponse.gameId;
      
      // Join as host (first player)
      const hostJoinResponse = await GameLifecycleService.joinGame(gameId, "host");
      const hostPlayerId = hostJoinResponse.playerId;
      
      // Join as another player
      const playerJoinResponse = await GameLifecycleService.joinGame(gameId, "player");
      const nonHostPlayerId = playerJoinResponse.playerId;
      
      // Host tries to kick themselves - should fail
      try {
        await GameLifecycleService.kickPlayer(gameId, hostPlayerId, hostPlayerId);
        assert.fail("Expected kickPlayer to throw an error");
      } catch (error) {
        assert.equal(error.message, "Cannot kick the host player");
      }
    });

    it("should fail if trying to kick from a started game", async function () {
      // Create a game and add players
      const createResponse = await GameLifecycleService.createGame(4);
      const gameId = createResponse.gameId;
      
      // Join as host (first player)
      const hostJoinResponse = await GameLifecycleService.joinGame(gameId, "host");
      const hostPlayerId = hostJoinResponse.playerId;
      
      // Join as another player
      const playerJoinResponse = await GameLifecycleService.joinGame(gameId, "player");
      const playerToKickId = playerJoinResponse.playerId;
      
      // Start the game
      await GameLifecycleService.startGame(gameId, hostPlayerId);
      
      // Try to kick a player from a started game - should fail
      try {
        await GameLifecycleService.kickPlayer(gameId, playerToKickId, hostPlayerId);
        assert.fail("Expected kickPlayer to throw an error");
      } catch (error) {
        assert.equal(error.message, "Cannot kick players: Game already started");
      }
    });
  });

  describe("startGame", function () {
    it("should allow host to start a game with sufficient players", async function () {
      // Create a game and add players
      const createResponse = await GameLifecycleService.createGame(4);
      const gameId = createResponse.gameId;
      
      // Join as host (first player)
      const hostJoinResponse = await GameLifecycleService.joinGame(gameId, "host");
      const hostPlayerId = hostJoinResponse.playerId;
      
      // Join as another player (need at least 2)
      await GameLifecycleService.joinGame(gameId, "player");
      
      // Verify game is in LOBBY state initially
      const gameBeforeStart = await store.read<Game>(store.keys.games, gameId);
      assert.equal(gameBeforeStart.gameState, GameState.LOBBY);
      
      // Host starts the game
      await GameLifecycleService.startGame(gameId, hostPlayerId);
      
      // Verify game state changed to IN_PROGRESS
      const gameAfterStart = await store.read<Game>(store.keys.games, gameId);
      assert.equal(gameAfterStart.gameState, GameState.IN_PROGRESS);
    });

    it("should fail if non-host tries to start the game", async function () {
      // Create a game and add players
      const createResponse = await GameLifecycleService.createGame(4);
      const gameId = createResponse.gameId;
      
      // Join as host (first player)
      const hostJoinResponse = await GameLifecycleService.joinGame(gameId, "host");
      const hostPlayerId = hostJoinResponse.playerId;
      
      // Join as another player (non-host)
      const playerJoinResponse = await GameLifecycleService.joinGame(gameId, "player");
      const nonHostPlayerId = playerJoinResponse.playerId;
      
      // Non-host tries to start the game - should fail
      try {
        await GameLifecycleService.startGame(gameId, nonHostPlayerId);
        assert.fail("Expected startGame to throw an error");
      } catch (error) {
        assert.equal(error.message, "Only the host can perform this action");
      }
    });

    it("should fail if trying to start game with insufficient players", async function () {
      // Create a game and add only the host
      const createResponse = await GameLifecycleService.createGame(4);
      const gameId = createResponse.gameId;
      
      // Join as host (first player)
      const hostJoinResponse = await GameLifecycleService.joinGame(gameId, "host");
      const hostPlayerId = hostJoinResponse.playerId;
      
      // Try to start game with only 1 player - should fail
      try {
        await GameLifecycleService.startGame(gameId, hostPlayerId);
        assert.fail("Expected startGame to throw an error");
      } catch (error) {
        assert.equal(error.message, "Need at least 2 players to start game");
      }
    });

    it("should fail if trying to start an already started game", async function () {
      // Create a game and add players
      const createResponse = await GameLifecycleService.createGame(4);
      const gameId = createResponse.gameId;
      
      // Join as host (first player)
      const hostJoinResponse = await GameLifecycleService.joinGame(gameId, "host");
      const hostPlayerId = hostJoinResponse.playerId;
      
      // Join as another player (need at least 2)
      await GameLifecycleService.joinGame(gameId, "player");
      
      // Start the game
      await GameLifecycleService.startGame(gameId, hostPlayerId);
      
      // Try to start the game again - should fail
      try {
        await GameLifecycleService.startGame(gameId, hostPlayerId);
        assert.fail("Expected startGame to throw an error");
      } catch (error) {
        assert.equal(error.message, "Game already started");
      }
    });
  });

  describe("transferHost", function () {
    it("should allow host to transfer host privileges to another player", async function () {
      // Create a game and add players
      const createResponse = await GameLifecycleService.createGame(4);
      const gameId = createResponse.gameId;
      
      // Join as host (first player)
      const hostJoinResponse = await GameLifecycleService.joinGame(gameId, "host");
      const originalHostPlayerId = hostJoinResponse.playerId;
      
      // Join as another player
      const playerJoinResponse = await GameLifecycleService.joinGame(gameId, "player");
      const newHostPlayerId = playerJoinResponse.playerId;
      
      // Verify original host status
      const gameBeforeTransfer = await store.read<Game>(store.keys.games, gameId);
      assert.equal(gameBeforeTransfer.hostPlayerId, originalHostPlayerId);
      
      const originalHostRecord = await store.read<Player>(store.keys.players, originalHostPlayerId);
      assert.equal(originalHostRecord.isHost, true);
      
      const newHostRecord = await store.read<Player>(store.keys.players, newHostPlayerId);
      assert.equal(newHostRecord.isHost, false);
      
      // Host transfers host privileges
      await GameLifecycleService.transferHost(gameId, newHostPlayerId, originalHostPlayerId);
      
      // Verify host status changed
      const gameAfterTransfer = await store.read<Game>(store.keys.games, gameId);
      assert.equal(gameAfterTransfer.hostPlayerId, newHostPlayerId);
      
      const updatedOriginalHost = await store.read<Player>(store.keys.players, originalHostPlayerId);
      assert.equal(updatedOriginalHost.isHost, false);
      
      const updatedNewHost = await store.read<Player>(store.keys.players, newHostPlayerId);
      assert.equal(updatedNewHost.isHost, true);
    });

    it("should fail if non-host tries to transfer host", async function () {
      // Create a game and add players
      const createResponse = await GameLifecycleService.createGame(4);
      const gameId = createResponse.gameId;
      
      // Join as host (first player)
      const hostJoinResponse = await GameLifecycleService.joinGame(gameId, "host");
      const hostPlayerId = hostJoinResponse.playerId;
      
      // Join as another player (non-host)
      const playerJoinResponse = await GameLifecycleService.joinGame(gameId, "player");
      const nonHostPlayerId = playerJoinResponse.playerId;
      
      // Non-host tries to transfer host - should fail
      try {
        await GameLifecycleService.transferHost(gameId, hostPlayerId, nonHostPlayerId);
        assert.fail("Expected transferHost to throw an error");
      } catch (error) {
        assert.equal(error.message, "Only the host can perform this action");
      }
    });

    it("should fail if trying to transfer host to a non-existent player in the game", async function () {
      // Create a game and add players
      const createResponse = await GameLifecycleService.createGame(4);
      const gameId = createResponse.gameId;
      
      // Join as host (first player)
      const hostJoinResponse = await GameLifecycleService.joinGame(gameId, "host");
      const hostPlayerId = hostJoinResponse.playerId;
      
      // Try to transfer host to a player ID that doesn't exist in the game
      try {
        await GameLifecycleService.transferHost(gameId, 999, hostPlayerId);
        assert.fail("Expected transferHost to throw an error");
      } catch (error) {
        assert.equal(error.message, "New host must be a player in the game");
      }
    });
  });
});