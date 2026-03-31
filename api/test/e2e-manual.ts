import superagent = require('superagent');
import assert = require('assert');
import util = require('util');
import { TurnOrders } from '../service/Models';
import { inspect } from 'util';

const BASE_URL = 'http://localhost:3000';

async function getAuthToken(): Promise<string> {
    const response = await superagent
        .post(`${BASE_URL}/users/login`)
        .send({ username: 'smoke_test_user', password: 'testpassword' });
    return response.body.token;
}

function createAGame(token: string) {
    return superagent.post(`${BASE_URL}/games`)
        .set('Authorization', `Bearer ${token}`)
        .send();
}

function joinAGame(gameId: number, token: string) {
    return superagent.put(`${BASE_URL}/games/${gameId}`)
        .set('Authorization', `Bearer ${token}`)
        .send();
}

function sendOrders(gameId: number, playerId: number, turn: number, orders: TurnOrders, token: string) {
    //    POST /games/{gameId}/turns/{turn}/players/{playerId}
    return superagent.post(util.format(`${BASE_URL}/games/%s/turns/%s/players/%s`, gameId, turn, playerId))
        .set('Authorization', `Bearer ${token}`)
        .send(orders);
}

function getTurnResults(gameId: number, playerId: number, turn: number, token: string) {
    // GET /games/{gameId}/turns/{turn}/players/{playerId}:
    return superagent.get(util.format(`${BASE_URL}/games/%s/turns/%s/players/%s`, gameId, turn, playerId))
        .set('Authorization', `Bearer ${token}`)
        .send();
}

process.env.RUN_E2E_TESTS &&
    describe('Smoke - API', () => {
        let gameId: number;
        let playerId: number;
        let authToken: string;

        before(async () => {
            authToken = await getAuthToken();
        });

        it('create a game', async () => {
            await createAGame(authToken);
        });

        it('create a new game and join it', async () => {
            const createResp = await createAGame(authToken);
            console.log(JSON.stringify(createResp.body, null, 4));

            gameId = createResp.body.id;
            const response = await joinAGame(gameId, authToken);
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
            sendOrders(gameId, playerId, 1, orders, authToken).then((response) => {
                console.log(JSON.stringify(response.body, null, 4));
                assert.equal(response.statusCode, 200);
                done();
            }).catch(done);
        });

        it('get results for first turn', (done) => {
            getTurnResults(gameId, playerId, 1, authToken).then((response) => {
                console.log(JSON.stringify(response.body, null, 4));
                assert.equal(response.statusCode, 200);
                console.log(inspect(response.body));
                done();
            }).catch(done);
        });
    });
