import assert = require("assert");
import superagent = require("superagent");
import util = require("util");

describe.skip("createAGame", () => {
  it("should create a game successfully", async () => {
    const response = await superagent
      .post("http://localhost:3000/games")
      .send();
    assert.equal(response.statusCode, 200);
    assert(response.body.id);
  });
});

describe.skip("joinAGame", () => {
  it("should join a game successfully", async () => {
    const gameId = 1; // Replace with a valid game ID
    const response = await superagent
      .put(`http://localhost:3000/games/${gameId}`)
      .send();
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.gameId, gameId);
    assert(response.body.playerId);
    assert.equal(response.body.turn, 1);
  });
});

describe.skip("sendOrders", () => {
  it("should send orders successfully", async () => {
    const gameId = 1; // Replace with a valid game ID
    const playerId = 1; // Replace with a valid player ID
    const turn = 1;
    const orders = {
      gameId: gameId,
      turn: turn,
      playerId: playerId,
      orders: [],
    };
    const response = await superagent
      .post(
        util.format(
          "http://localhost:3000/games/%s/turns/%s/players/%s",
          gameId,
          turn,
          playerId,
        ),
      )
      .send(orders);
    assert.equal(response.statusCode, 200);
  });
});

describe.skip("getTurnResults", () => {
  it("should get turn results successfully", async () => {
    const gameId = 1; // Replace with a valid game ID
    const playerId = 1; // Replace with a valid player ID
    const turn = 1;
    const response = await superagent
      .get(
        util.format(
          "http://localhost:3000/games/%s/turns/%s/players/%s",
          gameId,
          turn,
          playerId,
        ),
      )
      .send();
    assert.equal(response.statusCode, 200);
  });
});
