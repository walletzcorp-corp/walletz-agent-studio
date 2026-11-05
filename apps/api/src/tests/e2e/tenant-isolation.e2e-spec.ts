/**
 * Permanent tenant-isolation suite. Fails the build if ANY route allows:
 *   - access without a policy (deny-by-default), or without a token
 *   - one tenant reading, changing or deleting another tenant's data (URL, header, body, query,
 *     path ids, ids referenced from a body), in either direction (A->B and B->A)
 *   - a role acting above its level
 *
 * Routes are discovered from the live Nest container, so a new endpoint is attacked
 * automatically. The run writes docs/qa/TENANT_ISOLATION_MATRIX.md.
 */
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { and, eq, sql } from 'drizzle-orm';
import request from 'supertest';
import { auditLogs } from '../../database/schema';
import {
  bootstrapE2E,
  leaks,
  snapshotTenant,
  type E2EContext,
  type RoleKey,
  type TenantFixture,
} from './harness';
import { discoverRoutes, roleRank, type RouteInfo } from './route-discovery';

type Verdict = 'PASS' | 'FAIL';
interface Row {
  method: string;
  route: string;
  role: string;
  tenant: string;
  attack: string;
  expected: string;
  actual: string;
  verdict: Verdict;
}

// Public routes are an explicit allow-list: adding one must be a conscious decision.
const PUBLIC_ALLOWLIST = new Set([
  'POST /api/v1/auth/register',
  'GET /api/v1/auth/verify-email',
  'POST /api/v1/auth/login',
  'POST /api/v1/auth/refresh',
  'POST /api/v1/auth/forgot-password',
  'POST /api/v1/auth/reset-password',
  'GET /api/v1/health',
  'GET /api/v1/ready',
  'GET /api/v1/webhook/whatsapp',
  'POST /api/v1/webhook/whatsapp',
  'GET /api/v1/tenants/callback/:provider',
  'POST /api/v1/pc-connector/pair',
  'GET /api/v1/pc-connector/devices/:deviceId/commands',
  'POST /api/v1/pc-connector/devices/:deviceId/commands/:commandId/result',
]);

const ROLE_USERS: Array<{ key: RoleKey; db: Parameters<typeof roleRank>[0] }> = [
  { key: 'viewer', db: 'viewer' },
  { key: 'operator', db: 'agent_operator' },
  { key: 'admin', db: 'admin' },
  { key: 'owner', db: 'owner' },
];

const IN_FUTURE = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000);
IN_FUTURE.setUTCHours(15, 0, 0, 0);

function idsFor(t: TenantFixture): Record<string, string> {
  return {
    tenantId: t.id,
    agentId: t.agentId,
    releaseId: t.releaseId,
    connectionId: t.calendarConnectionId,
    meetingId: t.meetingId,
    segmentId: t.segmentId,
    campaignId: t.campaignId,
    contactId: t.contactId,
    conversationId: t.conversationId,
    sourceId: t.knowledgeSourceId,
    itemId: t.knowledgeItemId,
    deviceId: t.deviceId,
    commandId: t.commandId,
    accountId: t.whatsappAccountId,
    membershipId: t.users.viewer.membershipId,
    provider: 'google',
    templateId: t.templateId,
  };
}

