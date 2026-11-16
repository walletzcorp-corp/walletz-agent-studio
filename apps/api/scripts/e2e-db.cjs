#!/usr/bin/env node
/**
 * Recreates the throw-away E2E database from scratch and applies the FULL migration chain
 * (src/database/migrations + meta/_journal.json), exactly like a fresh install.
 *
 *   node scripts/e2e-db.cjs
 *
 * Environment:
 *   E2E_ADMIN_URL   superuser URL used to DROP/CREATE   (default postgresql://postgres@localhost:5433/postgres)
 *   E2E_DB_NAME     database to recreate                  (default walletz_e2e)
 *   E2E_DB_OWNER    role that owns it                     (default walletz)
 *   E2E_SKIP_CREATE=1  only migrate DATABASE_URL (CI: the empty database already exists)
 *
 * It refuses to touch any database whose name does not contain "e2e" or "test".
 */
const path = require('path');
const { Client } = require('pg');
const { drizzle } = require('drizzle-orm/node-postgres');
const { migrate } = require('drizzle-orm/node-postgres/migrator');

const dbName = process.env.E2E_DB_NAME || 'walletz_e2e';
const owner = process.env.E2E_DB_OWNER || 'walletz';
const adminUrl = process.env.E2E_ADMIN_URL || 'postgresql://postgres@localhost:5433/postgres';

function assertSafe(name) {
  if (!/(e2e|test)/i.test(name)) {
    throw new Error(`Refusing to operate on "${name}": only e2e/test databases may be recreated`);
  }
}

async function main() {
  let targetUrl;

  if (process.env.E2E_SKIP_CREATE === '1') {
    targetUrl = process.env.DATABASE_URL;
    if (!targetUrl) throw new Error('DATABASE_URL is required with E2E_SKIP_CREATE=1');
    assertSafe(new URL(targetUrl).pathname.slice(1));
  } else {
    assertSafe(dbName);
    const admin = new Client({ connectionString: adminUrl });
    await admin.connect();
    await admin.query(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
      [dbName],
    );
    await admin.query(`DROP DATABASE IF EXISTS "${dbName}"`);
    await admin.query(`CREATE DATABASE "${dbName}" OWNER "${owner}"`);
    await admin.end();

    const url = new URL(adminUrl);
    url.pathname = `/${dbName}`;
    const bootstrap = new Client({ connectionString: url.toString() });
    await bootstrap.connect();
    for (const ext of ['uuid-ossp', 'pgcrypto', 'pg_trgm', 'unaccent', 'vector']) {
      try {
        await bootstrap.query(`CREATE EXTENSION IF NOT EXISTS "${ext}"`);
      } catch (err) {
        console.warn(`extension ${ext} unavailable (${err.message.split('\n')[0]})`);
      }
    }
    await bootstrap.end();

    const owned = new URL(
      process.env.E2E_DATABASE_URL || `postgresql://${owner}@localhost:5433/${dbName}`,
    );
    owned.pathname = `/${dbName}`;
    targetUrl = owned.toString();
  }

  const client = new Client({ connectionString: targetUrl });
  await client.connect();
  const db = drizzle(client);
  await migrate(db, {
    migrationsFolder: path.join(__dirname, '..', 'src', 'database', 'migrations'),
  });
  const { rows } = await client.query(
    `SELECT count(*)::int AS tables FROM information_schema.tables WHERE table_schema = 'public'`,
  );
  await client.end();
  console.log(
    `E2E database ready: ${new URL(targetUrl).pathname.slice(1)} (${rows[0].tables} tables)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
