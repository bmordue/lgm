import lgm = require("../service/GameService");
import assert = require("assert");
import { Actor, Direction } from "../service/Models";

describe("DefaultService", function () {
  describe("fillOrTruncateOrdersList()", function () {
    it("orders list too short", function () {
      const tooShort = [1, 1, 1];
      const filled = [1, 1, 1, 6, 6, 6, 6, 6, 6, 6];
      assert.equal(filled.length, 10);
      assert.deepEqual(lgm.fillOrTruncateOrdersList(tooShort), filled);
    });

    it("orders list too long", function () {
      const tooLong = new Array(11).fill(1);
      assert.equal(tooLong.length, 11);
      const truncated = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
      assert.equal(truncated.length, 10);
      assert.deepEqual(lgm.fillOrTruncateOrdersList(tooLong), truncated);
    });

    it("orders list just right", function () {
      const justRight = [2, 2, 2, 2, 2, 2, 2, 2, 2, 2];
      assert.deepEqual(lgm.fillOrTruncateOrdersList(justRight), justRight);
    });
  });

  describe("joinGame", () => {
    let gameId: number;
    before(async () => {
      gameId = (await lgm.createGame()).id;
    });

    it("first player should be assigned Actors when joining game", async () => {
      const joinGameResponse = await lgm.joinGame(gameId);
      const playerOneId = joinGameResponse.playerId;
      const allActors = joinGameResponse.world.actors;
      const myActors = allActors.filter((a) => {
        return a.owner === playerOneId;
      });
      assert.equal(allActors.length, 9);
      assert.equal(myActors.length, 9);
    });

    it("second player should be assigned Actors when joining game", async () => {
      const joinGameResponse = await lgm.joinGame(gameId);
      const playerTwoId = joinGameResponse.playerId;
      const allActors = joinGameResponse.world.actors;
      const myActors = allActors.filter((a) => {
        return a.owner === playerTwoId;
      });
      // Verify that allActors contains at least the current player's actors (9)
      // and at most all actors in the game (18), due to visibility filtering.
      assert(allActors.length >= 9 && allActors.length <= 18, `Expected allActors.length to be between 9 and 18, but got ${allActors.length}`);
      assert.equal(myActors.length, 9);
    });

    it("joining a second time creates a new player", async () => {
      const firstResp = await lgm.joinGame(gameId);
      const secondResp = await lgm.joinGame(gameId);
      assert.equal(firstResp.gameId, secondResp.gameId);
      assert.notEqual(firstResp.playerId, secondResp.playerId);
    });

    it("should reject duplicate joins with same username", async () => {
      const gameId = (await lgm.createGame()).id;
      await lgm.joinGame(gameId, "testuser");
      
      try {
        await lgm.joinGame(gameId, "testuser");
        assert.fail("Expected error for duplicate join");
      } catch (error) {
        assert.equal(error.message, "Player already joined this game");
      }
    });

    it("should reject joining full game", async () => {
      const gameId = (await lgm.createGame()).id;
      
      // Fill the game to capacity (4 players)
      await lgm.joinGame(gameId, "player1");
      await lgm.joinGame(gameId, "player2");
      await lgm.joinGame(gameId, "player3");
      await lgm.joinGame(gameId, "player4");
      
      try {
        await lgm.joinGame(gameId, "player5");
        assert.fail("Expected error for full game");
      } catch (error) {
        assert.equal(error.message, "Game is full");
      }
    });
  });

  describe("listGames", () => {
    before(() => {
      lgm.deleteStore();
    });

    it("should return empty list if no games have been created", async () => {
      const resp = await lgm.listGames();
      assert.deepEqual(resp.gameIds, []);
    });

    it("should list games", async () => {
      await lgm.createGame();
      await lgm.createGame();
      const resp = await lgm.listGames();
      assert.equal(resp.gameIds.length, 2);
    });
  });
});

