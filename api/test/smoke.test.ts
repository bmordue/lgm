import assert = require("assert");
import * as GameService from "../service/GameService";
import * as store from "../service/Store";


describe("createGame", () => {
  it("should create a game successfully", async () => {
    const response = await GameService.createGame();
    assert(response.gameId);
  });
});

describe("joinGame", () => {
  before(() => {
    store.deleteAll();
  });
  it("should join a game successfully", async () => {
    const game = await GameService.createGame();
    const gameId = game.gameId;
    console.log(`[TEST LOG] Game created with id: ${gameId}`);
    const response = await GameService.joinGame(gameId);
    console.log("[TEST LOG] Response from joinGame:", JSON.stringify(response, null, 2));
    assert.equal(response.gameId, gameId);
    assert(typeof response.playerId === 'number' && response.playerId >= 0, "response.playerId should be a non-negative number");
    assert.equal(response.turn, 1);
  });

  it("should fail to join a non-existent game", async () => {
    const gameId = 9999; // Non-existent game ID
    try {
      await GameService.joinGame(gameId);
      assert.fail("Expected joinGame to throw");
    } catch (e) {
      assert.equal(e.message, `id ${gameId} not found for key games`);
    }
  });
});

describe("postOrders", () => {
  before(() => {
    store.deleteAll();
  });

  it("should post orders successfully", async () => {
    const game = await GameService.createGame();
    const gameId = game.gameId;
    const player = await GameService.joinGame(gameId);
    const playerId = player.playerId;
    const turn = 1;
    const orders = {
      gameId: gameId,
      turn: turn,
      playerId: playerId,
      orders: [],
    };
    const response = await GameService.postOrders(
      orders,
      gameId,
      turn,
      playerId,
    );
    assert.equal(response.turnStatus.complete, true);
  });

  it("should fail to post orders for a non-existent game", async () => {
    const gameId = 9999; // Non-existent game ID
    const playerId = 1; // Replace with a valid player ID
    const turn = 1;
    const orders = {
      gameId: gameId,
      turn: turn,
      playerId: playerId,
      orders: [],
    };
    try {
      await GameService.postOrders(orders, gameId, turn, playerId);
      assert.fail("Expected postOrders to throw");
    } catch (e) {
      assert.equal(e.message, `id ${gameId} not found for key games`);
    }
  });
});

describe("turnResults", () => {
  before(() => {
    store.deleteAll();
  });

  it("should get turn results successfully", async () => {
    const game = await GameService.createGame();
    const gameId = game.gameId;
    const player = await GameService.joinGame(gameId);
    const playerId = player.playerId;
    const turn = 1;

    // Post empty orders to make the turn complete for this player
    const orders = {
      gameId: gameId,
      turn: turn,
      playerId: playerId,
      orders: [],
    };
    await GameService.postOrders(orders, gameId, turn, playerId);

    const response = await GameService.turnResults(gameId, turn, playerId);
    assert.equal(response.success, true, "Expected turnResults to be successful after posting orders");
  });

  it("should fail to get turn results for a non-existent game", async () => {
    const gameId = 9999; // Non-existent game ID
    const playerId = 1; // Replace with a valid player ID
    const turn = 1;
    // Assuming turnResults for a non-existent game does not throw,
    // but returns a response indicating failure.
    const response = await GameService.turnResults(gameId, turn, playerId);
    assert.equal(response.success, false, "Expected turnResults to indicate failure for a non-existent game");
  });
});
