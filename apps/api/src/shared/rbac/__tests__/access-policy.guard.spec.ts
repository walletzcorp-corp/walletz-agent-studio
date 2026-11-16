import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccessPolicyGuard, readRouteAccess } from '../access-policy.guard';
import { Authenticated, Public } from '../access-policy.decorators';
import { PermissionsService } from '../permissions.service';
import { Roles } from '../roles.decorator';
import { createFakeDb } from '../../../tests/helpers/fake-db';

class Sample {
  @Public('test')
  open() {}

  @Authenticated()
  signedIn() {}

  @Roles('manager')
  tenantScoped() {}

  forgotten() {}
}

type Req = {
  params?: Record<string, string>;
  headers?: Record<string, string>;
  body?: unknown;
  query?: Record<string, string>;
  user?: { sub: string; sessionId: string };
  method?: string;
  path?: string;
  tenantContext?: unknown;
};

function setup(dbResults: unknown[] = []) {
  const fake = createFakeDb(dbResults);
  const audit = { logSync: jest.fn().mockResolvedValue(undefined) };
  const guard = new AccessPolicyGuard(
    new Reflector(),
    new PermissionsService(),
    audit as never,
    fake.db as never,
  );
  // The JWT strategy is exercised by the E2E suites; here it only has to "succeed".
  (guard as unknown as { jwtGuard: { canActivate: () => Promise<boolean> } }).jwtGuard = {
    canActivate: async () => true,
  };

  const run = (handler: keyof Sample, request: Req) => {
    const req: Req = {
      params: {},
      headers: {},
      body: {},
      query: {},
      user: { sub: 'user-1', sessionId: 's-1' },
      method: 'GET',
      path: '/x',
      ...request,
    };
    const context = {
      getType: () => 'http',
      getHandler: () => Sample.prototype[handler],
      getClass: () => Sample,
      switchToHttp: () => ({ getRequest: () => req }),
    } as unknown as ExecutionContext;
    return { req, result: guard.canActivate(context) };
  };

  return { run, audit, fake };
}

describe('readRouteAccess', () => {
  const reflector = new Reflector();
  const read = (h: keyof Sample) => readRouteAccess(reflector, [Sample.prototype[h], Sample]);

  it('classifies every kind of route and never defaults to allow', () => {
    expect(read('open')).toEqual({ kind: 'public' });
    expect(read('signedIn')).toEqual({ kind: 'authenticated' });
    expect(read('tenantScoped')).toEqual({ kind: 'tenant', roles: ['manager'] });
    expect(read('forgotten')).toEqual({ kind: 'unclassified' });
  });
});

describe('AccessPolicyGuard', () => {
  it('lets a PUBLIC route through without a session', async () => {
    const { run } = setup();
    await expect(run('open', { user: undefined }).result).resolves.toBe(true);
  });

  it('DENIES a route that nobody classified (deny by default)', async () => {
    const { run } = setup();
    await expect(run('forgotten', {}).result).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lets an AUTHENTICATED route through for any valid session', async () => {
    const { run } = setup();
    await expect(run('signedIn', {}).result).resolves.toBe(true);
  });

  it('authorises a tenant route from membership and exposes a frozen TenantContext', async () => {
    const { run } = setup([[{ id: 'm-1', role: 'admin', status: 'active' }]]);
    const { req, result } = run('tenantScoped', { params: { tenantId: 't-1' } });

    await expect(result).resolves.toBe(true);
    expect(req.tenantContext).toEqual({
      tenantId: 't-1',
      userId: 'user-1',
      role: 'admin',
      membershipId: 'm-1',
      sessionId: 's-1',
    });
    expect(Object.isFrozen(req.tenantContext)).toBe(true);
  });

  it('denies a user without an active membership and audits the attempt', async () => {
    // membership lookup, then the audit helper's tenant lookup + memberships-of-user lookup
    const { run, audit } = setup([[], [{ id: 't-9' }], [{ tenantId: 't-1' }]]);

    await expect(
      run('tenantScoped', { params: { tenantId: 't-9' } }).result,
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(audit.logSync).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'SECURITY_TENANT_ACCESS_DENIED',
        tenantId: 't-9',
        userId: 'user-1',
        metadata: expect.objectContaining({
          reason: 'no_active_membership',
          targetTenantId: 't-9',
          sourceTenantIds: ['t-1'],
        }),
      }),
    );
  });

  it('denies a suspended membership', async () => {
    const { run } = setup([[{ id: 'm-1', role: 'owner', status: 'suspended' }], [], []]);
    await expect(
      run('tenantScoped', { params: { tenantId: 't-1' } }).result,
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('denies a role below the requirement', async () => {
    const { run, audit } = setup([
      [{ id: 'm-1', role: 'viewer', status: 'active' }],
      [{ id: 't-1' }],
      [],
    ]);
    await expect(
      run('tenantScoped', { params: { tenantId: 't-1' } }).result,
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(audit.logSync).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ reason: 'insufficient_role' }),
      }),
    );
  });

  it('refuses conflicting tenant identifiers (header, body, query) even for a valid member', async () => {
    const conflicts: Array<[string, Req]> = [
      ['x-tenant-slug of another tenant', { headers: { 'x-tenant-slug': 'other' } }],
      ['body.tenantId', { body: { tenantId: 't-2' } }],
      ['query.tenantId', { query: { tenantId: 't-2' } }],
    ];
    for (const [, extra] of conflicts) {
      // header attempt resolves the slug to another tenant first; the others stop before membership
      const { run } = setup([[{ id: 't-2' }], [{ id: 't-1' }], []]);
      await expect(
        run('tenantScoped', { params: { tenantId: 't-1' }, ...extra }).result,
      ).rejects.toBeInstanceOf(ForbiddenException);
    }
  });

  it('accepts a header that agrees with the URL', async () => {
    const { run } = setup([[{ id: 't-1' }], [{ id: 'm-1', role: 'manager', status: 'active' }]]);
    await expect(
      run('tenantScoped', { params: { tenantId: 't-1' }, headers: { 'x-tenant-slug': 'mine' } })
        .result,
    ).resolves.toBe(true);
  });

  it('a tenant-scoped route without :tenantId is never reachable', async () => {
    const { run } = setup();
    await expect(run('tenantScoped', { params: {} }).result).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
