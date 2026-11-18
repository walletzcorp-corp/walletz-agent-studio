import * as fs from 'fs';
import * as path from 'path';
import { ForbiddenException } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, inArray } from 'drizzle-orm';
import { Pool } from 'pg';
import * as schema from '../database/schema';
import { agents } from '../database/schema/agents';
import { tenants } from '../database/schema/tenants';
import { memberships, users } from '../database/schema/users';
import { createId } from '../database/utils/id';
import type { DrizzleDB } from '../database/database.module';
import { PlanLimitsService } from '../shared/plans/plan-limits.service';

/**
 * Regras de plano contra o banco real: corrida no limite (trava), rebaixamento
 * bloqueando só os itens mais novos, dono nunca bloqueado e trial vencido.
 */
function databaseUrl(): string {
  if (process.env['DATABASE_URL']) return process.env['DATABASE_URL'];
  // .env.local do app (apps/api) ou da raiz do monorepo
  const line = ['../../.env.local', '../../../../.env.local']
    .map((rel) => path.resolve(__dirname, rel))
    .filter((f) => fs.existsSync(f))
    .flatMap((f) => fs.readFileSync(f, 'utf8').split(/\r?\n/))
    .find((l) => l.startsWith('DATABASE_URL='));
  if (!line) throw new Error('DATABASE_URL não definida (nem em .env.local)');
  return line.slice('DATABASE_URL='.length).trim();
}

const errorCode = (err: unknown): string | undefined => {
  if (!(err instanceof ForbiddenException)) return undefined;
  const body = err.getResponse();
  return typeof body === 'object' && body ? (body as { error?: string }).error : undefined;
};

describe('Regras de plano (integração com Postgres)', () => {
  let pool: Pool;
  let db: DrizzleDB;
  let service: PlanLimitsService;
  const tenantIds: string[] = [];
  const userIds: string[] = [];

  beforeAll(() => {
    pool = new Pool({ connectionString: databaseUrl(), max: 10 });
    db = drizzle(pool, { schema });
    service = new PlanLimitsService(db);
  });

  afterAll(async () => {
    if (tenantIds.length) {
      await db.delete(agents).where(inArray(agents.tenantId, tenantIds));
      await db.delete(memberships).where(inArray(memberships.tenantId, tenantIds));
      await db.delete(tenants).where(inArray(tenants.id, tenantIds));
    }
    if (userIds.length) await db.delete(users).where(inArray(users.id, userIds));
    await pool?.end();
  });

  async function newTenant(planId: string, extra: Partial<typeof tenants.$inferInsert> = {}): Promise<string> {
    const id = createId();
    await db.insert(tenants).values({ id, slug: `plan-test-${id}`, name: 'Teste de plano', planId, status: 'active', ...extra });
    tenantIds.push(id);
    return id;
  }

  async function addAgent(tenantId: string, name: string, createdAt: Date): Promise<string> {
    const [row] = await db
      .insert(agents)
      .values({ id: createId(), tenantId, name, createdAt, status: 'published' })
      .returning({ id: agents.id });
    return row!.id;
  }

  it('trava: 6 criações simultâneas no Starter (1 agente) resultam em exatamente 1', async () => {
    const tenantId = await newTenant('starter');
    const attempts = Array.from({ length: 6 }, (_, i) =>
      service.withSlot(tenantId, 'agents', (tx) =>
        tx.insert(agents).values({ id: createId(), tenantId, name: `Agente ${i}` }).returning({ id: agents.id }),
      ),
    );
    const results = await Promise.allSettled(attempts);
    const ok = results.filter((r) => r.status === 'fulfilled');
    const blocked = results.filter((r) => r.status === 'rejected' && errorCode(r.reason) === 'PLAN_LIMIT_REACHED');
    expect(ok).toHaveLength(1);
    expect(blocked).toHaveLength(5);
    expect(await service.countUsage(tenantId, 'agents')).toBe(1);
  });

  it('rebaixamento Pro → Starter: só o agente mais antigo continua liberado', async () => {
    const tenantId = await newTenant('pro');
    const oldest = await addAgent(tenantId, 'Mais antigo', new Date('2026-01-01T00:00:00Z'));
    const middle = await addAgent(tenantId, 'Do meio', new Date('2026-02-01T00:00:00Z'));
    const newest = await addAgent(tenantId, 'Mais novo', new Date('2026-03-01T00:00:00Z'));

    for (const id of [oldest, middle, newest]) expect(await service.isWithinPlan(tenantId, 'agents', id)).toBe(true);

    await db.update(tenants).set({ planId: 'starter' }).where(eq(tenants.id, tenantId));

    expect([...(await service.allowedIds(tenantId, 'agents'))]).toEqual([oldest]);
    await expect(service.assertWithinPlan(tenantId, 'agents', newest)).rejects.toBeInstanceOf(ForbiddenException);
    const err = await service.usageBlock(tenantId, { item: { resource: 'agents', id: middle } });
    expect(errorCode(err)).toBe('PLAN_LIMIT_EXCEEDED');
    expect(await service.usageBlock(tenantId, { item: { resource: 'agents', id: oldest } })).toBeNull();

    // Nada foi apagado: voltar para o Pro libera de novo.
    await db.update(tenants).set({ planId: 'pro' }).where(eq(tenants.id, tenantId));
    expect(await service.isWithinPlan(tenantId, 'agents', newest)).toBe(true);
  });

  it('rebaixamento de usuários: o dono nunca perde o acesso, mesmo sendo o mais novo', async () => {
    const tenantId = await newTenant('starter');
    const mk = async (email: string, role: 'owner' | 'admin', createdAt: Date) => {
      const [u] = await db.insert(users).values({ email, passwordHash: 'x' }).returning({ id: users.id });
      userIds.push(u!.id);
      const [m] = await db
        .insert(memberships)
        .values({ tenantId, userId: u!.id, role, status: 'active', createdAt })
        .returning({ id: memberships.id });
      return m!.id;
    };
    const suffix = createId();
    const admin = await mk(`admin-${suffix}@plan.test`, 'admin', new Date('2026-01-01T00:00:00Z'));
    const owner = await mk(`owner-${suffix}@plan.test`, 'owner', new Date('2026-06-01T00:00:00Z'));

    expect(await service.isWithinPlan(tenantId, 'users', owner)).toBe(true);
    expect(await service.isWithinPlan(tenantId, 'users', admin)).toBe(false);
  });

  it('recurso fora do plano e trial vencido bloqueiam o uso; exceção do admin libera', async () => {
    const starter = await newTenant('starter');
    expect(errorCode(await service.usageBlock(starter, { feature: 'whatsapp' }))).toBe('FEATURE_NOT_IN_PLAN');
    expect(await service.usageBlock(starter, { feature: 'webchat' })).toBeNull();

    await db.update(tenants).set({ featureFlags: { whatsapp: true } }).where(eq(tenants.id, starter));
    expect(await service.usageBlock(starter, { feature: 'whatsapp' })).toBeNull();

    const expired = await newTenant('pro', { status: 'trial', trialEndsAt: new Date(Date.now() - 60_000) });
    expect(errorCode(await service.usageBlock(expired, { feature: 'webchat' }))).toBe('TRIAL_EXPIRED');

    const running = await newTenant('pro', { status: 'trial', trialEndsAt: new Date(Date.now() + 86_400_000) });
    expect(await service.usageBlock(running, { feature: 'whatsapp' })).toBeNull();
  });
});
