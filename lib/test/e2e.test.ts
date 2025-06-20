import assert = require("assert");
import superagent = require("superagent");
import util = require("util");

let bearerToken: string;
let createdGameId: number;
let createdPlayerId: number;

before(async () => {
  try {
    const response = await superagent
      .post("http://localhost:3000/users/login")
      .send({ username: "testuser", password: "testpassword" }); // Using "testpassword" as "testpass" might be too short
    assert(response.body.token, "Login token should be received");
    bearerToken = response.body.token;
    console.log("[E2E TEST LOG] Successfully logged in and got token.");
  } catch (error) {
    console.error("[E2E TEST LOG] Login failed:", error.status, error.response?.body);
    // If login fails, bearerToken will be undefined, and subsequent tests will likely fail with auth errors.
    // This is acceptable as it highlights a problem with the login prerequisite.
  }
});

describe("createAGame", () => {
  it("should create a game successfully", async () => {
    const response = await superagent
      .post("http://localhost:3000/games")
      .set('Authorization', 'Bearer ' + bearerToken)
      .send();
    assert.equal(response.statusCode, 200);
    assert(typeof response.body.id === 'number' && response.body.id >= 0, "response.body.id should be a non-negative number");
    createdGameId = response.body.id; // Store the created game's ID
    console.log(`[E2E TEST LOG] Game created with ID: ${createdGameId}, stored for subsequent tests.`);
  });
});

describe("joinAGame", () => {
  it("should join a game successfully", async () => {
    assert(typeof createdGameId === 'number', "[E2E PRE-REQ] createdGameId should be set from createAGame test");
    const response = await superagent
      .put(`http://localhost:3000/games/${createdGameId}`)
      .set('Authorization', 'Bearer ' + bearerToken)
      .send();
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.gameId, createdGameId);
    assert(typeof response.body.playerId === 'number' && response.body.playerId >= 0, "response.body.playerId should be a non-negative number");
    createdPlayerId = response.body.playerId; // Store the created player's ID
    console.log(`[E2E TEST LOG] Player joined game ${createdGameId} with player ID: ${createdPlayerId}, stored for subsequent tests.`);
    assert.equal(response.body.turn, 1);
  });
});

describe("sendOrders", () => {
  it("should send orders successfully", async () => {
    assert(typeof createdGameId === 'number', "[E2E PRE-REQ] createdGameId should be set");
    assert(typeof createdPlayerId === 'number', "[E2E PRE-REQ] createdPlayerId should be set");
    const turn = 1; // Assuming this is the first turn
    const orders = {
      gameId: createdGameId,
      turn: turn,
      playerId: createdPlayerId,
      orders: [],
    };
    const response = await superagent
      .post(
        util.format(
          "http://localhost:3000/games/%s/turns/%s/players/%s",
          createdGameId,
          turn,
          createdPlayerId,
        ),
      )
      .set('Authorization', 'Bearer ' + bearerToken)
      .send(orders);
    assert.equal(response.statusCode, 200);
  });
});

describe("getTurnResults", () => {
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
          createdPlayerId,
        ),
      )
      .set('Authorization', 'Bearer ' + bearerToken)
      .send();
    assert.equal(response.statusCode, 200);
    console.log(`[E2E TEST LOG] Successfully sent orders for game ${createdGameId}, player ${createdPlayerId}.`);
  });
});
