import superagent = require('superagent');
import assert = require('assert');
import util = require('util');
import { TurnOrders } from '../service/Models';
import { CreateGameResponse, JoinGameResponse } from '../service/DefaultService';

// const TEST_AUTH_TOKEN = 'dummy auth';

function createAGame() {
    console.log('createAGame');
    return superagent.post('http://localhost:3000/games')
        .send();
}

function joinAGame(gameId: number) {
    console.log('joinAGame');
    return superagent.put('http://localhost:3000/games/' + gameId)
        .send();
}

function sendOrders(gameId: number, playerId: number, turn: number, orders: TurnOrders) {
    //    /games/{gameId}/turns/{turn}/players/{playerId}
    console.log('sendOrders');
    return superagent.post(util.format('http://localhost:3000/games/%s/turns/%s/players/%s', gameId, turn, playerId))
        .send(orders);
}

describe('Smoke - API', () => {
    let gameId: number;
    let playerId: number;

    it('create a game', (done) => {
        createAGame()
            .then(() => {
                done();
            })
            .catch((err: Error) => {
                console.log(err);
                done(err);
            });
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

            .catch((err) => {
                // console.log(err);
                done(err);
            });
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
});
