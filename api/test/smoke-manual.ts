import lgm = require('../service/GameService');
import assert = require('assert');
import { Actor, Direction, World } from '../service/Models';
import { TIMESTEP_MAX } from '../service/Rules';
import { readFileSync } from 'fs';
import * as store from '../service/Store';

describe("smoke - integration", () => {
    before(() => {
        store.deleteAll();
    });

    it("create a game", (done) => {
        lgm.createGame()
            .then((res) => {
                assert.deepEqual(res, { id: 0 });
                done();
            })
            .catch(done);
    });

    it("create a second game", (done) => {
        lgm.createGame()
            .then((res) => {
                assert.deepEqual(res, { id: 1 });
                done();
            })
            .catch(done);
    });

    it("join Game 0 (first player)", (done) => {
        lgm.joinGame(0)
            .then((res: lgm.JoinGameResponse) => {
                assert.equal(res.gameId, 0);
                assert.equal(res.playerId, 0);
                assert.equal(res.turn, 1);
                assert(res.world != null);
                assert.equal(res.world.id, 0);
                assert(res.world.terrain != null);
                assert(res.world.actors != null);
                done();
            }).catch(done);
    });

    it("join Game 0 (second player) 111", (done) => {
        lgm.joinGame(0)
            .then((res: lgm.JoinGameResponse) => {
                assert.equal(res.gameId, 0);
                assert.equal(res.playerId, 1);
                assert.equal(res.turn, 1);
                assert(res.world != null);
                assert.equal(res.world.id, 0);
                assert(res.world.terrain != null);
                assert(res.world.actors != null);
                done();
            }).catch(done);
    });

    it("join Game 1 (first player)", (done) => {
        lgm.joinGame(1)
            .then((res: lgm.JoinGameResponse) => {
                assert.equal(res.gameId, 1);
                assert.equal(res.playerId, 2);
                assert.equal(res.turn, 1);
                assert(res.world != null);
                assert(res.world.terrain != null);
                assert(res.world.actors != null);
                assert.equal(res.world.id, 1);
                done();
            }).catch(done);
    });

    it("get Player 1 turn result for newly created game (Game 0)", (done) => {
        lgm.turnResults(0, 1, 1)
            .then((res) => {
                assert.deepEqual(res, { message: "turn results not available", success: false });
                done();
            }).catch((resp) => done(new Error(resp.message)));
    });

    it("get turn result for the wrong game/player (Player 1 is not in Game 1)", (done) => {
        lgm.turnResults(1, 1, 1)
            .then((res) => {
                assert.deepEqual(res, { message: "turn results not available", success: false });
                done();
            }).catch((resp) => done(new Error(resp.message)));
    });

    it("post orders for the wrong game/player (Player 1 is not in Game 1)", async () => {
        try {
            await lgm.postOrders({ orders: [] }, 1, 1, 1);
            throw new Error("Expected postOrders to reject");
        } catch (e) {
            assert.deepEqual(e.message, "playerId is not in game.players array");
        }
    });

    it("post orders for Player 1 in Game 0 (turn is not complete)", (done) => {
        const gameId = 0;
        const playerId = 1;
        const turn = 1;
        lgm.postOrders({ orders: [] }, gameId, turn, playerId)
            .then((res: lgm.PostOrdersResponse) => {
                assert.equal(res.turnStatus.complete, false);
                done();
            }).catch((resp) => done(new Error(resp.message)));
    });

    it("post orders for Player 2 in Game 1 (turn is complete)", (done) => {
        const gameId = 1;
        const playerId = 2;
        const turn = 1;
        lgm.postOrders({ orders: [] }, gameId, turn, playerId)
            .then((res) => {
                assert.equal(res.turnStatus.complete, true);
                done();
            }).catch((resp) => done(new Error(resp.message)));
    });

    it("get turn result for incomplete turn", (done) => {
        const gameId = 0;
        const playerId = 1;
        const turn = 1;
        lgm.turnResults(gameId, turn, playerId)
            .then((result) => {
                assert.deepEqual(result, { success: false, message: "turn results not available" });
                done();
            })
            .catch((err) => done(new Error(err.message)));
    });

    it("get turn orders for complete turn", (done) => {
        const gameId = 1;
        const playerId = 2;
        const turn = 1;
        lgm.turnResults(gameId, turn, playerId)
            .then((result: lgm.TurnResultsResponse) => {
                assert.equal(result.success, true);
                // With fog of war, we expect a world object instead of results
                assert(result.world != null, "world should be present");
                assert(result.world.terrain != null, "terrain should be present");
                assert(result.world.actors != null, "actors should be present");
                done();
            })
            .catch((err) => done(new Error(err.message)));
    });

});

