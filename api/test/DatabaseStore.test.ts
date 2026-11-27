import assert = require('assert');
import { isDatabaseConfigured, closeStore, create, deleteAll } from '../service/DatabaseStore';
import { keys } from '../service/StoreInterface';

describe('DatabaseStore', () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;

  afterEach(() => {
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }
  });

  it('reports database as unconfigured when DATABASE_URL is missing', () => {
    delete process.env.DATABASE_URL;
    assert.strictEqual(isDatabaseConfigured(), false);
  });

  it('reports database as configured when DATABASE_URL is set', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/lgm';
    assert.strictEqual(isDatabaseConfigured(), true);
  });

  it('closeStore is safe to call before any store is created', async () => {
    delete process.env.DATABASE_URL;
    await closeStore();
    assert.strictEqual(isDatabaseConfigured(), false);
  });

  it('recreates the store after closeStore when using the memory fallback', async () => {
    delete process.env.DATABASE_URL;
    await deleteAll();
    await create(keys.games, { turn: 0, worldId: 1 } as any);
    await closeStore();
    // After closing, the store should lazily recreate and still work.
    const recreatedId = await create(keys.games, { turn: 0, worldId: 1 } as any);
    assert.strictEqual(typeof recreatedId, 'number');
  });
});