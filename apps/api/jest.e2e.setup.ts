/**
 * Environment for the security / isolation E2E suites.
 * These suites CREATE data (tenants, users, messages...), so they refuse to run against anything
 * that is not clearly a throw-away database (name contains "e2e" or "test").
 */
const url =
  process.env['E2E_DATABASE_URL'] ??
  process.env['DATABASE_URL'] ??
  'postgresql://walletz:walletz@localhost:5433/walletz_e2e';

const dbName = new URL(url).pathname.slice(1);
if (!/(e2e|test)/i.test(dbName)) {
  throw new Error(
    `Refusing to run E2E suites against "${dbName}". Use a database whose name contains "e2e" or "test" ` +
      `(run "pnpm --filter @walletz/api test:e2e:db" to create walletz_e2e).`,
  );
}
process.env['DATABASE_URL'] = url;

// REDIS_URL (with credentials) usually lives only in the developer's .env.local.
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

function fromEnvLocal(key: string): string | undefined {
  const file = resolve(__dirname, '.env.local');
  if (!existsSync(file)) return undefined;
  const line = readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .find((l) => l.startsWith(`${key}=`));
  return line?.slice(key.length + 1).trim();
}

// Separate Redis logical DB so test queues can never be consumed by a developer's running API.
const redis = new URL(
  process.env['REDIS_URL'] ?? fromEnvLocal('REDIS_URL') ?? 'redis://localhost:6379',
);
if (redis.pathname === '' || redis.pathname === '/') redis.pathname = '/15';
process.env['REDIS_URL'] = redis.toString();

const defaults: Record<string, string> = {
  NODE_ENV: 'test',
  JWT_ACCESS_SECRET: 'e2e-access-secret-0123456789abcdef0123456789abcdef',
  JWT_REFRESH_SECRET: 'e2e-refresh-secret-0123456789abcdef0123456789abcdef',
  BCRYPT_ROUNDS: '4',
  ENCRYPTION_KEY: 'a'.repeat(64),
  CALENDAR_ENCRYPTION_KEY: 'b'.repeat(64),
  CALENDAR_OAUTH_STATE_SECRET: 'e2e-oauth-state-secret-0123456789abcdef0123456789abcdef',
  META_APP_SECRET: 'e2e-meta-app-secret',
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: 'e2e-verify-token',
  CORS_ALLOWED_ORIGINS: 'http://localhost:3000',
};
for (const [key, value] of Object.entries(defaults)) {
  // Tests need deterministic values: they win over whatever .env.local provides.
  process.env[key] = value;
}
