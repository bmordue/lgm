import lgm = require('../service/GameService');
import assert = require('assert');
import { inspect } from 'util';

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
            const myActors = allActors.filter((a) => { return a.owner === playerOneId });
            assert.equal(allActors.length, 9);
            assert.equal(myActors.length, 9);
        });

        it("second player should be assigned Actors when joining game", async () => {
            const joinGameResponse = await lgm.joinGame(gameId);
            const playerTwoId = joinGameResponse.playerId;
            const allActors = joinGameResponse.world.actors;
            const myActors = allActors.filter((a) => { return a.owner === playerTwoId });
            assert.equal(allActors.length, 18);
            assert.equal(myActors.length, 9);
        });

        it("joining a second time creates a new player", async () => {
            const firstResp = await lgm.joinGame(gameId);
            const secondResp = await lgm.joinGame(gameId);
            assert.equal(firstResp.gameId, secondResp.gameId);
            assert.notEqual(firstResp.playerId, secondResp.playerId);
        });
    });
});