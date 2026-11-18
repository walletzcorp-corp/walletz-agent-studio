import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { RbacGuard } from '../rbac.guard';
import { PermissionsService } from '../permissions.service';
import { ROLES_KEY } from '../roles.decorator';
import { PLAN_EXEMPT_KEY, REQUIRED_FEATURE_KEY } from '../../plans/requires-feature.decorator';
import type { PlanLimitsService } from '../../plans/plan-limits.service';
import type { DrizzleDB } from '../../../database/database.module';

type MembershipRow = {
  id: string;
  role: string;
  status: string;
  tenantStatus: string;
  trialEndsAt: Date | null;
  planId: string;
  featureFlags: Record<string, unknown>;
};

/** db.select().from().innerJoin().where().limit() → rows */
function dbReturning(rows: MembershipRow[]): { db: DrizzleDB; calls: number } {
  const state = { calls: 0 };
  const chain = {
    from: () => chain,
    innerJoin: () => chain,
    where: () => chain,
    limit: () => {
      state.calls += 1;
      return Promise.resolve(rows);
    },
  };
  const db = { select: () => chain } as unknown as DrizzleDB;
  return {
    db,
    get calls() {
      return state.calls;
    },
  };
}

function ctx(req: Record<string, unknown>): ExecutionContext {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

function reflectorWith(meta: { roles?: string[]; feature?: string; exempt?: boolean }): Reflector {
  return {
    getAllAndOverride: (key: string) =>
      key === ROLES_KEY ? meta.roles : key === REQUIRED_FEATURE_KEY ? meta.feature : undefined,
    get: (key: string) => (key === PLAN_EXEMPT_KEY ? meta.exempt : undefined),
  } as unknown as Reflector;
}

/** Usuários dentro do limite do plano (os demais ficaram acima depois de um rebaixamento). */
function plans(allowedMemberships: string[] = ['m-1']): PlanLimitsService {
  return {
    isWithinPlan: (_t: string, resource: string, id: string) =>
      Promise.resolve(resource === 'users' && allowedMemberships.includes(id)),
  } as unknown as PlanLimitsService;
}

function guard(meta: Parameters<typeof reflectorWith>[0], rows: MembershipRow[], allowed?: string[]) {
  return new RbacGuard(reflectorWith(meta), new PermissionsService(), plans(allowed), dbReturning(rows).db);
}

const user = { sub: 'user-a', email: 'a@x.com', sessionId: 's1' };
const active: MembershipRow = {
  id: 'm-1',
  role: 'owner',
  status: 'active',
  tenantStatus: 'active',
  trialEndsAt: null,
  planId: 'pro',
  featureFlags: {},
};
const tenantRoute = (extra: Record<string, unknown> = {}) => ctx({ user, params: { tenantId: 'tenant-a' }, ...extra });

async function errorCode(p: Promise<unknown>): Promise<string | undefined> {
  try {
    await p;
    return undefined;
  } catch (err) {
    expect(err).toBeInstanceOf(ForbiddenException);
    const body = (err as ForbiddenException).getResponse();
    return typeof body === 'object' && body ? (body as { error?: string }).error : undefined;
  }
}

describe('RbacGuard', () => {
  it('libera rota sem @Roles, sem recurso e sem :tenantId (ex.: /tenants/my)', async () => {
    const mock = dbReturning([]);
    const g = new RbacGuard(reflectorWith({}), new PermissionsService(), plans(), mock.db);
    await expect(g.canActivate(ctx({ user, params: {} }))).resolves.toBe(true);
    expect(mock.calls).toBe(0);
  });

  it('nega por padrão rota de organização sem @Roles', async () => {
    expect(await errorCode(guard({}, [active]).canActivate(tenantRoute()))).toBe('ROUTE_ROLE_NOT_DEFINED');
  });

  it('exige vínculo com o tenant da URL (isolamento)', async () => {
    await expect(guard({ roles: ['viewer'] }, []).canActivate(tenantRoute())).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('aceita membro ativo com papel suficiente', async () => {
    await expect(guard({ roles: ['viewer'] }, [active]).canActivate(tenantRoute())).resolves.toBe(true);
  });

  it('recusa quando o header x-tenant-slug aponta para outro tenant que a URL', async () => {
    await expect(
      guard({ roles: ['viewer'] }, [active]).canActivate(ctx({ user, tenantId: 'tenant-a', params: { tenantId: 'tenant-b' } })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('bloqueia tenant suspenso', async () => {
    const row = { ...active, tenantStatus: 'suspended' };
    expect(await errorCode(guard({ roles: ['viewer'] }, [row]).canActivate(tenantRoute()))).toBe('TENANT_SUSPENDED');
  });

  it('bloqueia trial vencido e libera trial no prazo', async () => {
    const expired = { ...active, tenantStatus: 'trial', trialEndsAt: new Date(Date.now() - 1000) };
    expect(await errorCode(guard({ roles: ['viewer'] }, [expired]).canActivate(tenantRoute()))).toBe('TRIAL_EXPIRED');
    const running = { ...active, tenantStatus: 'trial', trialEndsAt: new Date(Date.now() + 86_400_000) };
    await expect(guard({ roles: ['viewer'] }, [running]).canActivate(tenantRoute())).resolves.toBe(true);
  });

  it('bloqueia usuário acima do limite de usuários do plano (os mais novos, depois de rebaixar)', async () => {
    const newest = { ...active, id: 'm-9', role: 'admin' };
    expect(await errorCode(guard({ roles: ['viewer'] }, [newest], ['m-1']).canActivate(tenantRoute()))).toBe('PLAN_LIMIT_EXCEEDED');
  });

  it('bloqueia recurso fora do plano em qualquer rota do controller', async () => {
    const starter = { ...active, planId: 'starter' };
    expect(
      await errorCode(guard({ roles: ['viewer'], feature: 'whatsapp' }, [starter]).canActivate(tenantRoute())),
    ).toBe('FEATURE_NOT_IN_PLAN');
  });

  it('bloqueia recurso em desenvolvimento mesmo no plano mais alto', async () => {
    const agency = { ...active, planId: 'agency' };
    expect(
      await errorCode(guard({ roles: ['viewer'], feature: 'pcConnector' }, [agency]).canActivate(tenantRoute())),
    ).toBe('FEATURE_IN_DEVELOPMENT');
  });

  it('libera recurso fora do plano quando o admin abriu exceção', async () => {
    const starter = { ...active, planId: 'starter', featureFlags: { whatsapp: true } };
    await expect(guard({ roles: ['viewer'], feature: 'whatsapp' }, [starter]).canActivate(tenantRoute())).resolves.toBe(true);
  });

  it('bloqueia recurso do plano quando o admin o desligou', async () => {
    const pro = { ...active, featureFlags: { whatsapp: false } };
    expect(
      await errorCode(guard({ roles: ['viewer'], feature: 'whatsapp' }, [pro]).canActivate(tenantRoute())),
    ).toBe('FEATURE_NOT_IN_PLAN');
  });

  it('rota @PlanExempt (consultar/excluir) passa mesmo sem o recurso no plano', async () => {
    const starter = { ...active, planId: 'starter' };
    await expect(
      guard({ roles: ['viewer'], feature: 'whatsapp', exempt: true }, [starter]).canActivate(tenantRoute()),
    ).resolves.toBe(true);
  });

  it('recusa papel insuficiente', async () => {
    const viewer = { ...active, role: 'viewer' };
    await expect(guard({ roles: ['admin'] }, [viewer]).canActivate(tenantRoute())).rejects.toBeInstanceOf(ForbiddenException);
  });
});
