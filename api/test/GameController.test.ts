import assert = require("assert");
import * as GameService from "../service/GameService";
import * as store from "../service/Store";

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
          status: function() { return this; },
          json: function() { return this; }
        }
      };

      const result = await GameController.createGame(mockContext);
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
          status: function() { return this; },
          json: function() { return this; }
        }
      };

      const result = await GameController.createGame(mockContext);
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
          status: function() { return this; },
          json: function() { return this; }
        }
      };

      const result = await GameController.listGames(mockContext);
      assert(result.games, "Should have games property");
      assert(Array.isArray(result.games), "Games should be an array");
      assert.equal(result.games.length, 2, "Should have 2 games");
    });
  });

  describe("joinGame", function () {
    beforeEach(() => {
      store.deleteAll();
    });

    it("should join a game successfully", async function () {
      const game = await GameService.createGame();
      
      const mockContext: any = {
        params: { path: { id: game.gameId }, query: {} },
        user: { username: "testuser", sessionId: "session123" },
        res: {
          status: function() { return this; },
          json: function() { return this; }
        }
      };

      const result = await GameController.joinGame(mockContext);
      assert.equal(result.gameId, game.gameId);
      assert(typeof result.playerId === 'number');
    });

    it("should return error message for non-existent game", async function () {
      const mockContext: any = {
        params: { path: { id: 9999 }, query: {} },
        user: { username: "testuser", sessionId: "session123" },
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
      assert.equal(mockContext.res.statusCode, 500);
    });
  });

  describe("postOrders", function () {
    beforeEach(() => {
      store.deleteAll();
    });

    it("should post orders successfully", async function () {
      const game = await GameService.createGame();
      const player = await GameService.joinGame(game.gameId);

      const mockContext: any = {
        requestBody: { 
          gameId: game.gameId,
          turn: 1,
          playerId: player.playerId,
          orders: []
        },
        params: { 
          path: { 
            gameId: game.gameId, 
            turn: 1, 
            playerId: player.playerId 
          }, 
          query: {} 
        },
        res: {
          status: function() { return this; },
          json: function() { return this; }
        }
      };

      const result = await GameController.postOrders(mockContext);
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
      assert.equal(mockContext.res.statusCode, 500);
    });
  });

  describe("turnResults", function () {
    beforeEach(() => {
      store.deleteAll();
    });

    it("should return turn results with message when no results available", async function () {
      const game = await GameService.createGame();
      const player = await GameService.joinGame(game.gameId);

      const mockContext: any = {
        params: { 
          path: { 
            gameId: game.gameId, 
            turn: 1, 
            playerId: player.playerId 
          }, 
          query: {} 
        },
        res: {
          status: function() { return this; },
          json: function() { return this; }
        }
      };

      const result = await GameController.turnResults(mockContext);
      // When no turn results are available yet, should return message
      assert(result.message !== undefined, "Should have message property");
      assert.equal(result.message, "turn results not available");
    });
  });
});
