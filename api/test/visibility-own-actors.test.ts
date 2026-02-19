import lgm = require('../service/GameService');
import assert = require('assert');

describe('visibility - own actors present', () => {
    before(() => {
        // store is cleaned by other tests, but ensure a clean state if needed
    });

    it('joinGame should include the joining player\'s actors in returned world', async () => {
        const resp = await lgm.createGame();
        const gameId = resp.gameId;
        const invitation = await lgm.joinGame(gameId);
        const playerId = invitation.playerId;

        assert(invitation.world != null, 'world must be present');
        assert(Array.isArray(invitation.world.actors), 'world.actors must be an array');
        const myActors = invitation.world.actors.filter((a: any) => a.owner === playerId);
        assert(myActors.length > 0, 'Joining player should see at least one actor in the join response');
    });
});
