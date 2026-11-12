import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { RbacGuard } from '../rbac.guard';
import { PermissionsService } from '../permissions.service';
import type { DrizzleDB } from '../../../database/database.module';

type MembershipRow = { role: string; status: string; tenantStatus: string };

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

function reflectorWith(roles: string[] | undefined): Reflector {
  return { getAllAndOverride: () => roles } as unknown as Reflector;
}

const user = { sub: 'user-a', email: 'a@x.com', sessionId: 's1' };
const active: MembershipRow = { role: 'owner', status: 'active', tenantStatus: 'active' };

describe('RbacGuard', () => {
  it('libera rota sem @Roles e sem :tenantId (ex.: /tenants/my)', async () => {
    const mock = dbReturning([]);
    const guard = new RbacGuard(reflectorWith(undefined), new PermissionsService(), mock.db);
    await expect(guard.canActivate(ctx({ user, params: {} }))).resolves.toBe(true);
    expect(mock.calls).toBe(0);
  });

  it('exige vínculo com o tenant da URL mesmo sem @Roles (isolamento)', async () => {
    const guard = new RbacGuard(reflectorWith(undefined), new PermissionsService(), dbReturning([]).db);
    await expect(
      guard.canActivate(ctx({ user, params: { tenantId: 'tenant-b' } })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('aceita membro ativo sem @Roles', async () => {
    const guard = new RbacGuard(reflectorWith(undefined), new PermissionsService(), dbReturning([active]).db);
    await expect(guard.canActivate(ctx({ user, params: { tenantId: 'tenant-a' } }))).resolves.toBe(true);
  });

  it('recusa quando o header x-tenant-slug aponta para outro tenant que a URL', async () => {
    const guard = new RbacGuard(reflectorWith(['viewer']), new PermissionsService(), dbReturning([active]).db);
    await expect(
      guard.canActivate(ctx({ user, tenantId: 'tenant-a', params: { tenantId: 'tenant-b' } })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('bloqueia tenant suspenso', async () => {
    const suspended = { ...active, tenantStatus: 'suspended' };
    const guard = new RbacGuard(reflectorWith(['viewer']), new PermissionsService(), dbReturning([suspended]).db);
    await expect(
      guard.canActivate(ctx({ user, params: { tenantId: 'tenant-a' } })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('recusa papel insuficiente', async () => {
    const viewer = { ...active, role: 'viewer' };
    const guard = new RbacGuard(reflectorWith(['admin']), new PermissionsService(), dbReturning([viewer]).db);
    await expect(
      guard.canActivate(ctx({ user, params: { tenantId: 'tenant-a' } })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
