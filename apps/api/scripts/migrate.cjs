#!/usr/bin/env node
/**
 * Applies the versioned migrations (src/database/migrations + meta/_journal.json) to DATABASE_URL.
 *
 *   node scripts/migrate.cjs            apply pending migrations
 *   node scripts/migrate.cjs --dry-run  validate the journal and execute the WHOLE chain inside a
 *                                       transaction that is rolled back (nothing is persisted)
 *
 * DATABASE_URL is required (no silent fallback to a developer database).
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { drizzle } = require('drizzle-orm/node-postgres');
const { migrate } = require('drizzle-orm/node-postgres/migrator');

const dryRun = process.argv.includes('--dry-run');
const folder = path.join(__dirname, '..', 'src', 'database', 'migrations');

function loadEnvLocal() {
  const file = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].trim();
  }
}

function readJournal() {
  const journal = JSON.parse(fs.readFileSync(path.join(folder, 'meta', '_journal.json'), 'utf8'));
  const tags = journal.entries.map((e) => e.tag);
  const files = fs
    .readdirSync(folder)
    .filter((f) => f.endsWith('.sql'))
    .map((f) => f.replace(/\.sql$/, ''));
  const missing = tags.filter((t) => !files.includes(t));
  const orphan = files.filter((f) => !tags.includes(f));
  if (missing.length || orphan.length) {
    throw new Error(
      `Migration journal out of sync. Missing files: [${missing}] Not in journal: [${orphan}]`,
    );
  }
  return tags;
}

async function ensureExtensions(client) {
  for (const ext of ['uuid-ossp', 'pgcrypto', 'pg_trgm', 'unaccent', 'vector']) {
    // SAVEPOINT keeps a missing optional extension from aborting an enclosing transaction.
    await client.query('SAVEPOINT ext');
    try {
      await client.query(`CREATE EXTENSION IF NOT EXISTS "${ext}"`);
      await client.query('RELEASE SAVEPOINT ext');
    } catch (err) {
      await client.query('ROLLBACK TO SAVEPOINT ext');
      console.warn(`extension ${ext} unavailable (${String(err.message).split('\n')[0]})`);
    }
  }
}

async function main() {
  loadEnvLocal();
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');

  const tags = readJournal();
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    if (dryRun) {
      await client.query('BEGIN');
      try {
        await ensureExtensions(client);
        for (const tag of tags) {
          const sqlText = fs.readFileSync(path.join(folder, `${tag}.sql`), 'utf8');
          for (const statement of sqlText.split('--> statement-breakpoint')) {
            if (statement.trim()) await client.query(statement);
          }
          console.log(`dry-run ok: ${tag}`);
        }
      } finally {
        await client.query('ROLLBACK');
      }
      console.log(`Dry run complete: ${tags.length} migrations validated, nothing persisted.`);
      return;
    }
    await client.query('BEGIN');
    await ensureExtensions(client);
    await client.query('COMMIT');
    await migrate(drizzle(client), { migrationsFolder: folder });
    console.log(`Migrations applied (${tags.length} in journal).`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
