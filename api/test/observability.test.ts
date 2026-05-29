import assert = require('assert');
import superagent = require('superagent');
import { AddressInfo } from 'net';
import * as http from 'http';
import { createServer } from '../index';

describe('observability endpoints', () => {
  let server: http.Server;
  let baseUrl: string;

  before(async () => {
    server = await createServer();
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('returns health status', async () => {
    const response = await superagent.get(`${baseUrl}/health`);
    assert.equal(response.status, 200);
    assert.equal(response.body.status, 'healthy');
    assert.equal(typeof response.body.timestamp, 'string');
    assert.equal(typeof response.body.uptimeSeconds, 'number');
    assert.equal(typeof response.body.version, 'string');
  });

  it('exposes baseline API metrics', async () => {
    const baseline = (await superagent.get(`${baseUrl}/metrics`)).body;

    await superagent.get(`${baseUrl}/health`);
    await superagent.get(`${baseUrl}/test-404`).ok(() => true);

    const after = (await superagent.get(`${baseUrl}/metrics`)).body;
    assert.equal(after.requests.byPath['/health'], (baseline.requests.byPath['/health'] || 0) + 1);
    assert.equal(after.requests.byPath['/test-404'], (baseline.requests.byPath['/test-404'] || 0) + 1);
    assert(after.requests.total >= baseline.requests.total + 2);
    assert(after.responses.byStatus['200'] >= (baseline.responses.byStatus['200'] || 0) + 1);
    assert.equal(after.responses.byStatus['404'], (baseline.responses.byStatus['404'] || 0) + 1);
    assert.equal(typeof after.responses.averageResponseTimeMs, 'number');
    assert.equal(typeof after.uptimeSeconds, 'number');
  });
});
