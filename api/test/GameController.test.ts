import assert = require("assert");
import * as GameService from "../service/GameService";
import * as store from "../service/Store";
import * as databaseStore from "../service/DatabaseStore";

const GameController = require("../controllers/GameController");

describe("GameController", function () {
  describe("createGame", function () {
    beforeEach(() => {
      store.deleteAll();
    });

    it("should create a game with default maxPlayers when not specified", async function () {
      const mockContext: any = {
        requestBody: {},
        params: { path: {}, query: {} },
        res: {
          status: function(code: number) {
            this.statusCode = code;
            return this;
          },
          statusCode: 0,
          json: function() { return this; }
        }
      };

      const result = await GameController.createGame(mockContext);
      assert.equal(mockContext.res.statusCode, 201);
      assert(result.gameId !== undefined, "Game ID should be defined");
      assert(typeof result.gameId === 'number', "Game ID should be a number");

      // Verify that the game was created with default maxPlayers (4)
      const createdGame = await store.read<any>(store.keys.games, result.gameId);
      assert.equal(createdGame.maxPlayers, 4, "Default maxPlayers should be 4");
    });

    it("should create a game with valid maxPlayers", async function () {
      const mockContext: any = {
        requestBody: { maxPlayers: 4 },
        params: { path: {}, query: {} },
        res: {
          status: function(code: number) {
            this.statusCode = code;
            return this;
          },
          statusCode: 0,
          json: function() { return this; }
        }
      };

      const result = await GameController.createGame(mockContext);
      assert.equal(mockContext.res.statusCode, 201);
      assert(result.gameId !== undefined, "Game ID should be defined");
      assert(typeof result.gameId === 'number', "Game ID should be a number");
    });
  });

  describe("listGames", function () {
    beforeEach(() => {
      store.deleteAll();
    });

    it("should return list of games", async function () {
      // Create some games first
      await GameService.createGame();
      await GameService.createGame();

      const mockContext: any = {
        params: { path: {}, query: {} },
        res: {
          status: function(code: number) {
            this.statusCode = code;
            return this;
          },
          statusCode: 0,
          json: function() { return this; }
        }
      };

      const result = await GameController.listGames(mockContext);
      assert.equal(mockContext.res.statusCode, 200);
      assert(result.games, "Should have games property");
      assert(Array.isArray(result.games), "Games should be an array");
      assert.equal(result.games.length, 2, "Should have 2 games");
      assert(result.gameIds, "Should have gameIds property");
      assert(Array.isArray(result.gameIds), "gameIds should be an array");
      assert.equal(result.gameIds.length, 2, "Should have 2 game IDs");
    });
  });

  describe("joinGame", function () {
    beforeEach(() => {
      store.deleteAll();
    });

    it("should join a game successfully", async function () {
      const game = await GameService.createGame();
      
      const mockContext: any = {
        params: { path: { id: game.id }, query: {} },
        user: { email: "testuser", id: "session123" },
        res: {
          status: function(code: number) {
            this.statusCode = code;
            return this;
          },
          statusCode: 0,
          json: function() { return this; }
        }
      };

      const result = await GameController.joinGame(mockContext);
      assert.equal(mockContext.res.statusCode, 200);
      assert.equal(result.gameId, game.id);
      assert(typeof result.playerId === 'number');
    });

    it("should return error message for non-existent game", async function () {
      const mockContext: any = {
        params: { path: { id: 9999 }, query: {} },
        user: { email: "testuser", id: "session123" },
        res: {
          status: function(code: number) { 
            this.statusCode = code;
            return this; 
          },
          json: function() { return this; },
          statusCode: 200
        }
      };

      const result = await GameController.joinGame(mockContext);
      assert(result.message, "Should have error message");
      assert.equal(mockContext.res.statusCode, 404);
      assert.equal(result.message, "games with id 9999 not found");
    });
  });

  describe("postOrders", function () {
    beforeEach(() => {
      store.deleteAll();
    });

    it("should post orders successfully", async function () {
      const game = await GameService.createGame();
      const player = await GameService.joinGame(game.id);

      const mockContext: any = {
        requestBody: { 
          gameId: game.id,
          turn: 1,
          playerId: player.playerId,
          orders: []
        },
        params: { 
          path: { 
            gameId: game.id, 
            turn: 1, 
            playerId: player.playerId 
          }, 
          query: {} 
        },
        res: {
          status: function(code: number) {
            this.statusCode = code;
            return this;
          },
          statusCode: 0,
          json: function() { return this; }
        }
      };

      const result = await GameController.postOrders(mockContext);
      assert.equal(mockContext.res.statusCode, 200);
      assert(result.turnStatus !== undefined, "Should have turnStatus property");
      assert(typeof result.turnStatus.complete === 'boolean', "turnStatus.complete should be a boolean");
    });

    it("should return error for invalid game", async function () {
      const mockContext: any = {
        requestBody: { orders: [] },
        params: { 
          path: { gameId: 9999, turn: 1, playerId: 1 }, 
          query: {} 
        },
        res: {
          status: function(code: number) {
            this.statusCode = code;
            return this;
          },
          json: function() { return this; },
          statusCode: 200
        }
      };

      const result = await GameController.postOrders(mockContext);
      assert(result.message, "Should have error message");
      assert.equal(mockContext.res.statusCode, 404);
      assert.equal(result.message, "games with id 9999 not found");
    });
  });

  describe("turnResults", function () {
    beforeEach(() => {
      store.deleteAll();
    });

    it("should return unsuccessful turn results with message when no results available", async function () {
      const game = await GameService.createGame();
      const player = await GameService.joinGame(game.id);

      const mockContext: any = {
        params: { 
          path: { 
            gameId: game.id, 
            turn: 1, 
            playerId: player.playerId 
          }, 
          query: {} 
        },
        res: {
          status: function(code: number) {
            this.statusCode = code;
            return this;
          },
          statusCode: 0,
          json: function() { return this; }
        }
      };

      const result = await GameController.turnResults(mockContext);
      assert.equal(mockContext.res.statusCode, 404);
      assert(result.message !== undefined, "Should have message property");
      assert.equal(result.message, "turn results not available");
    });

    it("should return successful turn results with world data when available", async function () {
      const game = await GameService.createGame();
      const player = await GameService.joinGame(game.id);

      await GameService.postOrders(
        { orders: [] },
        game.id,
        1,
        player.playerId
      );

      const mockContext: any = {
        params: {
          path: {
            gameId: game.id,
            turn: 1,
            playerId: player.playerId
          },
          query: {}
        },
        res: {
          status: function(code: number) {
            this.statusCode = code;
            return this;
          },
          statusCode: 0,
          json: function() { return this; }
        }
      };

      const result = await GameController.turnResults(mockContext);
      assert.equal(mockContext.res.statusCode, 200);
      assert(result.world !== undefined, "Should have world property");
    });
  });

  describe("lobby management responses", function () {
    beforeEach(() => {
      store.deleteAll();
    });

    it("should return success payload when kicking a player", async function () {
      const game = await GameService.createGame();
      const host = await GameService.joinGame(game.id, "host@example.com", "host-session");
      const player = await GameService.joinGame(game.id, "player@example.com", "player-session");

      const mockContext: any = {
        params: { path: { gameId: game.id, playerId: player.playerId }, query: {} },
        user: { playerId: host.playerId },
        res: {
          status: function(code: number) {
            this.statusCode = code;
            return this;
          },
          json: function() { return this; },
          statusCode: 0
        }
      };

      const result = await GameController.kickPlayer(mockContext);
      assert.equal(mockContext.res.statusCode, 200);
      assert.equal(result.success, true);
    });

    it("should return success payload when starting a game", async function () {
      const game = await GameService.createGame();
      const host = await GameService.joinGame(game.id, "host@example.com", "host-session");
      await GameService.joinGame(game.id, "player@example.com", "player-session");

      const mockContext: any = {
        params: { path: { gameId: game.id }, query: {} },
        user: { playerId: host.playerId },
        res: {
          status: function(code: number) {
            this.statusCode = code;
            return this;
          },
          json: function() { return this; },
          statusCode: 0
        }
      };

      const result = await GameController.startGame(mockContext);
      assert.equal(mockContext.res.statusCode, 200);
      assert.equal(result.success, true);
    });

    it("should return success payload when transferring host", async function () {
      const game = await GameService.createGame();
      const host = await GameService.joinGame(game.id, "host@example.com", "host-session");
      const player = await GameService.joinGame(game.id, "player@example.com", "player-session");

      const mockContext: any = {
        requestBody: { newHostPlayerId: player.playerId },
        params: { path: { gameId: game.id }, query: {} },
        user: { playerId: host.playerId },
        res: {
          status: function(code: number) {
            this.statusCode = code;
            return this;
          },
          json: function() { return this; },
          statusCode: 0
        }
      };

      const result = await GameController.transferHost(mockContext);
      assert.equal(mockContext.res.statusCode, 200);
      assert.equal(result.success, true);
    });
  });

  describe("getPlayerGameState", function () {
    beforeEach(() => {
      store.deleteAll();
    });

    it("should return player game state for authorized player", async function () {
      const game = await GameService.createGame();
      const player = await GameService.joinGame(game.id, "testuser", "session123");

      const mockContext: any = {
        params: {
          path: {
            gameId: game.id,
            playerId: player.playerId
          },
          query: {}
        },
        user: { email: "testuser", id: "session123" },
        res: {
          status: function(code: number) {
            this.statusCode = code;
            return this;
          },
          statusCode: 0,
          json: function() { return this; }
        }
      };

      const result = await GameController.getPlayerGameState(mockContext);
      assert.equal(mockContext.res.statusCode, 200);
      assert.equal(result.gameId, game.id);
      assert.equal(result.playerId, player.playerId);
      assert(result.world !== undefined);
      assert(result.hostPlayerId !== undefined);
      assert(result.gameState !== undefined);
    });

    it("should return 403 for unauthorized player", async function () {
      const game = await GameService.createGame();
      const player = await GameService.joinGame(game.id, "testuser", "session123");

      const mockContext: any = {
        params: {
          path: {
            gameId: game.id,
            playerId: player.playerId
          },
          query: {}
        },
        user: { email: "otheruser", id: "othersession" },
        res: {
          status: function(code: number) {
            this.statusCode = code;
            return this;
          },
          json: function() { return this; },
          statusCode: 200
        }
      };

      const result = await GameController.getPlayerGameState(mockContext);
      assert.equal(mockContext.res.statusCode, 403);
      assert.equal(result.message, "You can only access your own game state");
    });

    it("should return 404 for non-existent player", async function () {
      const game = await GameService.createGame();

      const mockContext: any = {
        params: {
          path: {
            gameId: game.id,
            playerId: 9999
          },
          query: {}
        },
        user: { email: "testuser", id: "session123" },
        res: {
          status: function(code: number) {
            this.statusCode = code;
            return this;
          },
          json: function() { return this; },
          statusCode: 200
        }
      };

      const result = await GameController.getPlayerGameState(mockContext);
      assert.equal(mockContext.res.statusCode, 404);
      assert.equal(result.message, "Player not found");
    });

    it("should return 404 when the player belongs to another game", async function () {
      const game1 = await GameService.createGame();
      const game2 = await GameService.createGame();
      const player = await GameService.joinGame(game1.id, "testuser", "session123");

      const mockContext: any = {
        params: {
          path: {
            gameId: game2.id,
            playerId: player.playerId
          },
          query: {}
        },
        user: { email: "testuser", id: "session123" },
        res: {
          status: function(code: number) {
            this.statusCode = code;
            return this;
          },
          json: function() { return this; },
          statusCode: 200
        }
      };

      const result = await GameController.getPlayerGameState(mockContext);
      assert.equal(mockContext.res.statusCode, 404);
      assert.equal(result.message, "Player not found");
    });

    it("should return 500 for unexpected store errors", async function () {
      const mutableDatabaseStore = databaseStore as any;
      const originalRead = mutableDatabaseStore.read;
      mutableDatabaseStore.read = async function () {
        throw new Error("Unexpected store failure");
      };

      const mockContext: any = {
        params: {
          path: {
            gameId: 1,
            playerId: 1
          },
          query: {}
        },
        user: { email: "testuser", id: "session123" },
        res: {
          status: function(code: number) {
            this.statusCode = code;
            return this;
          },
          json: function() { return this; },
          statusCode: 200
        }
      };

      try {
        const result = await GameController.getPlayerGameState(mockContext);
        assert.equal(mockContext.res.statusCode, 500);
        assert.equal(result.message, "Unexpected store failure");
      } finally {
        mutableDatabaseStore.read = originalRead;
      }
    });
  });
});
