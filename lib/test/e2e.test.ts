import assert = require("assert");
import { createAGame, joinAGame, sendOrders, getTurnResults } from "./e2e";

describe("e2e tests", () => {
  it("create a game", async () => {
    const response = await createAGame();
    assert.equal(response.status, 200);
  });

  it("join a game", async () => {
    const mockGameId = 1;
    const response = await joinAGame(mockGameId);
    assert.equal(response.status, 200);
  });

  it("send orders", async () => {
    const mockGameId = 1;
    const mockPlayerId = 1;
    const mockTurn = 1;
    const mockOrders = { orders: [] };
    const response = await sendOrders(
      mockGameId,
      mockPlayerId,
      mockTurn,
      mockOrders,
    );
    assert.equal(response.status, 200);
  });

  it("get turn results", async () => {
    const mockGameId = 1;
    const mockPlayerId = 1;
    const mockTurn = 1;
    const response = await getTurnResults(mockGameId, mockPlayerId, mockTurn);
    assert.equal(response.status, 200);
  });
});
