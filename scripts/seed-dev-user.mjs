#!/usr/bin/env node
/**
 * Walletz — Dev Seed Script
 *
 * Creates a test tenant + owner user for local development.
 * Run once after migrations:
 *   node scripts/seed-dev-user.mjs
 *
 * Credentials written to: apps/api/.dev-credentials.txt
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomBytes } from 'crypto';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pg = require('../apps/api/node_modules/pg');
const bcrypt = require('../apps/api/node_modules/bcryptjs');

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');

// ─── Load .env.local ────────────────────────────────────────────────────────

function loadEnv(path) {
  try {
    const lines = readFileSync(path, 'utf8').split('\n');
    const env = {};
    for (const line of lines) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const idx = t.indexOf('=');
      if (idx === -1) continue;
      env[t.slice(0, idx)] = t.slice(idx + 1);
    }
    return env;
  } catch { return {}; }
}

const env = loadEnv(join(ROOT, 'apps', 'api', '.env.local'));
const DATABASE_URL = env['DATABASE_URL'] ?? process.env['DATABASE_URL'];

if (!DATABASE_URL) {
  console.error('❌  DATABASE_URL not found in apps/api/.env.local');
  process.exit(1);
}

// ─── ID generator (same logic as apps/api/src/database/utils/id.ts) ─────────

function createId() {
  // UUID v4 via crypto
  const bytes = randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-');
}

// ─── Credentials ─────────────────────────────────────────────────────────────

const TENANT_SLUG = 'walletz-demo';
const TENANT_NAME = 'Walletz Demo';
const USER_EMAIL  = 'demo@walletz.local';
const USER_PASS   = 'Walletz@2026!';
const USER_FIRST  = 'Demo';
const USER_LAST   = 'Owner';

// ─── Main ────────────────────────────────────────────────────────────────────

const client = new pg.Client({ connectionString: DATABASE_URL });

async function main() {
  await client.connect();
  console.log('\n🌱  Walletz Dev Seed\n');

  // Check if already seeded
  const existing = await client.query(
    `SELECT id FROM users WHERE email = $1 LIMIT 1`,
    [USER_EMAIL],
  );
  if (existing.rows.length > 0) {
    console.log(`✅  User "${USER_EMAIL}" already exists — nothing to do.\n`);
    await printCredentials();
    await client.end();
    return;
  }

  // 1. Create tenant
  const tenantId = createId();
  await client.query(
    `INSERT INTO tenants (id, slug, name, status, timezone, locale, country, currency,
                          settings, feature_flags, created_at, updated_at)
     VALUES ($1, $2, $3, 'active', 'America/Sao_Paulo', 'pt-BR', 'BR', 'BRL',
             '{}', '{}', now(), now())
     ON CONFLICT (slug) DO NOTHING`,
    [tenantId, TENANT_SLUG, TENANT_NAME],
  );

  // Retrieve actual tenant id (may already exist from a partial run)
  const tenantRow = await client.query(
    `SELECT id FROM tenants WHERE slug = $1 LIMIT 1`,
    [TENANT_SLUG],
  );
  const actualTenantId = tenantRow.rows[0].id;
  console.log(`🏢  Tenant: ${TENANT_NAME} (${actualTenantId})`);

  // 2. Create user
  const passwordHash = await bcrypt.hash(USER_PASS, 10);
  const userId = createId();
  await client.query(
    `INSERT INTO users (id, email, email_verified_at, password_hash, first_name, last_name,
                        locale, timezone, created_at, updated_at)
     VALUES ($1, $2, now(), $3, $4, $5, 'pt-BR', 'America/Sao_Paulo', now(), now())`,
    [userId, USER_EMAIL, passwordHash, USER_FIRST, USER_LAST],
  );
  console.log(`👤  User: ${USER_EMAIL} (${userId})`);

  // 3. Create membership (owner)
  const membershipId = createId();
  await client.query(
    `INSERT INTO memberships (id, tenant_id, user_id, role, status, permissions, created_at, updated_at)
     VALUES ($1, $2, $3, 'owner', 'active', '{}', now(), now())`,
    [membershipId, actualTenantId, userId],
  );
  console.log(`🔑  Membership: owner`);

  await printCredentials(actualTenantId, userId);
  await client.end();
}

async function printCredentials(tenantId, userId) {
  const lines = [
    '═══════════════════════════════════════════════════════',
    '  CREDENCIAIS DE TESTE — Walletz Dev',
    '═══════════════════════════════════════════════════════',
    `  URL:      http://localhost:3000`,
    `  Email:    ${USER_EMAIL}`,
    `  Senha:    ${USER_PASS}`,
    tenantId ? `  TenantID: ${tenantId}` : '',
    userId   ? `  UserID:   ${userId}`   : '',
    '═══════════════════════════════════════════════════════',
  ].filter(Boolean);

  console.log('\n' + lines.join('\n') + '\n');

  // Also write to file for reference
  const credFile = join(ROOT, 'apps', 'api', '.dev-credentials.txt');
  writeFileSync(credFile, lines.join('\n') + '\n', 'utf8');
  console.log(`💾  Salvo em: apps/api/.dev-credentials.txt\n`);
}

main().catch((err) => {
  console.error('❌  Seed failed:', err.message);
  client.end().catch(() => {});
  process.exit(1);
});