/** A realistic body per mutating route, so the service layer (not just validation) is exercised. */
function sampleBody(
  route: RouteInfo,
  t: TenantFixture,
): { body?: Record<string, unknown>; refs: boolean } {
  const key = `${route.method} ${route.path.replace('/api/v1/tenants/:tenantId', '')}`;
  const end = new Date(IN_FUTURE.getTime() + 30 * 60 * 1000).toISOString();
  const start = IN_FUTURE.toISOString();
  const table: Record<string, { body: Record<string, unknown>; refs: boolean }> = {
    'POST /agents': { body: { name: 'E2E agent' }, refs: false },
    'PATCH /agents/:agentId': { body: { name: 'HACKED' }, refs: false },
    'POST /agents/:agentId/tool-permissions': {
      body: { toolName: 'schedule_appointment', allowed: false },
      refs: false,
    },
    'POST /calendars/meetings': {
      body: {
        title: 'X',
        startAt: start,
        endAt: end,
        agentId: t.agentId,
        connectionId: t.calendarConnectionId,
      },
      refs: true,
    },
    'PATCH /calendars/meetings/:meetingId/reschedule': {
      body: { startAt: start, endAt: end },
      refs: false,
    },
    'DELETE /calendars/meetings/:meetingId': { body: { reason: 'x' }, refs: false },
    'PATCH /calendars/agents/:agentId/settings': {
      body: { canSchedule: true, connectionId: t.calendarConnectionId },
      refs: true,
    },
    'POST /segments': { body: { name: 'E2E segment' }, refs: false },
    'POST /campaigns': {
      body: { name: 'E2E', segmentId: t.segmentId, agentId: t.agentId },
      refs: true,
    },
    'POST /contacts/import/json': {
      body: { contacts: [{ firstName: 'E2E', phone: '+5511912340000' }] },
      refs: false,
    },
    'POST /conversations/:conversationId/messages': { body: { text: 'hi' }, refs: false },
    'POST /knowledge/url': { body: { url: 'https://example.com', agentId: t.agentId }, refs: true },
    'POST /knowledge/typed': { body: { name: 'x', content: 'y', agentId: t.agentId }, refs: true },
    'POST /teach': { body: { type: 'fact', content: 'x', agentId: t.agentId }, refs: true },
    'PATCH /teach/:itemId': { body: { content: 'HACKED' }, refs: false },
    'POST /lab/chat': { body: { agentId: t.publishedAgentId, message: 'hi' }, refs: true },
    'PATCH /whatsapp/accounts/:accountId/agent': {
      body: { agentId: t.publishedAgentId },
      refs: true,
    },
    'POST /whatsapp/accounts/:accountId/send': {
      body: { to: '+5511900000000', text: 'x' },
      refs: false,
    },
    'POST /whatsapp/accounts': {
      body: { phoneNumberId: t.phoneNumberId, wabaId: 'W', accessToken: 't', verifyToken: 'v' },
      refs: true,
    },
    'POST /whatsapp/embedded-signup': { body: { code: 'x' }, refs: false },
    'POST /whatsapp/accounts/:accountId/reconnect': { body: { code: 'x' }, refs: false },
    'PATCH /pc-connector/devices/:deviceId/capabilities': {
      body: { capabilities: { files: { read: false } } },
      refs: false,
    },
    'PATCH /pc-connector/commands/:commandId/approve': { body: { approved: true }, refs: false },
    'DELETE /privacy/contacts/:contactId': { body: { reason: 'e2e' }, refs: false },
    'PATCH /settings': { body: { name: 'HACKED' }, refs: false },
    'PATCH /members/:membershipId/role': { body: { role: 'viewer' }, refs: false },
    'POST /members/invite': {
      body: { email: `e2e-${Date.now()}@x.test`, role: 'viewer' },
      refs: false,
    },
  };
  const hit = table[key];
  if (hit) return hit;
  return route.method === 'GET' || route.method === 'DELETE'
    ? { refs: false }
    : { body: {}, refs: false };
}

function fill(path: string, ids: Record<string, string>): string {
  return path.replace(/:(\w+)/g, (_m, name: string) => ids[name] ?? 'x');
}

