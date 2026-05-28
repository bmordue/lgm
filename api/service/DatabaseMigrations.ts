'use strict';

import fs = require('fs');
import path = require('path');

const MIGRATION_CANDIDATE_PATHS = [
  path.resolve(__dirname, '../database/migration.sql'),
  path.resolve(__dirname, '../../database/migration.sql')
];

export function resolveMigrationPath(customMigrationPath?: string): string {
  if (customMigrationPath) {
    return customMigrationPath;
  }

  const migrationPath = MIGRATION_CANDIDATE_PATHS.find((candidatePath) => fs.existsSync(candidatePath));
  if (!migrationPath) {
    throw new Error('Unable to locate database migration.sql');
  }
  return migrationPath;
}

export async function runDatabaseMigrations(
  client: { query: (sql: string) => Promise<unknown> },
  customMigrationPath?: string
): Promise<void> {
  const migrationPath = resolveMigrationPath(customMigrationPath);
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
  await client.query(migrationSQL);
}
