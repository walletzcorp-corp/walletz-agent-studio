/**
 * Tenant Isolation Test Suite (TC01 / TC25)
 *
 * These tests verify that no user in Tenant A can read, write, or modify
 * data belonging to Tenant B under any scenario.
 *
 * Requires: real PostgreSQL + Redis (set DATABASE_URL and REDIS_URL env vars).
 */

import { Test, type TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../app.module';

// A suíte cria usuários pelo cadastro público, que é fechado por padrão.
process.env.ALLOW_PUBLIC_SIGNUP = 'true';

const TENANT_A = { name: 'Tenant Alpha', slug: `test-alpha-${Date.now()}` };
const TENANT_B = { name: 'Tenant Beta', slug: `test-beta-${Date.now()}` };

const USER_A = { email: `user-a-${Date.now()}@isolation.test`, password: 'IsolationTest1!', firstName: 'Alice' };
const USER_B = { email: `user-b-${Date.now()}@isolation.test`, password: 'IsolationTest2!', firstName: 'Bob' };

interface AuthTokens { accessToken: string; refreshToken: string }

async function registerAndLogin(app: INestApplication, user: typeof USER_A): Promise<{ tokens: AuthTokens; userId: string }> {
  await request(app.getHttpServer())
    .post('/v1/auth/register')
    .send(user)
    .expect(201);

  const { body } = await request(app.getHttpServer())
    .post('/v1/auth/login')
    .send({ email: user.email, password: user.password })
    .expect(200);

  return { tokens: body as AuthTokens, userId: body.userId ?? '' };
}

async function createTenant(
  app: INestApplication,
  tokens: AuthTokens,
  tenantData: typeof TENANT_A,
) {
  const { body } = await request(app.getHttpServer())
    .post('/v1/tenants')
    .set('Authorization', `Bearer ${tokens.accessToken}`)
    .send(tenantData)
    .expect(201);
  return body as { id: string; slug: string };
}

describe('Tenant Isolation (TC01-TC25)', () => {
  let app: INestApplication;

  let tokensA: AuthTokens;
  let tokensB: AuthTokens;
  let tenantAId: string;
  let tenantBId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();

    const resA = await registerAndLogin(app, USER_A);
    tokensA = resA.tokens;
    const resB = await registerAndLogin(app, USER_B);
    tokensB = resB.tokens;

    const tA = await createTenant(app, tokensA, TENANT_A);
    tenantAId = tA.id;
    const tB = await createTenant(app, tokensB, TENANT_B);
    tenantBId = tB.id;
  });

  afterAll(async () => {
    await app.close();
  });

  // TC01: User in Tenant A cannot list members of Tenant B
  it('TC01: User A cannot list Tenant B members', async () => {
    await request(app.getHttpServer())
      .get(`/v1/tenants/${tenantBId}/members`)
      .set('Authorization', `Bearer ${tokensA.accessToken}`)
      .set('x-tenant-slug', TENANT_B.slug)
      .expect(403);
  });

  // TC02: User A cannot update Tenant B settings
  it('TC02: User A cannot update Tenant B settings', async () => {
    await request(app.getHttpServer())
      .patch(`/v1/tenants/${tenantBId}/settings`)
      .set('Authorization', `Bearer ${tokensA.accessToken}`)
      .set('x-tenant-slug', TENANT_B.slug)
      .send({ name: 'Hacked Name' })
      .expect(403);
  });

  // TC03: User A cannot read Tenant B feature flags
  it('TC03: User A cannot read Tenant B feature flags', async () => {
    await request(app.getHttpServer())
      .get(`/v1/tenants/${tenantBId}/feature-flags`)
      .set('Authorization', `Bearer ${tokensA.accessToken}`)
      .set('x-tenant-slug', TENANT_B.slug)
      .expect(403);
  });

  // TC04: User A cannot invite members to Tenant B
  it('TC04: User A cannot invite to Tenant B', async () => {
    await request(app.getHttpServer())
      .post(`/v1/tenants/${tenantBId}/members/invite`)
      .set('Authorization', `Bearer ${tokensA.accessToken}`)
      .set('x-tenant-slug', TENANT_B.slug)
      .send({ email: 'victim@test.com', role: 'viewer' })
      .expect(403);
  });

  // TC05: Auth endpoints work without cross-tenant data exposure
  it('TC05: /auth/me does not expose tenant-specific data of other tenants', async () => {
    const { body } = await request(app.getHttpServer())
      .get('/v1/auth/me')
      .set('Authorization', `Bearer ${tokensA.accessToken}`)
      .expect(200);

    // Must not expose any data about Tenant B
    expect(JSON.stringify(body)).not.toContain(tenantBId);
    expect(JSON.stringify(body)).not.toContain(TENANT_B.slug);
    expect(JSON.stringify(body)).not.toContain(USER_B.email);
  });

  // TC06: Unauthenticated requests get 401, not tenant data
  it('TC06: Unauthenticated request returns 401, no data leaked', async () => {
    const res = await request(app.getHttpServer())
      .get(`/v1/tenants/${tenantAId}/members`)
      .expect(401);

    expect(res.body).not.toHaveProperty('data');
  });

  // TC07: User B can still access their own tenant
  it('TC07: User B can access Tenant B without interference', async () => {
    const { body } = await request(app.getHttpServer())
      .get(`/v1/tenants/${tenantBId}/members`)
      .set('Authorization', `Bearer ${tokensB.accessToken}`)
      .set('x-tenant-slug', TENANT_B.slug)
      .expect(200);

    expect(Array.isArray(body)).toBe(true);
  });

  // TC08: Tenant A owner can still access their own tenant
  it('TC08: User A can access Tenant A without interference', async () => {
    const { body } = await request(app.getHttpServer())
      .get(`/v1/tenants/${tenantAId}/members`)
      .set('Authorization', `Bearer ${tokensA.accessToken}`)
      .set('x-tenant-slug', TENANT_A.slug)
      .expect(200);

    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  // TC09: JWT token from Tenant A cannot be used with Tenant B slug header
  it('TC09: Tenant A JWT + Tenant B header = 403', async () => {
    await request(app.getHttpServer())
      .get(`/v1/tenants/${tenantBId}/members`)
      .set('Authorization', `Bearer ${tokensA.accessToken}`)
      .set('x-tenant-slug', TENANT_B.slug)
      .expect(403);
  });

  // TC10: Tenant IDs in path cannot be bypassed via different tenant header
  it('TC10: Correct header but wrong tenantId param = 403', async () => {
    await request(app.getHttpServer())
      .patch(`/v1/tenants/${tenantBId}/settings`)
      .set('Authorization', `Bearer ${tokensA.accessToken}`)
      .set('x-tenant-slug', TENANT_A.slug) // correct tenant in header
      .send({ name: 'Attempted Injection' })
      .expect(403); // but tenantId in path belongs to B → 403
  });
});
