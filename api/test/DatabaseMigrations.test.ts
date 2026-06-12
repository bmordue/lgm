import assert = require('assert');
import fs = require('fs');
import os = require('os');
import path = require('path');
import { resolveMigrationPath, runDatabaseMigrations } from '../service/DatabaseMigrations';

describe('DatabaseMigrations', () => {
  it('resolves the default migration file path', () => {
    const migrationPath = resolveMigrationPath();
    assert.strictEqual(path.basename(migrationPath), 'migration.sql');
    assert.strictEqual(fs.existsSync(migrationPath), true);
  });

  it('runs migration SQL from a provided path', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lgm-migration-test-'));
    const migrationPath = path.join(tmpDir, 'migration.sql');
    fs.writeFileSync(migrationPath, 'SELECT 1;');

    const executedQueries: string[] = [];
    const fakeClient = {
      query: async (sql: string) => {
        executedQueries.push(sql);
      }
    };

    await runDatabaseMigrations(fakeClient, migrationPath);
    assert.deepStrictEqual(executedQueries, ['SELECT 1;']);
  });
});
