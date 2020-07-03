import lgm = require('../service/DefaultService');
import assert = require('assert');

describe("smoke - integration", () => {
    it("create a game", (done) => {
        lgm.createGame()
            .then((res) => {
                assert.deepEqual(res, {id: 0});
                done();
            })
            .catch(done);
    });

    it("create a second game", (done) => {
        lgm.createGame()
            .then((res) => {
                assert.deepEqual(res, {id: 1});
                done();
            })
            .catch(done);
    });

    it("join Game 0 (first player)", (done) => {
        lgm.joinGame(0)
            .then((res :lgm.JoinGameResponse) => {
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
            .then((res :lgm.JoinGameResponse) => {
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
            .then((res :lgm.JoinGameResponse) => {
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
            assert.deepEqual(res, {message: "turn results not available", success: false});
            done();
        }).catch((resp) => done(new Error(resp.message)));
    });

    it("get turn result for the wrong game/player (Player 1 is not in Game 1)", (done) => {
        lgm.turnResults(1, 1, 1)
        .then((res) => {
            assert.deepEqual(res, {message: "turn results not available", success: false});
            done();
        }).catch((resp) => done(new Error(resp.message)));
    });

    it("post orders for the wrong game/player (Player 1 is not in Game 1)", (done) => {
        lgm.postOrders({orders:[]}, 1, 1, 1)
        .then(() => {
            done(new Error("Expected postOrders to reject"));
        }).catch((resp) => {
            assert.deepEqual(resp, "postOrders: order validation failed");
            done();
        });
    });

    it("post orders for Player 1 in Game 0 (turn is not complete)", (done) => {
        const gameId = 0;
        const playerId = 1;
        const turn = 1;
        lgm.postOrders({orders: []}, gameId, turn, playerId)
        .then((res :lgm.PostOrdersResponse) => {
            assert.equal(res.turnStatus.complete, false);
            done();
        }).catch((resp) => done(new Error(resp.message)));
    });

    it("post orders for Player 2 in Game 1 (turn is complete)", (done) => {
        const gameId = 1;
        const playerId = 2;
        const turn = 1;
        lgm.postOrders({orders:[]}, gameId, turn, playerId)
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
            .then((result :lgm.TurnResultsResponse) => {
                console.log(result);
                assert.equal(result.success, true);
                assert.equal(result.results.gameId, gameId);
                assert.equal(result.results.playerId, playerId);
                assert.equal(result.results.turn, turn);
                    done();
            })
            .catch((err) => done(new Error(err.message)));
    });

});

describe("complete first two turns with one player", () => {
    let gameId;
    let playerId;
    before(async function() {
        let resp :lgm.CreateGameResponse = await lgm.createGame();
        gameId = resp.id;
        let invitation :lgm.JoinGameResponse = await lgm.joinGame(gameId);
        playerId = invitation.playerId;
    });

    it("post orders for first turn", async function() {
        let result = await lgm.postOrders({orders: []}, gameId, 1, playerId);

        const expected = {
            turnStatus: {
                complete: true,
                msg: "Turn complete",
                turn: 2
            }
        };
        assert.deepEqual(result, expected);
    });

    it("get turn result for first turn", async function() {
        let firstTurnResult = await lgm.turnResults(gameId, 1, playerId);

        const expected = {
            results: {
                gameId: gameId,
                id: 1,
                updatedActors: [],
                playerId: playerId,
                turn: 1
            },
            success: true
        };
        assert.deepEqual(firstTurnResult, expected);
    });

    it("post orders for second turn", async function() {
        const orderOne :lgm.RequestActorOrders = {
            actorId: 1001,
            ordersList: []
        };
        const ordersBody = {
            orders: [
                {
                    actorId: 1,
                    ordersList: [1, 1, 1]

                }
            ]
        };
        let ordersResponse = await lgm.postOrders(ordersBody, gameId, 2, playerId);
        const expected = {
            turnStatus: {
                complete: true,
                msg: "Turn complete",
                turn: 3
            }
        };
        assert.deepEqual(ordersResponse, expected);
    });

    it("get turn result for second turn", async function() {
        let secondTurnResult = await lgm.turnResults(gameId, 2, playerId);
        const expected = {
            results: {
                gameId: gameId,
                id: 2,
                updatedActors: [],
                playerId: playerId,
                turn: 2
            },
            success: true
        };
        assert.deepEqual(secondTurnResult, expected);
    });
});

describe("apply rules to orders", function() {
    it("", function() {});
});