describe('Tenant isolation matrix (every route, both directions)', () => {
  let ctx: E2EContext;
  let A: TenantFixture;
  let B: TenantFixture;
  let routes: RouteInfo[];
  let tenantRoutes: RouteInfo[];
  const rows: Row[] = [];
  let before: { A: Record<string, string>; B: Record<string, string> };

  beforeAll(async () => {
    ctx = await bootstrapE2E();
    A = ctx.A;
    B = ctx.B;
    routes = discoverRoutes(ctx.app);
    tenantRoutes = routes.filter((r) => r.access.kind === 'tenant');
    // Pristine state, captured right after seeding and before the first attack.
    before = { A: await snapshotTenant(ctx.db, A.id), B: await snapshotTenant(ctx.db, B.id) };
  });

  afterAll(async () => {
    writeMatrix();
    await ctx.close();
  });

  // ── helpers ────────────────────────────────────────────────────────────────

  async function send(
    route: RouteInfo,
    url: string,
    opts: {
      token?: string;
      headers?: Record<string, string>;
      body?: Record<string, unknown>;
      query?: Record<string, string>;
    },
  ) {
    const agent = request(ctx.app.getHttpServer());
    const verb = route.method.toLowerCase() as 'get' | 'post' | 'put' | 'patch' | 'delete';
    let req = agent[verb](url);
    if (opts.token) req = req.set('Authorization', `Bearer ${opts.token}`);
    for (const [k, v] of Object.entries(opts.headers ?? {})) req = req.set(k, v);
    if (opts.query) req = req.query(opts.query);
    if (route.method !== 'GET' && opts.body !== undefined) req = req.send(opts.body);
    const res = await req;
    return { status: res.status, text: res.text ?? '' };
  }

  function record(row: Omit<Row, 'verdict'>, ok: boolean): boolean {
    rows.push({ ...row, verdict: ok ? 'PASS' : 'FAIL' });
    return ok;
  }

  // Failures are reported per test: rows recorded by earlier tests were already asserted.
  let mark = 0;
  beforeEach(() => {
    mark = rows.length;
  });
  const fails = () => rows.slice(mark).filter((r) => r.verdict === 'FAIL');
  const table = (list: Row[]) =>
    list
      .map(
        (r) =>
          `${r.method} ${r.route} | ${r.role} | ${r.tenant} | ${r.attack} | exp ${r.expected} | got ${r.actual}`,
      )
      .join('\n');

  function writeMatrix() {
    const total = rows.length;
    const failed = fails().length;
    const md = [
      '# Tenant Isolation Matrix',
      '',
      `Gerado automaticamente por \`tenant-isolation.e2e-spec.ts\` em ${new Date().toISOString()}.`,
      '',
      `- Rotas descobertas: **${routes.length}** (tenant-scoped: **${tenantRoutes.length}**, públicas: ${routes.filter((r) => r.access.kind === 'public').length}, autenticadas: ${routes.filter((r) => r.access.kind === 'authenticated').length})`,
      `- Ataques executados: **${total}** — PASS: **${total - failed}** — FAIL: **${failed}**`,
      '',
      '| METHOD | ROUTE | ROLE | TENANT | ATTACK | EXPECTED | ACTUAL | RESULT |',
      '|---|---|---|---|---|---|---|---|',
      ...rows.map(
        (r) =>
          `| ${r.method} | \`${r.route}\` | ${r.role} | ${r.tenant} | ${r.attack} | ${r.expected} | ${r.actual} | ${r.verdict} |`,
      ),
      '',
    ].join('\n');
    const file = resolve(process.cwd(), '../../docs/qa/TENANT_ISOLATION_MATRIX.md');
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, md, 'utf8');
  }

  // ── 1. classification ─────────────────────────────────────────────────────

  it('discovers the full route inventory', () => {
    expect(routes.length).toBeGreaterThanOrEqual(90);
  });

  it('every route is explicitly PUBLIC, AUTHENTICATED or TENANT_SCOPED+ROLE (deny by default)', () => {
    const unclassified = routes.filter((r) => r.access.kind === 'unclassified');
    expect(unclassified.map((r) => `${r.method} ${r.path} (${r.controller}.${r.handler})`)).toEqual(
      [],
    );
  });

  it('every tenant-scoped route is addressed by :tenantId in the URL', () => {
    const bad = tenantRoutes.filter((r) => !r.path.includes(':tenantId'));
    expect(bad.map((r) => `${r.method} ${r.path}`)).toEqual([]);
  });

  it('PUBLIC routes are exactly the reviewed allow-list', () => {
    const publics = routes
      .filter((r) => r.access.kind === 'public')
      .map((r) => `${r.method} ${r.path}`);
    expect(publics.filter((p) => !PUBLIC_ALLOWLIST.has(p))).toEqual([]);
    expect([...PUBLIC_ALLOWLIST].filter((p) => !publics.includes(p))).toEqual([]);
  });

  // ── 2. authentication ─────────────────────────────────────────────────────

  it('authenticated and tenant routes answer 401 without a token or with a bad one', async () => {
    for (const route of routes.filter((r) => r.access.kind !== 'public')) {
      for (const [label, token] of [
        ['no token', undefined],
        ['garbage token', 'not.a.jwt'],
      ] as const) {
        const url = fill(route.path, idsFor(A));
        const res = await send(route, url, { token, body: {} });
        record(
          {
            method: route.method,
            route: route.path,
            role: '-',
            tenant: 'A',
            attack: label,
            expected: '401',
            actual: String(res.status),
          },
          res.status === 401,
        );
      }
    }
    expect(table(fails())).toBe('');
  });

  // ── 3. cross-tenant attacks, both directions ──────────────────────────────

  const directions = (): Array<{ attacker: TenantFixture; victim: TenantFixture }> => [
    { attacker: A, victim: B },
    { attacker: B, victim: A },
  ];

  it('token of one tenant + URL of the other tenant -> 403, never data', async () => {
    for (const { attacker, victim } of directions()) {
      for (const route of tenantRoutes) {
        const url = fill(route.path, idsFor(victim));
        const { body } = sampleBody(route, victim);
        const res = await send(route, url, { token: attacker.users.owner.token, body });
        record(
          {
            method: route.method,
            route: route.path,
            role: 'owner',
            tenant: `${attacker.key}->${victim.key}`,
            attack: 'URL tenant of other company',
            expected: '403',
            actual: String(res.status),
          },
          res.status === 403 && leaks(res.text, victim.secrets).length === 0,
        );
      }
    }
    expect(table(fails())).toBe('');
  });

  it('own header + foreign URL -> 403 (a matching x-tenant-slug grants nothing)', async () => {
    for (const { attacker, victim } of directions()) {
      for (const route of tenantRoutes) {
        const url = fill(route.path, idsFor(victim));
        const res = await send(route, url, {
          token: attacker.users.owner.token,
          headers: { 'x-tenant-slug': attacker.slug },
          body: sampleBody(route, victim).body,
        });
        record(
          {
            method: route.method,
            route: route.path,
            role: 'owner',
            tenant: `${attacker.key}->${victim.key}`,
            attack: 'own slug header + foreign URL',
            expected: '403',
            actual: String(res.status),
          },
          res.status === 403,
        );
      }
    }
    expect(table(fails())).toBe('');
  });

  it('foreign header + own URL -> 403 (conflicting identifiers are rejected)', async () => {
    for (const { attacker, victim } of directions()) {
      for (const route of tenantRoutes) {
        const url = fill(route.path, idsFor(attacker));
        const res = await send(route, url, {
          token: attacker.users.owner.token,
          headers: { 'x-tenant-slug': victim.slug },
          body: sampleBody(route, attacker).body,
        });
        record(
          {
            method: route.method,
            route: route.path,
            role: 'owner',
            tenant: `${attacker.key}->${victim.key}`,
            attack: 'foreign slug header + own URL',
            expected: '403',
            actual: String(res.status),
          },
          res.status === 403,
        );
      }
    }
    expect(table(fails())).toBe('');
  });

  it('tenantId claimed in body / query that differs from the URL -> 403', async () => {
    for (const { attacker, victim } of directions()) {
      for (const route of tenantRoutes) {
        const url = fill(route.path, idsFor(attacker));
        const isRead = route.method === 'GET';
        const res = await send(route, url, {
          token: attacker.users.owner.token,
          ...(isRead
            ? { query: { tenantId: victim.id } }
            : { body: { ...(sampleBody(route, attacker).body ?? {}), tenantId: victim.id } }),
        });
        record(
          {
            method: route.method,
            route: route.path,
            role: 'owner',
            tenant: `${attacker.key}->${victim.key}`,
            attack: isRead ? 'query.tenantId of other company' : 'body.tenantId of other company',
            expected: '403',
            actual: String(res.status),
          },
          res.status === 403,
        );
      }
    }
    expect(table(fails())).toBe('');
  });

  it("IDOR: own URL + the other tenant's resource ids in the path -> never success, never data", async () => {
    for (const { attacker, victim } of directions()) {
      for (const route of tenantRoutes.filter((r) => r.resourceParams.length > 0)) {
        // own tenantId, foreign resource ids
        const ids = { ...idsFor(victim), tenantId: attacker.id };
        const url = fill(route.path, ids);
        const res = await send(route, url, {
          token: attacker.users.owner.token,
          body: sampleBody(route, victim).body,
        });
        const blocked =
          res.status >= 400 && res.status < 500 && leaks(res.text, victim.secrets).length === 0;
        record(
          {
            method: route.method,
            route: route.path,
            role: 'owner',
            tenant: `${attacker.key}->${victim.key}`,
            attack: 'foreign resource id in path (IDOR)',
            expected: '4xx, no data',
            actual: String(res.status),
          },
          blocked,
        );
      }
    }
    expect(table(fails())).toBe('');
  });

  it("IDOR: own URL + the other tenant's ids referenced from the body -> never success", async () => {
    for (const { attacker, victim } of directions()) {
      for (const route of tenantRoutes) {
        const { body, refs } = sampleBody(route, victim);
        if (!refs) continue;
        const url = fill(route.path, { ...idsFor(attacker), tenantId: attacker.id });
        const res = await send(route, url, { token: attacker.users.owner.token, body });
        record(
          {
            method: route.method,
            route: route.path,
            role: 'owner',
            tenant: `${attacker.key}->${victim.key}`,
            attack: 'foreign id referenced in body',
            expected: '4xx, no data',
            actual: String(res.status),
          },
          res.status >= 400 && res.status < 500 && leaks(res.text, victim.secrets).length === 0,
        );
      }
    }
    expect(table(fails())).toBe('');
  });

  it('after every cross-tenant attack the data of BOTH tenants is byte-for-byte unchanged (no foreign write or delete)', async () => {
    expect(await snapshotTenant(ctx.db, A.id)).toEqual(before.A);
    expect(await snapshotTenant(ctx.db, B.id)).toEqual(before.B);
  });

  // ── 4. RBAC ───────────────────────────────────────────────────────────────

  it('roles below the required level get 403; the required level reaches the handler', async () => {
    for (const tenant of [A, B]) {
      for (const route of tenantRoutes) {
        const min = roleRank(route.minRole!);
        const ids = { ...idsFor(tenant) };
        const { body } = sampleBody(route, tenant);

        for (const { key, db } of ROLE_USERS) {
          const allowed = roleRank(db) >= min;
          // Allowed callers use a resource id that does not exist: the handler is reached
          // (404/400) but nothing real is touched, so later tests keep their fixtures.
          const probeIds = allowed
            ? Object.fromEntries(
                Object.keys(ids).map((k) => [
                  k,
                  k === 'tenantId' ? tenant.id : k === 'provider' ? 'google' : 'does-not-exist',
                ]),
              )
            : ids;
          const res = await send(route, fill(route.path, probeIds), {
            token: tenant.users[key].token,
            body: allowed ? {} : body,
          });
          const ok = allowed ? res.status !== 401 && res.status !== 403 : res.status === 403;
          record(
            {
              method: route.method,
              route: route.path,
              role: key,
              tenant: tenant.key,
              attack: allowed
                ? 'RBAC: role allowed reaches handler'
                : 'RBAC: role below requirement',
              expected: allowed ? 'not 401/403' : '403',
              actual: String(res.status),
            },
            ok,
          );
        }
      }
    }
    expect(table(fails())).toBe('');
  });

  // ── 5. no foreign data and no foreign writes at all ───────────────────────

  it('own list endpoints return own data only (control: the isolation tests are not vacuous)', async () => {
    for (const { attacker, victim } of directions()) {
      let sawOwnData = false;
      for (const route of tenantRoutes.filter(
        (r) => r.method === 'GET' && r.resourceParams.length === 0,
      )) {
        const res = await send(route, fill(route.path, idsFor(attacker)), {
          token: attacker.users.owner.token,
        });
        if (res.status === 200 && leaks(res.text, attacker.secrets).length > 0) sawOwnData = true;
        record(
          {
            method: route.method,
            route: route.path,
            role: 'owner',
            tenant: `${attacker.key}`,
            attack: 'own list contains no foreign data',
            expected: '200, no foreign data',
            actual: String(res.status),
          },
          res.status < 500 && leaks(res.text, victim.secrets).length === 0,
        );
      }
      expect(sawOwnData).toBe(true);
    }
    expect(table(fails())).toBe('');
  });

  it("GET /tenants/my lists only the caller's tenants and creating a tenant grants nothing else", async () => {
    const mine = await request(ctx.app.getHttpServer())
      .get('/api/v1/tenants/my')
      .set('Authorization', `Bearer ${A.users.owner.token}`);
    expect(mine.status).toBe(200);
    expect(JSON.stringify(mine.body)).toContain(A.id);
    expect(JSON.stringify(mine.body)).not.toContain(B.id);
  });

  it('denied attempts were audited as SECURITY_TENANT_ACCESS_DENIED without leaking credentials', async () => {
    const entries = await ctx.db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.action, 'SECURITY_TENANT_ACCESS_DENIED'),
          sql`${auditLogs.metadata}->>'targetTenantId' = ${B.id}`,
        ),
      );
    expect(entries.length).toBeGreaterThan(0);
    const fromA = entries.filter((e) => e.userId === A.users.owner.id);
    expect(fromA.length).toBeGreaterThan(0);
    const sample = fromA[0]!;
    expect(sample.tenantId).toBe(B.id);
    expect(sample.resourceId).toMatch(/^(GET|POST|PATCH|DELETE|PUT) /);
    expect((sample.metadata as { sourceTenantIds?: string[] }).sourceTenantIds).toContain(A.id);
    const blob = JSON.stringify(entries);
    for (const t of [A, B]) {
      for (const u of Object.values(t.users)) expect(blob).not.toContain(u.token);
    }
  });
});
