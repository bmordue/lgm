const lgm = require('../service/DefaultService.js');
const assert = require('assert');

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
            .then((res) => {
                assert.deepEqual(res, {gameId: 0, playerId: 0, turn: 1});
                done();
            }).catch(done);
    });

    it("join Game 0 (second player)", (done) => {
        lgm.joinGame(0)
            .then((res) => {
                assert.deepEqual(res, {gameId: 0, playerId: 1, turn: 1});
                done();
            }).catch(done);
    });

    it("join Game 1 (first player)", (done) => {
        lgm.joinGame(1)
            .then((res) => {
                assert.deepEqual(res, {gameId: 1, playerId: 2, turn: 1});
                done();
            }).catch(done);
    });

    it("get Player 1 turn result for newly created game (Game 0)", (done) => {
        lgm.turnResults(0, 1, 1)
        .then((res) => {
            assert.deepEqual(res, {message: "turn results not available", success: false});
            done();
        }).catch(done);
    });

    it("get turn result for the wrong game/player (Player 1 is not in Game 1)", (done) => {
        lgm.turnResults(1, 1, 1)
        .then((res) => {
            assert.deepEqual(res, {message: "turn results not available", success: false});
            done();
        }).catch(done);
    });

    it("post orders for the wrong game/player (Player 1 is not in Game 1)", (done) => {
        lgm.postOrders({}, 1, 1, 1)
        .then((res) => {
            assert.deepEqual(res, {message: "turn results not available", success: false});
            done();
        }).catch(done);
    });

    it("post turn result for Player 1 in Game 0 (turn is not complete)", (done) => {
        const gameId = 0;
        const playerId = 1;
        const turn = 1;
        lgm.postOrders({}, gameId, turn, playerId)
        .then((res) => {
            assert.equal(res.orders.gameId, gameId);
            assert.equal(res.orders.playerId, playerId);
            assert.equal(res.orders.turn, turn);
            assert.equal(res.turnStatus.complete, false);
            assert(res.orders.ordersId != null);
            done();
        }).catch(done);
    });

    it("post turn result for Player 2 in Game 1 (turn is complete)", (done) => {
        const gameId = 1;
        const playerId = 2;
        const turn = 1;
        lgm.postOrders({}, gameId, turn, playerId)
        .then((res) => {
            console.log(res);
            assert.equal(res.orders.gameId, gameId);
            assert.equal(res.orders.playerId, playerId);
            assert.equal(res.orders.turn, turn);
            assert.equal(res.turnStatus.complete, true);
            done();
        }).catch(done);
    });

});