import { ForbiddenException } from '@nestjs/common';
import type { DrizzleDB } from '../../../database/database.module';
import { PLAN_CATALOG, resolvePlan } from '../plan-catalog';
import { PlanLimitsService } from '../plan-limits.service';

/** DB falso: cada select().from().where()... resolve para o próximo resultado da fila. */
function fakeDb(results: unknown[][]) {
  const queue = [...results];
  const chain = (): unknown =>
    new Proxy(
      {},
      {
        get(_t, prop) {
          if (prop === 'then') {
            const rows = queue.shift() ?? [];
            return (resolve: (v: unknown) => void) => resolve(rows);
          }
          return () => chain();
        },
      },
    );
  return { select: () => chain() } as unknown as DrizzleDB;
}

describe('catálogo de planos v4.2', () => {
  it('tem os preços e limites do documento comercial', () => {
    expect(PLAN_CATALOG.starter.priceMonthlyCents).toBe(9_900);
    expect(PLAN_CATALOG.pro.priceMonthlyCents).toBe(39_900);
    expect(PLAN_CATALOG.business.priceMonthlyCents).toBe(89_900);
    expect(PLAN_CATALOG.agency.priceMonthlyCents).toBe(199_000);
    expect(PLAN_CATALOG.starter.limits).toMatchObject({ agents: 1, users: 1, aiConnections: 1, whatsappNumbers: 0, calendars: 0 });
    expect(PLAN_CATALOG.pro.limits).toMatchObject({ agents: 3, users: 5, aiConnections: 2, whatsappNumbers: 1, calendars: 1 });
    expect(PLAN_CATALOG.business.limits).toMatchObject({ agents: 8, users: 15, aiConnections: 3, whatsappNumbers: 2, calendars: 3 });
    expect(PLAN_CATALOG.agency.limits).toMatchObject({ agents: 10, users: 25, whatsappNumbers: 5, calendars: 5, subaccounts: 5 });
  });

  it('implantação: parcelado e à vista conforme a tabela', () => {
    expect([PLAN_CATALOG.starter.setupFeeCents, PLAN_CATALOG.starter.setupFeeCashCents]).toEqual([250_000, 200_000]);
    expect([PLAN_CATALOG.agency.setupFeeCents, PLAN_CATALOG.agency.setupFeeCashCents]).toEqual([1_200_000, 1_000_000]);
  });

  it('nenhum plano é ilimitado', () => {
    for (const plan of Object.values(PLAN_CATALOG)) {
      for (const value of Object.values(plan.limits)) expect(value).toBeGreaterThanOrEqual(0);
    }
  });

  it('plano ausente ou legado cai no Starter', () => {
    expect(resolvePlan(null).slug).toBe('starter');
    expect(resolvePlan('enterprise').slug).toBe('starter');
    expect(resolvePlan('pro').slug).toBe('pro');
  });

  it('Starter não inclui WhatsApp nem agenda; White Label segue condicionado', () => {
    expect(PLAN_CATALOG.starter.features.whatsapp).toBe('not_included');
    expect(PLAN_CATALOG.starter.features.calendars).toBe('not_included');
    expect(PLAN_CATALOG.starter.features.webchat).toBe('available');
    expect(PLAN_CATALOG.agency.features.whiteLabel).toBe('in_development');
  });
});

describe('PlanLimitsService', () => {
  it('bloqueia o 2º agente no Starter com PLAN_LIMIT_REACHED', async () => {
    const svc = new PlanLimitsService(fakeDb([[{ planId: 'starter', featureFlags: {} }], [{ value: 1 }]]));
    await expect(svc.assertCanAdd('t1', 'agents')).rejects.toThrow(ForbiddenException);
    const svc2 = new PlanLimitsService(fakeDb([[{ planId: 'starter', featureFlags: {} }], [{ value: 1 }]]));
    await svc2.assertCanAdd('t1', 'agents').catch((e: ForbiddenException) => {
      expect(e.getResponse()).toMatchObject({ error: 'PLAN_LIMIT_REACHED', limit: 1, used: 1, plan: 'starter' });
    });
  });

  it('permite o 3º agente no Pro', async () => {
    const svc = new PlanLimitsService(fakeDb([[{ planId: 'pro', featureFlags: {} }], [{ value: 2 }]]));
    await expect(svc.assertCanAdd('t1', 'agents')).resolves.toBeUndefined();
  });

  it('WhatsApp fora do Starter, mas liberável sob medida pelo admin', async () => {
    const blocked = new PlanLimitsService(fakeDb([[{ planId: 'starter', featureFlags: {} }]]));
    await expect(blocked.assertFeature('t1', 'whatsapp')).rejects.toThrow(ForbiddenException);
    const overridden = new PlanLimitsService(fakeDb([[{ planId: 'starter', featureFlags: { whatsapp: true } }]]));
    await expect(overridden.assertFeature('t1', 'whatsapp')).resolves.toBeUndefined();
  });

  it('recurso em desenvolvimento responde FEATURE_IN_DEVELOPMENT', async () => {
    const svc = new PlanLimitsService(fakeDb([[{ planId: 'business', featureFlags: {} }]]));
    await svc.assertFeature('t1', 'crmConnectors').then(
      () => fail('deveria bloquear'),
      (e: ForbiddenException) => expect(e.getResponse()).toMatchObject({ error: 'FEATURE_IN_DEVELOPMENT' }),
    );
  });

  it('campanhas em massa não estão em nenhum plano', async () => {
    const svc = new PlanLimitsService(fakeDb([[{ planId: 'agency', featureFlags: {} }]]));
    await expect(svc.assertFeature('t1', 'campaigns')).rejects.toThrow(ForbiddenException);
  });
});
