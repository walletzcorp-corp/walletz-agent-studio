import path from 'node:path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { createLogger } from '../shared/telemetry/logger';

/**
 * Aplica as migrations versionadas (meta/_journal.json) sem depender do
 * drizzle-kit, que é devDependency. Usado pela imagem de produção:
 *   node dist/database/migrate.js
 */
async function run(): Promise<void> {
  const logger = createLogger('Migrate');
  const connectionString = process.env['DATABASE_URL'];
  if (!connectionString) {
    throw new Error('DATABASE_URL não definida');
  }
  const migrationsFolder = process.env['MIGRATIONS_DIR'] ?? path.resolve(__dirname, 'migrations');

  const pool = new Pool({ connectionString, max: 1 });
  try {
    logger.info({ migrationsFolder }, 'Aplicando migrations');
    await migrate(drizzle(pool), { migrationsFolder });
    logger.info('Migrations aplicadas');
  } finally {
    await pool.end();
  }
}

run().catch((err: unknown) => {
  const logger = createLogger('Migrate');
  logger.error({ err }, 'Falha ao aplicar migrations');
  process.exit(1);
});
