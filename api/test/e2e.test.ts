import assert = require("assert");
import superagent = require("superagent");
import util = require("util");

const BASE_URL = "http://localhost:3000";

process.env.RUN_E2E_TESTS &&
describe('e2e tests', () => {
  describe("authentication", () => {
    it("should return 410 for POST /users/login (login is deprecated)", async () => {
      try {
        await superagent
          .post(`${BASE_URL}/users/login`)
          .send({ username: "e2e_auth_user", password: "testpassword" });
        assert.fail("Expected 410 for deprecated login endpoint");
      } catch (err: any) {
        assert.equal(err.status, 410, "Deprecated login should return 410 Gone");
      }
    });

    it("should return guest user from GET /users/me without proxy headers", async () => {
      const response = await superagent.get(`${BASE_URL}/users/me`);
      assert.equal(response.statusCode, 200);
      assert.equal(response.body.isGuest, true);
      assert.equal(response.body.id, 'guest');
    });

    it("should return user identity from GET /users/me with Remote-User header", async () => {
      const response = await superagent
        .get(`${BASE_URL}/users/me`)
        .set('Remote-User', 'alice@example.com')
        .set('Remote-Name', 'Alice');
      assert.equal(response.statusCode, 200);
      assert.equal(response.body.email, 'alice@example.com');
      assert.equal(response.body.name, 'Alice');
      assert.equal(response.body.isGuest, false);
    });
  });

  describe("single-player game flow", () => {
    const userEmail = "e2e_single_player@example.com";
    let createdGameId: number;
    let createdPlayerId: number;

    it("should list games (empty or otherwise)", async () => {
      const response = await superagent.get(`${BASE_URL}/games`);
      assert.equal(response.statusCode, 200);
      assert(Array.isArray(response.body.games), "Response should contain a games array");
    });

    it("should create a game successfully", async () => {
      const response = await superagent
        .post(`${BASE_URL}/games`)
        .set('Remote-User', userEmail)
        .send();
      assert.equal(response.statusCode, 200);
      assert(typeof response.body.id === 'number' && response.body.id >= 0, "response.body.id should be a non-negative number");
      createdGameId = response.body.id;
    });

    it("should include the new game in the games list", async () => {
      const response = await superagent.get(`${BASE_URL}/games`);
      assert.equal(response.statusCode, 200);
      const gameIds = response.body.games.map((g: any) => g.id);
      assert(gameIds.includes(createdGameId), "Newly created game should appear in games list");
    });

    it("should join a game successfully", async () => {
      assert(typeof createdGameId === 'number', "[E2E PRE-REQ] createdGameId should be set");
      const response = await superagent
        .put(`${BASE_URL}/games/${createdGameId}`)
        .set('Remote-User', userEmail)
        .send();
      assert.equal(response.statusCode, 200);
      assert.equal(response.body.gameId, createdGameId);
      assert(typeof response.body.playerId === 'number' && response.body.playerId >= 0, "response.body.playerId should be a non-negative number");
      createdPlayerId = response.body.playerId;
      assert.equal(response.body.turn, 1);
    });

    it("should send orders successfully for turn 1", async () => {
      assert(typeof createdGameId === 'number', "[E2E PRE-REQ] createdGameId should be set");
      assert(typeof createdPlayerId === 'number', "[E2E PRE-REQ] createdPlayerId should be set");
      const turn = 1;
      const orders = {
        gameId: createdGameId,
        turn: turn,
        playerId: createdPlayerId,
        orders: [],
      };
      const response = await superagent
        .post(util.format(`${BASE_URL}/games/%s/turns/%s/players/%s`, createdGameId, turn, createdPlayerId))
        .set('Remote-User', userEmail)
        .send(orders);
      assert.equal(response.statusCode, 200);
    });

    it("should get turn results after submitting orders", async () => {
      assert(typeof createdGameId === 'number', "[E2E PRE-REQ] createdGameId should be set");
      assert(typeof createdPlayerId === 'number', "[E2E PRE-REQ] createdPlayerId should be set");
      const turn = 1;
      const response = await superagent
        .get(util.format(`${BASE_URL}/games/%s/turns/%s/players/%s`, createdGameId, turn, createdPlayerId))
        .set('Remote-User', userEmail)
        .send();
      assert.equal(response.statusCode, 200);
    });
  });

  describe("multi-player game flow", () => {
    const emailP1 = "e2e_player_one@example.com";
    const emailP2 = "e2e_player_two@example.com";
    let gameId: number;
    let playerIdP1: number;
    let playerIdP2: number;

    before(async () => {
      const createResp = await superagent
        .post(`${BASE_URL}/games`)
        .set('Remote-User', emailP1)
        .send();
      gameId = createResp.body.id;

      const joinResp1 = await superagent
        .put(`${BASE_URL}/games/${gameId}`)
        .set('Remote-User', emailP1)
        .send();
      playerIdP1 = joinResp1.body.playerId;

      const joinResp2 = await superagent
        .put(`${BASE_URL}/games/${gameId}`)
        .set('Remote-User', emailP2)
        .send();
      playerIdP2 = joinResp2.body.playerId;
    });

    it("should assign different player IDs to each player", () => {
      assert(typeof playerIdP1 === 'number', "Player 1 should have a numeric ID");
      assert(typeof playerIdP2 === 'number', "Player 2 should have a numeric ID");
      assert.notEqual(playerIdP1, playerIdP2, "Players should have distinct IDs");
    });

    it("should allow both players to submit orders for turn 1", async () => {
      const turn = 1;
      const makeOrders = (playerId: number) => ({ gameId, turn, playerId, orders: [] });

      const [resp1, resp2] = await Promise.all([
        superagent
          .post(util.format(`${BASE_URL}/games/%s/turns/%s/players/%s`, gameId, turn, playerIdP1))
          .set('Remote-User', emailP1)
          .send(makeOrders(playerIdP1)),
        superagent
          .post(util.format(`${BASE_URL}/games/%s/turns/%s/players/%s`, gameId, turn, playerIdP2))
          .set('Remote-User', emailP2)
          .send(makeOrders(playerIdP2)),
      ]);

      assert.equal(resp1.statusCode, 200);
      assert.equal(resp2.statusCode, 200);
    });

    it("should return turn results for each player after all orders submitted", async () => {
      const turn = 1;
      const [resp1, resp2] = await Promise.all([
        superagent
          .get(util.format(`${BASE_URL}/games/%s/turns/%s/players/%s`, gameId, turn, playerIdP1))
          .set('Remote-User', emailP1),
        superagent
          .get(util.format(`${BASE_URL}/games/%s/turns/%s/players/%s`, gameId, turn, playerIdP2))
          .set('Remote-User', emailP2),
      ]);

      assert.equal(resp1.statusCode, 200);
      assert.equal(resp2.statusCode, 200);
    });
  });

  describe("authorization and error handling", () => {
    const userEmail = "e2e_error_user@example.com";
    let gameId: number;

    before(async () => {
      const createResp = await superagent
        .post(`${BASE_URL}/games`)
        .set('Remote-User', userEmail)
        .send();
      gameId = createResp.body.id;
    });

    it("should reject creating a game without proxy headers (guest user)", async () => {
      try {
        await superagent.post(`${BASE_URL}/games`).send();
        assert.fail("Expected 401 for unauthenticated request");
      } catch (err: any) {
        assert.equal(err.status, 401);
      }
    });

    it("should reject joining a game without proxy headers (guest user)", async () => {
      try {
        await superagent.put(`${BASE_URL}/games/${gameId}`).send();
        assert.fail("Expected 401 for unauthenticated request");
      } catch (err: any) {
        assert.equal(err.status, 401);
      }
    });

    it("should reject joining a non-existent game", async () => {
      const nonExistentGameId = 999999;
      try {
        await superagent
          .put(`${BASE_URL}/games/${nonExistentGameId}`)
          .set('Remote-User', userEmail)
          .send();
        assert.fail("Expected error for non-existent game");
      } catch (err: any) {
        assert(err.status >= 400, `Expected 4xx status, got ${err.status}`);
      }
    });
  });
});
