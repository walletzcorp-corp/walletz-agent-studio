import * as bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { users } from '../schema/users';
import { createLogger } from '../../shared/telemetry/logger';

/**
 * Cria (ou promove) um administrador da plataforma.
 *
 *   ADMIN_EMAIL=fulano@walletzcorp.com ADMIN_PASSWORD='...' node dist/database/scripts/create-platform-admin.js
 *
 * - Usuário novo: cria com a senha informada, e-mail já verificado.
 * - Usuário existente: marca como admin; troca a senha só se ADMIN_PASSWORD vier.
 * A senha nunca é logada nem aceita por argumento (ficaria no histórico do shell).
 */
const MIN_PASSWORD_LENGTH = 12;

async function run(): Promise<void> {
  const logger = createLogger('CreatePlatformAdmin');
  const connectionString = process.env['DATABASE_URL'];
  const email = process.env['ADMIN_EMAIL']?.trim().toLowerCase();
  const password = process.env['ADMIN_PASSWORD'];
  const rounds = Number(process.env['BCRYPT_ROUNDS'] ?? 12);

  if (!connectionString) throw new Error('DATABASE_URL não definida');
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('ADMIN_EMAIL inválido');
  if (password !== undefined && password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`ADMIN_PASSWORD precisa ter ao menos ${MIN_PASSWORD_LENGTH} caracteres`);
  }

  const pool = new Pool({ connectionString, max: 1 });
  const db = drizzle(pool);
  try {
    const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const now = new Date();

    if (existing) {
      await db
        .update(users)
        .set({
          isPlatformAdmin: true,
          deletedAt: null,
          emailVerifiedAt: existing.emailVerifiedAt ?? now,
          ...(password ? { passwordHash: await bcrypt.hash(password, rounds) } : {}),
          updatedAt: now,
        })
        .where(eq(users.id, existing.id));
      logger.info({ userId: existing.id, email, passwordChanged: !!password }, 'Usuário promovido a admin da plataforma');
      return;
    }

    if (!password) throw new Error('Usuário não existe: informe ADMIN_PASSWORD para criá-lo');
    const [created] = await db
      .insert(users)
      .values({
        email,
        passwordHash: await bcrypt.hash(password, rounds),
        firstName: 'Tecnologia',
        lastName: 'Walletz',
        emailVerifiedAt: now,
        isPlatformAdmin: true,
      })
      .returning({ id: users.id });
    logger.info({ userId: created?.id, email }, 'Admin da plataforma criado');
  } finally {
    await pool.end();
  }
}

run().catch((err: unknown) => {
  createLogger('CreatePlatformAdmin').error({ err: err instanceof Error ? err.message : String(err) }, 'Falha');
  process.exit(1);
});
