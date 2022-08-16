import superagent = require('superagent');
import assert = require('assert');
import util = require('util');

const TEST_AUTH_TOKEN = 'dummy auth';

function createAGame() {
    return superagent.post('http://localhost:8080/games')
        .set('Authorization', TEST_AUTH_TOKEN)
        .set('Content-Type', 'application/json')
        .send();
}

function joinAGame(gameId) {
    return superagent.put('http://localhost:8080/games/' + gameId)
        .set('Authorization', TEST_AUTH_TOKEN)
        .set('Content-Type', 'application/json')
        .send();
}

function sendOrders(gameId, playerId, turn, orders) {
//    /games/{gameId}/turns/{turn}/players/{playerId}
    return superagent.post(util.format('http://localhost:8080/games/%s/turns/%s/players/%s', gameId, turn, playerId))
        .set('Authorization', TEST_AUTH_TOKEN)
        .set('Content-Type', 'application/json')
        .send(orders);
}

describe('Smoke - API', () => {
    let gameId;
    let playerId;
    it.skip('create a new game and join it', (done) => {
        createAGame()
            .then((resp) => {
                gameId = resp.body.id;
                return joinAGame(gameId);
            })
            .then((response) => {
                assert.equal(response.statusCode, 200);
                assert.equal(response.body.gameId, gameId);
                playerId = response.body.playerId;
                assert(playerId != null);
                assert.equal(response.body.turn, 1);
                done();
            })
            .catch(done);
    });

    it.skip('send orders for first turn', (done) => {
        const orders = {};
        sendOrders(gameId, playerId, 1, orders).then((response) => {
            //console.log(util.format("%j", response.body));
            assert.equal(response.statusCode, 200);
            done();
        }).catch(done);
    });
});