describe("idempotency", () => {
  it("createGame is NOT idempotent", async () => {
    const firstResp = await lgm.createGame();
    const secondResp = await lgm.createGame();
    assert.notDeepEqual(firstResp, secondResp);
  });

  // joinGame should be idempotent for a given user, but this is currently not implemented, so
  // joinGame returns a new Player each time it is called.
  it("joinGame should currently not be idempotent", async () => {
    const game = await lgm.createGame();
    const firstResp = await lgm.joinGame(game.id);
    const secondResp = await lgm.joinGame(game.id);
    assert.notDeepEqual(firstResp, secondResp);
  });

  it("postOrders should complete and increment the turn with a single player", async () => {
    const game = await lgm.createGame();
    const joinResponse = await lgm.joinGame(game.id);

    const firstResp = await lgm.postOrders(
      { orders: [] },
      game.id,
      joinResponse.turn,
      joinResponse.playerId
    );

    const secondResp = await lgm.postOrders(
      { orders: [] },
      game.id,
      joinResponse.turn + 1, // next turn
      joinResponse.playerId
    );

    assert(firstResp.turnStatus.complete);
    assert(secondResp.turnStatus.complete);
  });

  // For postOrders: a single player means that each postOrders() call will end a turn
  // Add a second "dummy" player to stop the turn being complete for these tests/
  it("postOrders should fail on duplicate post for the same player and turn (empty orders)", async () => {
    const game = await lgm.createGame();
    const joinResponse = await lgm.joinGame(game.id);
    await lgm.joinGame(game.id); // create dummy player

    await lgm.postOrders(
      { orders: [] },
      game.id,
      joinResponse.turn,
      joinResponse.playerId
    );

    await lgm
      .postOrders(
        { orders: [] },
        game.id,
        joinResponse.turn,
        joinResponse.playerId
      )
      .then(() => {
        assert.fail("Expected assertion");
      })
      .catch((e) => {
        assert.equal(
          e.message,
          "storeOrders: turnOrders already exists for this game-turn-player"
        );
      });
  });

  it("postOrders should fail on duplicate post for the same player and turn (with identical requested orders)", async () => {
    const game = await lgm.createGame();
    const joinResponse = await lgm.joinGame(game.id);
    await lgm.joinGame(game.id);

    const orders = testMarchOrders(joinResponse.world.actors);

    await lgm.postOrders(
      { orders: orders },
      game.id,
      joinResponse.turn,
      joinResponse.playerId
    );
    lgm
      .postOrders(
        { orders: orders },
        game.id,
        joinResponse.turn,
        joinResponse.playerId
      )
      .then(() => {
        assert.fail("Expected assertion");
      })
      .catch((e) => {
        assert.equal(
          e.message,
          "storeOrders: turnOrders already exists for this game-turn-player"
        );
      });
  });

  it("postOrders should fail on duplicate post for the same player and turn (with different requested orders)", async () => {
    const game = await lgm.createGame();
    const joinResponse = await lgm.joinGame(game.id);
    await lgm.joinGame(game.id);

    const ordersOne = testMarchOrders(joinResponse.world.actors);
    const ordersTwo = testMarchOrders(
      joinResponse.world.actors,
      Direction.UP_LEFT
    );

    await lgm.postOrders(
      { orders: ordersOne },
      game.id,
      joinResponse.turn,
      joinResponse.playerId
    );
    await lgm
      .postOrders(
        { orders: ordersTwo },
        game.id,
        joinResponse.turn,
        joinResponse.playerId
      )
      .then(() => {
        assert.fail("Expected assertion");
      })
      .catch((e) => {
        assert.equal(
          e.message,
          "storeOrders: turnOrders already exists for this game-turn-player"
        );
      });
  });

  it("turnResults should be idempotent (no orders posted)", async () => {
    const game = await lgm.createGame();
    const joinResponse = await lgm.joinGame(game.id);

    const resultsOne = await lgm.turnResults(
      game.id,
      joinResponse.turn,
      joinResponse.playerId
    );
    const resultsTwo = await lgm.turnResults(
      game.id,
      joinResponse.turn,
      joinResponse.playerId
    );

    assert.deepEqual(resultsOne, resultsTwo);
  });

  it("turnResults should be idempotent (orders posted, turn not finished)", async () => {
    const game = await lgm.createGame();
    const joinResponse = await lgm.joinGame(game.id);
    await lgm.joinGame(game.id);

    const orders = testMarchOrders(joinResponse.world.actors);

    await lgm.postOrders(
      { orders: orders },
      game.id,
      joinResponse.turn,
      joinResponse.playerId
    );

    const resultsOne = await lgm.turnResults(
      game.id,
      joinResponse.turn,
      joinResponse.playerId
    );
    const resultsTwo = await lgm.turnResults(
      game.id,
      joinResponse.turn,
      joinResponse.playerId
    );

    assert.deepEqual(resultsOne, resultsTwo);
  });

  it("turnResults should be idempotent (turn complete)", async () => {
    const game = await lgm.createGame();
    const joinResponse = await lgm.joinGame(game.id);

    const ordersOne = testMarchOrders(joinResponse.world.actors);

    await lgm.postOrders(
      { orders: ordersOne },
      game.id,
      joinResponse.turn,
      joinResponse.playerId
    );

    const resultsOne = await lgm.turnResults(
      game.id,
      joinResponse.turn,
      joinResponse.playerId
    );
    const resultsTwo = await lgm.turnResults(
      game.id,
      joinResponse.turn,
      joinResponse.playerId
    );

    assert.deepEqual(resultsOne, resultsTwo);
  });
});

// generate some basic move orders for test purposes: move every actor by the given direction, or UP_RIGHT by default
function testMarchOrders(
  actors: Actor[],
  moveDir = Direction.UP_RIGHT
): lgm.RequestActorOrders[] {
  return actors.map((actor) => {
    return { actorId: actor.id, ordersList: [moveDir] };
  });
}
