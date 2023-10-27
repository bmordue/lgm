import assert = require('assert');
import * as GameService from '../service/GameService';

describe('createGame', () => {
    it('should create a game successfully', async () => {
        const response = await GameService.createGame();
        assert(response.id);
    });
});

describe('joinGame', () => {
    it('should join a game successfully', async () => {
        const gameId = 1; // Replace with a valid game ID
        const response = await GameService.joinGame(gameId);
        assert.equal(response.gameId, gameId);
        assert(response.playerId);
        assert.equal(response.turn, 1);
    });

    it('should fail to join a non-existent game', async () => {
        const gameId = 9999; // Non-existent game ID
        try {
            await GameService.joinGame(gameId);
            assert.fail('Expected joinGame to throw');
        } catch (e) {
            assert.equal(e.message, 'Game does not exist');
        }
    });
});

describe('postOrders', () => {
    it('should post orders successfully', async () => {
        const gameId = 1; // Replace with a valid game ID
        const playerId = 1; // Replace with a valid player ID
        const turn = 1;
        const orders = {
            gameId: gameId,
            turn: turn,
            playerId: playerId,
            orders: []
        };
        const response = await GameService.postOrders(orders, gameId, turn, playerId);
        assert.equal(response.turnStatus.complete, true);
    });

    it('should fail to post orders for a non-existent game', async () => {
        const gameId = 9999; // Non-existent game ID
        const playerId = 1; // Replace with a valid player ID
        const turn = 1;
        const orders = {
            gameId: gameId,
            turn: turn,
            playerId: playerId,
            orders: []
        };
        try {
            await GameService.postOrders(orders, gameId, turn, playerId);
            assert.fail('Expected postOrders to throw');
        } catch (e) {
            assert.equal(e.message, 'Game does not exist');
        }
    });
});

describe('turnResults', () => {
    it('should get turn results successfully', async () => {
        const gameId = 1; // Replace with a valid game ID
        const playerId = 1; // Replace with a valid player ID
        const turn = 1;
        const response = await GameService.turnResults(gameId, turn, playerId);
        assert.equal(response.success, true);
    });

    it('should fail to get turn results for a non-existent game', async () => {
        const gameId = 9999; // Non-existent game ID
        const playerId = 1; // Replace with a valid player ID
        const turn = 1;
        try {
            await GameService.turnResults(gameId, turn, playerId);
            assert.fail('Expected turnResults to throw');
        } catch (e) {
            assert.equal(e.message, 'Game does not exist');
        }
    });
});
