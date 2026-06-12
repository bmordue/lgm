import assert = require('assert');
import http = require('http');
import superagent = require('superagent');

describe('API security middleware', function () {
  let server: http.Server;
  let baseUrl: string;

  async function startTestServer() {
    const { createServer } = require('../index');
    server = await createServer();
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Expected server to listen on a TCP port');
    }
    baseUrl = `http://127.0.0.1:${address.port}`;
  }

  async function restartServer() {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => err ? reject(err) : resolve());
      });
    }
    await startTestServer();
  }

  beforeEach(async function () {
    process.env.NODE_ENV = 'test';
    delete process.env.LGM_RATE_LIMIT_MAX_REQUESTS;
    delete process.env.LGM_RATE_LIMIT_WINDOW_MS;
    await startTestServer();
  });

  afterEach(async function () {
    delete process.env.LGM_RATE_LIMIT_MAX_REQUESTS;
    delete process.env.LGM_RATE_LIMIT_WINDOW_MS;

    if (!server) {
      return;
    }
    await new Promise<void>((resolve, reject) => {
      server.close((err) => err ? reject(err) : resolve());
    });
  });

  it('sets baseline security headers', async function () {
    const response = await superagent.get(`${baseUrl}/users/me`);

    assert.equal(response.headers['x-frame-options'], 'SAMEORIGIN');
    assert.equal(response.headers['x-content-type-options'], 'nosniff');
    assert.equal(response.headers['referrer-policy'], 'strict-origin-when-cross-origin');
    assert.equal(response.headers['x-powered-by'], undefined);
  });

  it('rejects request bodies with forbidden object keys', async function () {
    try {
      await superagent
        .post(`${baseUrl}/games`)
        .set('Remote-User', 'security@example.com')
        .set('Content-Type', 'application/json')
        .send('{"maxPlayers":4,"__proto__":{"polluted":true}}');
      assert.fail('Expected request to be rejected');
    } catch (err: any) {
      assert.equal(err.status, 400);
      assert.match(err.response.body.message, /forbidden property/i);
    }
  });

  it('rejects invalid request bodies through OpenAPI validation', async function () {
    try {
      await superagent
        .post(`${baseUrl}/games`)
        .set('Remote-User', 'security@example.com')
        .send({ maxPlayers: 99 });
      assert.fail('Expected request to be rejected');
    } catch (err: any) {
      assert.equal(err.status, 400);
    }
  });

  it('enforces request rate limiting', async function () {
    process.env.LGM_RATE_LIMIT_MAX_REQUESTS = '1';
    process.env.LGM_RATE_LIMIT_WINDOW_MS = '60000';
    await restartServer();

    await superagent.get(`${baseUrl}/users/me`);

    try {
      await superagent.get(`${baseUrl}/users/me`);
      assert.fail('Expected request to be rate limited');
    } catch (err: any) {
      assert.equal(err.status, 429);
      assert.equal(err.response.body.message, 'Too many requests, please try again later.');
    }
  });
});
