import assert = require('assert');
import { joinGame, turnResults, postOrders } from './smoke';

describe('smoke tests', () => {
    it('join a game', async () => {
        const mockGameId = 1;
        const response = await joinGame(mockGameId);
        assert.equal(response.gameId, mockGameId);
        assert.equal(response.playerId, 2);
        assert.equal(response.turn, 1);
        assert(response.world != null);
        assert(response.world.terrain != null);
        assert(response.world.actors != null);
        assert.equal(response.world.id, 1);
    });

    it('get turn results', async () => {
        const mockGameId = 1;
        const mockPlayerId = 1;
        const mockTurn = 1;
        const response = await turnResults(mockGameId, mockTurn, mockPlayerId);
        assert.deepEqual(response, { message: "turn results not available", success: false });
    });

    it('post orders', async () => {
        const mockGameId = 1;
        const mockPlayerId = 1;
        const mockTurn = 1;
        const mockOrders = { orders: [] };
        const response = await postOrders(mockOrders, mockGameId, mockTurn, mockPlayerId);
        assert.equal(response.turnStatus.complete, false);
    });
});
