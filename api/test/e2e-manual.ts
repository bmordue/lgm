import superagent = require('superagent');
import assert = require('assert');
import util = require('util');
import { TurnOrders } from '../service/Models';
import { inspect } from 'util';

const BASE_URL = 'http://localhost:3000';

const SMOKE_USER_EMAIL = 'smoke_test_user@example.com';

function createAGame(email: string) {
    return superagent.post(`${BASE_URL}/games`)
        .set('Remote-User', email)
        .send();
}

function joinAGame(gameId: number, email: string) {
    return superagent.put(`${BASE_URL}/games/${gameId}`)
        .set('Remote-User', email)
        .send();
}

function sendOrders(gameId: number, playerId: number, turn: number, orders: TurnOrders, email: string) {
    //    POST /games/{gameId}/turns/{turn}/players/{playerId}
    return superagent.post(util.format(`${BASE_URL}/games/%s/turns/%s/players/%s`, gameId, turn, playerId))
        .set('Remote-User', email)
        .send(orders);
}

function getTurnResults(gameId: number, playerId: number, turn: number, email: string) {
    // GET /games/{gameId}/turns/{turn}/players/{playerId}:
    return superagent.get(util.format(`${BASE_URL}/games/%s/turns/%s/players/%s`, gameId, turn, playerId))
        .set('Remote-User', email)
        .send();
}

process.env.RUN_E2E_TESTS &&
    describe('Smoke - API', () => {
        let gameId: number;
        let playerId: number;

        it('create a game', async () => {
            await createAGame(SMOKE_USER_EMAIL);
        });

        it('create a new game and join it', async () => {
            const createResp = await createAGame(SMOKE_USER_EMAIL);
            console.log(JSON.stringify(createResp.body, null, 4));

            gameId = createResp.body.id;
            const response = await joinAGame(gameId, SMOKE_USER_EMAIL);
            console.log(JSON.stringify(response.body, null, 4));

            assert.equal(response.statusCode, 200);
            assert.equal(response.body.gameId, gameId);

            playerId = response.body.playerId;
            assert(playerId != null);
            assert.equal(response.body.turn, 1);
        });

        it('send orders for first turn', (done) => {
            const orders = {
                gameId: gameId,
                turn: 0,
                playerId: playerId,
                orders: []
            };
            sendOrders(gameId, playerId, 1, orders, SMOKE_USER_EMAIL).then((response) => {
                console.log(JSON.stringify(response.body, null, 4));
                assert.equal(response.statusCode, 200);
                done();
            }).catch(done);
        });

        it('get results for first turn', (done) => {
            getTurnResults(gameId, playerId, 1, SMOKE_USER_EMAIL).then((response) => {
                console.log(JSON.stringify(response.body, null, 4));
                assert.equal(response.statusCode, 200);
                console.log(inspect(response.body));
                done();
            }).catch(done);
        });
    });
