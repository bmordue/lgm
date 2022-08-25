import superagent = require('superagent');
import assert = require('assert');
import util = require('util');
import { TurnOrders } from '../service/Models';
import { CreateGameResponse, JoinGameResponse } from '../service/DefaultService';
import { inspect } from 'util';

// const TEST_AUTH_TOKEN = 'dummy auth';

function createAGame() {
    return superagent.post('http://localhost:3000/games')
        .send();
}

function joinAGame(gameId: number) {
    return superagent.put('http://localhost:3000/games/' + gameId)
        .send();
}

function sendOrders(gameId: number, playerId: number, turn: number, orders: TurnOrders) {
    //    POST /games/{gameId}/turns/{turn}/players/{playerId}
    return superagent.post(util.format('http://localhost:3000/games/%s/turns/%s/players/%s', gameId, turn, playerId))
        .send(orders);
}

function getTurnResults(gameId: number, playerId: number, turn: number) {
    // GET /games/{gameId}/turns/{turn}/players/{playerId}:

    return superagent.get(util.format('http://localhost:3000/games/%s/turns/%s/players/%s', gameId, turn, playerId))
        .send();
}

describe('Smoke - API', () => {
    let gameId: number;
    let playerId: number;

    it('create a game', (done) => {
        createAGame()
            .then(() => {
                done();
            })
            .catch(done);
    });

    it('create a new game and join it', (done) => {
        createAGame()
            .then((resp) => {
                gameId = resp.body.id;
                return joinAGame(gameId);
            })
            .then((response: { statusCode: number; body: JoinGameResponse; }) => {
                assert.equal(response.statusCode, 200);
                assert.equal(response.body.gameId, gameId);
                playerId = response.body.playerId;
                assert(playerId != null);
                assert.equal(response.body.turn, 1);
                done();
            })
            .catch(done);
    });

    it('send orders for first turn', (done) => {
        const orders = {
            gameId: gameId,
            turn: 0,
            playerId: playerId,
            orders: []
        };
        sendOrders(gameId, playerId, 1, orders).then((response: { statusCode: unknown; }) => {
            //console.log(util.format("%j", response.body));
            assert.equal(response.statusCode, 200);
            done();
        }).catch(done);
    });

    it('get results for first turn', (done) => {
        getTurnResults(gameId, playerId, 1).then((response) => {
            assert.equal(response.statusCode, 200);
            console.log(inspect(response.body));
            done();
        }).catch(done);
    });
});
