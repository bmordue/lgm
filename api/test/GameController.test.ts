import assert = require("assert");
import * as GameService from "../service/GameService";
import * as store from "../service/Store";

const GameController = require("../controllers/GameController");

describe("GameController", function () {
  describe("createGame", function () {
    beforeEach(() => {
      store.deleteAll();
    });

    it("should return error when maxPlayers is missing", async function () {
      const mockContext: any = {
        requestBody: {},
        params: { path: {}, query: {} },
        res: {
          status: function() { return this; },
          json: function() { return this; }
        }
      };

      const result = await GameController.createGame(mockContext);
      assert.equal(result.status, 400);
      assert.equal(result.body.message, "Missing required field: maxPlayers");
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
      assert(result.id !== undefined, "Game ID should be defined");
      assert(typeof result.id === 'number', "Game ID should be a number");
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
        params: { path: { id: game.id }, query: {} },
        user: { username: "testuser", sessionId: "session123" },
        res: {
          status: function() { return this; },
          json: function() { return this; }
        }
      };

      const result = await GameController.joinGame(mockContext);
      assert.equal(result.gameId, game.id);
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

    it("should return turn results with placeholder", async function () {
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
          status: function() { return this; },
          json: function() { return this; }
        }
      };

      const result = await GameController.turnResults(mockContext);
      assert(result.placeholder !== undefined, "Should have placeholder property");
    });
  });
});