describe("complete first two turns with one player - empty orders", () => {
    let gameId;
    let playerId;
    before(async function () {
        const resp: lgm.CreateGameResponse = await lgm.createGame();
        gameId = resp.gameId;
        const invitation: lgm.JoinGameResponse = await lgm.joinGame(gameId);
        playerId = invitation.playerId;
    });

    it("post orders for first turn", async function () {
        const result = await lgm.postOrders({ orders: [] }, gameId, 1, playerId);

        const expected = {
            turnStatus: {
                complete: true,
                msg: "Turn complete",
                turn: 2
            }
        };
        assert.deepEqual(result, expected);
    });

    it("get turn result for first turn", async function () {
        const firstTurnResult = await lgm.turnResults(gameId, 1, playerId);

        // With fog of war, we expect a world object instead of results
        assert.equal(firstTurnResult.success, true);
        assert(firstTurnResult.world != null, "world should be present");
        assert(firstTurnResult.world.terrain != null, "terrain should be present");
        assert(firstTurnResult.world.actors != null, "actors should be present");
        assert(Array.isArray(firstTurnResult.world.actors), "actors should be an array");
    });

    it("post orders for second turn", async function () {
        const ordersBody = {
            orders: [
                {
                    actorId: 1,
                    ordersList: [1, 1, 1]

                }
            ]
        };
        const ordersResponse = await lgm.postOrders(ordersBody, gameId, 2, playerId);
        const expected = {
            turnStatus: {
                complete: true,
                msg: "Turn complete",
                turn: 3
            }
        };
        assert.deepEqual(ordersResponse.turnStatus, expected.turnStatus);
    });

    it("get turn result for second turn", async function () {
        const secondTurnResult = await lgm.turnResults(gameId, 2, playerId);
        
        // With fog of war, we expect a world object instead of results
        assert.equal(secondTurnResult.success, true);
        assert(secondTurnResult.world != null, "world should be present");
        assert(secondTurnResult.world.terrain != null, "terrain should be present");
        assert(secondTurnResult.world.actors != null, "actors should be present");
        assert(Array.isArray(secondTurnResult.world.actors), "actors should be an array");
    });
});

describe("complete first turn with one player - standing still orders", () => {
    let gameId;
    let playerId;
    let world: World;
    let myActors: Array<Actor>;

    before(async function () {
        const resp: lgm.CreateGameResponse = await lgm.createGame();
        gameId = resp.gameId;
        const invitation: lgm.JoinGameResponse = await lgm.joinGame(gameId);
        playerId = invitation.playerId;
        world = invitation.world;
        myActors = world.actors.filter((a) => a.owner === playerId);
    });

    it("post orders for first turn", async function () {
        // assign orders to stay in one spot ...
        const actorOrders = [];

        const standStillOrders = new Array(TIMESTEP_MAX).fill(Direction.NONE);

        myActors.forEach((a) => {
            actorOrders.push({ actorId: a.id, ordersList: standStillOrders });
        });
        const result = await lgm.postOrders({ orders: actorOrders }, gameId, 1, playerId);

        const expected = {
            turnStatus: {
                complete: true,
                msg: "Turn complete",
                turn: 2
            }
        };
        assert.deepEqual(result.turnStatus, expected.turnStatus);
    });

    it("get turn result for first turn", async function () {
        const firstTurnResult = await lgm.turnResults(gameId, 1, playerId);

        // With fog of war, we expect a world object instead of results
        assert.equal(firstTurnResult.success, true);
        assert(firstTurnResult.world != null, "world should be present");
        assert(firstTurnResult.world.terrain != null, "terrain should be present");
        assert(firstTurnResult.world.actors != null, "actors should be present");
        
        // Since actors were told to stand still, verify they haven't moved
        const playerActors = firstTurnResult.world.actors.filter(a => a.owner === playerId);
        assert.equal(playerActors.length, myActors.length, "Should have same number of actors");
        
        // Verify all actors are still at their original positions (stand still orders)
        playerActors.forEach(actor => {
            const originalActor = myActors.find(a => a.id === actor.id);
            assert(originalActor != null, `Should find original actor with id ${actor.id}`);
            assert.deepEqual(actor.pos, originalActor.pos, `Actor ${actor.id} should be at original position`);
        });
    });
});

describe("complete first turn with one player - moving forward orders", () => {
    let gameId;
    let playerId;
    let world: World;
    let myActors: Array<Actor>;

    before(async function () {
        const resp: lgm.CreateGameResponse = await lgm.createGame();
        gameId = resp.gameId;
        const invitation: lgm.JoinGameResponse = await lgm.joinGame(gameId);
        playerId = invitation.playerId;
        world = invitation.world;
        myActors = world.actors.filter((a) => a.owner === playerId);
    });

    it("post orders for first turn", async function () {
        // assign orders to stay in one spot ...
        const actorOrders = [];

        const standStillOrders = new Array(TIMESTEP_MAX).fill(Direction.UP_LEFT);

        myActors.forEach((a) => {
            actorOrders.push({ actorId: a.id, ordersList: standStillOrders });
        });
        const result = await lgm.postOrders({ orders: actorOrders }, gameId, 1, playerId);

        const expected = {
            turnStatus: {
                complete: true,
                msg: "Turn complete",
                turn: 2
            }
        };
        assert.deepEqual(result.turnStatus, expected.turnStatus);
    });

    it("get turn result for first turn", async function () {
        const firstTurnResult = await lgm.turnResults(gameId, 1, playerId);

        // With fog of war, we expect a world object instead of results
        assert.equal(firstTurnResult.success, true);
        assert(firstTurnResult.world != null, "world should be present");
        assert(firstTurnResult.world.terrain != null, "terrain should be present");
        assert(firstTurnResult.world.actors != null, "actors should be present");
        
        // Check that we have the expected number of actors (9 for the player)
        const playerActors = firstTurnResult.world.actors.filter(a => a.owner === playerId);
        assert.equal(playerActors.length, 9, "Should have 9 player actors");
        
        // Verify all actors have the expected properties
        playerActors.forEach(actor => {
            assert(actor.id != null, "Actor should have an id");
            assert(actor.pos != null, "Actor should have a position");
            assert(actor.health != null, "Actor should have health");
            assert(actor.state != null, "Actor should have a state");
            assert(actor.weapon != null, "Actor should have a weapon");
        });
    });
});

