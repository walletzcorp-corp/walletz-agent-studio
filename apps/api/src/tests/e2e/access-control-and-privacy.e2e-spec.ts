/**
 * Authentication, role escalation, LGPD, WhatsApp account ownership, OAuth state and the real
 * outbound workers (inbox / campaigns), all against the real app, database and queues.
 */
import { createHmac } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { and, eq } from 'drizzle-orm';
import request from 'supertest';
import {
  auditLogs,
  calendarConnections,
  campaignRecipients,
  campaigns,
  contactIdentities,
  contacts,
  conversations,
  memberships,
  messages,
  users,
  whatsappAccounts,
  whatsappMessageLogs,
  calendarMeetings,
} from '../../database/schema';
import { createId } from '../../database/utils/id';
import {
  bootstrapE2E,
  leaks,
  snapshotTenant,
  type E2EContext,
  type TenantFixture,
} from './harness';

describe('Access control, privacy and outbound workers', () => {
  let ctx: E2EContext;
  let A: TenantFixture;
  let B: TenantFixture;
  let jwt: JwtService;
  let ipCounter = 0;

  const api = () => request(ctx.app.getHttpServer());
  /** Every call gets its own client IP so the per-route throttles stay out of the way. */
  const fresh = (req: request.Test) =>
    req.set('X-Forwarded-For', `10.99.${Math.floor(++ipCounter / 250)}.${ipCounter % 250}`);
  const auth = (req: request.Test, token: string) => req.set('Authorization', `Bearer ${token}`);

  beforeAll(async () => {
    ctx = await bootstrapE2E();
    A = ctx.A;
    B = ctx.B;
    jwt = ctx.app.get(JwtService);
  });

  afterAll(async () => {
    await ctx.close();
  });

  async function waitFor<T>(
    read: () => Promise<T | undefined | false>,
    timeoutMs = 15_000,
  ): Promise<T> {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const value = await read();
      if (value) return value;
      if (Date.now() > deadline) throw new Error('timed out waiting for the worker');
      await new Promise((r) => setTimeout(r, 150));
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  describe('authentication and sessions', () => {
    const login = (email: string, password: string) =>
      fresh(api().post('/api/v1/auth/login')).send({ email, password });

    it('login returns tokens and the sessionId used for refresh', async () => {
      const res = await login(A.users.viewer.email, A.users.viewer.password);
      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
          sessionId: expect.any(String),
        }),
      );
    });

    it('wrong password and unknown e-mail are indistinguishable (no user enumeration)', async () => {
      const wrong = await login(A.users.viewer.email, 'Wrong-password-1!');
      const unknown = await login('nobody@e2e.test', 'Wrong-password-1!');
      expect(wrong.status).toBe(401);
      expect(unknown.status).toBe(401);
      expect(wrong.body.message).toBe(unknown.body.message);
    });

    it('tokens that are forged, signed with another secret, or signed with the refresh secret are rejected', async () => {
      const payload = { sub: A.users.owner.id, email: A.users.owner.email, sessionId: 'x' };
      const wrongSecret = await jwt.signAsync(payload, {
        secret: 'attacker-secret',
        expiresIn: '5m',
      });
      const refreshSecret = await jwt.signAsync(payload, {
        secret: process.env['JWT_REFRESH_SECRET']!,
        expiresIn: '5m',
      });
      for (const token of [wrongSecret, refreshSecret, 'a.b.c', '']) {
        const res = await auth(api().get(`/api/v1/tenants/${A.id}/agents`), token || 'x');
        expect(res.status).toBe(401);
      }
    });

    it('an expired access token is rejected', async () => {
      const real = (await login(A.users.operator.email, A.users.operator.password)).body as {
        sessionId: string;
      };
      const expired = await jwt.signAsync(
        { sub: A.users.operator.id, email: A.users.operator.email, sessionId: real.sessionId },
        { secret: process.env['JWT_ACCESS_SECRET']!, expiresIn: -60 },
      );
      expect((await auth(api().get(`/api/v1/tenants/${A.id}/agents`), expired)).status).toBe(401);
    });

    it('a valid token for a session that does not exist is rejected', async () => {
      const ghost = await jwt.signAsync(
        { sub: A.users.owner.id, email: A.users.owner.email, sessionId: createId() },
        { secret: process.env['JWT_ACCESS_SECRET']!, expiresIn: '5m' },
      );
      expect((await auth(api().get(`/api/v1/tenants/${A.id}/agents`), ghost)).status).toBe(401);
    });

    it('logout revokes the session: the token stops working immediately', async () => {
      const session = (await login(A.users.viewer.email, A.users.viewer.password)).body as {
        accessToken: string;
      };
      expect(
        (await auth(api().get(`/api/v1/tenants/${A.id}/agents`), session.accessToken)).status,
      ).toBe(200);
      expect(
        (await auth(fresh(api().post('/api/v1/auth/logout')), session.accessToken)).status,
      ).toBe(204);
      expect(
        (await auth(api().get(`/api/v1/tenants/${A.id}/agents`), session.accessToken)).status,
      ).toBe(401);
    });

    it("refresh rotates the token, and a refresh token cannot be used with someone else's session", async () => {
      const mine = (await login(B.users.viewer.email, B.users.viewer.password)).body as {
        refreshToken: string;
        sessionId: string;
      };
      const theirs = (await login(A.users.viewer.email, A.users.viewer.password)).body as {
        sessionId: string;
      };

      const stolen = await fresh(api().post('/api/v1/auth/refresh')).send({
        refreshToken: mine.refreshToken,
        sessionId: theirs.sessionId,
      });
      expect(stolen.status).toBe(401);

      const ok = await fresh(api().post('/api/v1/auth/refresh')).send({
        refreshToken: mine.refreshToken,
        sessionId: mine.sessionId,
      });
      expect(ok.status).toBe(200);
      const replay = await fresh(api().post('/api/v1/auth/refresh')).send({
        refreshToken: mine.refreshToken,
        sessionId: mine.sessionId,
      });
      expect(replay.status).toBe(401); // the old refresh token is dead after rotation
    });

    it('tenant/role claims inside a (validly signed) token grant nothing: membership decides', async () => {
      const real = (await login(A.users.viewer.email, A.users.viewer.password)).body as {
        sessionId: string;
      };
      const forged = await jwt.signAsync(
        {
          sub: A.users.viewer.id,
          email: A.users.viewer.email,
          sessionId: real.sessionId,
          tenantId: B.id,
          role: 'owner',
        },
        { secret: process.env['JWT_ACCESS_SECRET']!, expiresIn: '5m' },
      );
      expect((await auth(api().get(`/api/v1/tenants/${B.id}/agents`), forged)).status).toBe(403);
      expect(
        (await auth(api().delete(`/api/v1/tenants/${A.id}/agents/${A.agentId}`), forged)).status,
      ).toBe(403); // still only a viewer in A
    });

    it('a suspended membership loses access immediately, a restored one gets it back', async () => {
      const [row] = await ctx.db
        .select()
        .from(memberships)
        .where(eq(memberships.id, A.users.operator.membershipId));
      expect(row!.status).toBe('active');
      await ctx.db
        .update(memberships)
        .set({ status: 'suspended' })
        .where(eq(memberships.id, A.users.operator.membershipId));
      expect(
        (await auth(api().get(`/api/v1/tenants/${A.id}/agents`), A.users.operator.token)).status,
      ).toBe(403);
      await ctx.db
        .update(memberships)
        .set({ status: 'active' })
        .where(eq(memberships.id, A.users.operator.membershipId));
      expect(
        (await auth(api().get(`/api/v1/tenants/${A.id}/agents`), A.users.operator.token)).status,
      ).toBe(200);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  describe('role escalation inside a tenant', () => {
    const invite = (t: TenantFixture, token: string, role: string) =>
      auth(api().post(`/api/v1/tenants/${t.id}/members/invite`), token).send({
        email: `inv-${createId()}@e2e.test`,
        role,
      });
    const setRole = (t: TenantFixture, token: string, membershipId: string, role: string) =>
      auth(api().patch(`/api/v1/tenants/${t.id}/members/${membershipId}/role`), token).send({
        role,
      });

    it('only an owner can invite an admin', async () => {
      expect((await invite(B, B.users.admin.token, 'admin')).status).toBe(403);
      expect((await invite(B, B.users.operator.token, 'viewer')).status).toBe(403);
      expect((await invite(B, B.users.admin.token, 'manager')).status).toBe(201);
      expect((await invite(B, B.users.owner.token, 'admin')).status).toBe(201);
    });

    it('an invite token is stored hashed, never in clear', async () => {
      const res = await invite(B, B.users.owner.token, 'viewer');
      expect(res.status).toBe(201);
      expect(res.body).not.toHaveProperty('inviteToken');
      const [row] = await ctx.db
        .select()
        .from(memberships)
        .where(eq(memberships.id, (res.body as { id: string }).id));
      // A sha256 hex digest (64 chars): it can not be replayed as the e-mailed token.
      expect(row!.inviteToken).toMatch(/^[a-f0-9]{64}$/);
    });

    it('an admin cannot promote, demote or remove another admin, nor change their own role; an owner can', async () => {
      // second admin inside B, created by the owner
      const peerUser = createId();
      const peerMembership = createId();
      await ctx.db.insert(users).values({ id: peerUser, email: `peer-${createId()}@e2e.test` });
      await ctx.db
        .insert(memberships)
        .values({
          id: peerMembership,
          tenantId: B.id,
          userId: peerUser,
          role: 'admin',
          status: 'active',
        });

      expect((await setRole(B, B.users.admin.token, peerMembership, 'viewer')).status).toBe(403);
      expect(
        (await setRole(B, B.users.admin.token, B.users.admin.membershipId, 'manager')).status,
      ).toBe(403); // self
      expect(
        (await setRole(B, B.users.admin.token, B.users.owner.membershipId, 'viewer')).status,
      ).toBe(403); // owner
      expect(
        (
          await auth(
            api().delete(`/api/v1/tenants/${B.id}/members/${peerMembership}`),
            B.users.admin.token,
          )
        ).status,
      ).toBe(403);

      expect((await setRole(B, B.users.owner.token, peerMembership, 'manager')).status).toBe(200);
      expect(
        (
          await auth(
            api().delete(`/api/v1/tenants/${B.id}/members/${peerMembership}`),
            B.users.owner.token,
          )
        ).status,
      ).toBe(204);
    });

    it('the owner cannot be removed or demoted by anyone', async () => {
      expect(
        (
          await auth(
            api().delete(`/api/v1/tenants/${B.id}/members/${B.users.owner.membershipId}`),
            B.users.owner.token,
          )
        ).status,
      ).toBe(409);
      expect(
        (await setRole(B, B.users.owner.token, B.users.owner.membershipId, 'viewer')).status,
      ).toBe(403);
    });

    it('role changes are validated and mass-assignment of privileged fields is rejected', async () => {
      expect(
        (await setRole(B, B.users.owner.token, B.users.viewer.membershipId, 'superuser')).status,
      ).toBe(400);
      expect(
        (await setRole(B, B.users.owner.token, B.users.viewer.membershipId, 'owner')).status,
      ).toBe(400);
      const res = await auth(
        api().patch(`/api/v1/tenants/${B.id}/settings`),
        B.users.admin.token,
      ).send({ name: 'ok', status: 'active', planId: 'enterprise' });
      expect(res.status).toBe(400);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  describe('input hardening', () => {
    it('boolean flags must be real booleans: the string "false" can no longer grant access or consent', async () => {
      const perm = await auth(
        api().post(`/api/v1/tenants/${B.id}/agents/${B.agentId}/tool-permissions`),
        B.users.admin.token,
      ).send({ toolName: 'schedule_appointment', allowed: 'false' });
      expect(perm.status).toBe(400);

      const settings = await auth(
        api().patch(`/api/v1/tenants/${B.id}/calendars/agents/${B.agentId}/settings`),
        B.users.admin.token,
      ).send({ canSchedule: 'false' });
      expect(settings.status).toBe(400);

      const imported = await auth(
        api().post(`/api/v1/tenants/${B.id}/contacts/import/json`),
        B.users.admin.token,
      ).send({
        contacts: [{ firstName: 'X', phone: '+5511900001111', hasWhatsappConsent: 'false' }],
      });
      expect(imported.status).toBe(400);
    });

    it.each([
      ['limit=-1'],
      ['limit=0'],
      ['limit=100000'],
      ['limit=abc'],
      ['offset=-5'],
      ['limit=10&offset=x'],
    ])('invalid pagination "%s" is a 400, not a crash or a data dump', async (query) => {
      for (const path of ['contacts', 'conversations']) {
        const res = await auth(
          api().get(`/api/v1/tenants/${B.id}/${path}?${query}`),
          B.users.viewer.token,
        );
        expect(res.status).toBe(400);
      }
    });

    it('conversation filters are applied and validated', async () => {
      const ok = await auth(
        api().get(`/api/v1/tenants/${B.id}/conversations?status=open`),
        B.users.viewer.token,
      );
      expect(ok.status).toBe(200);
      expect((ok.body as Array<{ status: string }>).every((c) => c.status === 'open')).toBe(true);
      expect(
        (
          await auth(
            api().get(`/api/v1/tenants/${B.id}/conversations?status=hacked`),
            B.users.viewer.token,
          )
        ).status,
      ).toBe(400);
    });

    it('a contact import over the row limit is rejected', async () => {
      const rows = Array.from({ length: 5001 }, (_, i) => ({ firstName: `n${i}` }));
      const res = await auth(
        api().post(`/api/v1/tenants/${B.id}/contacts/import/json`),
        B.users.admin.token,
      ).send({ contacts: rows });
      expect([400, 413]).toContain(res.status); // never a 500
    });

    it('the Meta webhook verification only answers to the right verify token', async () => {
      const bad = await api().get(
        '/api/v1/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=nope&hub.challenge=42',
      );
      expect(bad.status).toBe(401);
      const good = await api().get(
        `/api/v1/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=${process.env['WHATSAPP_WEBHOOK_VERIFY_TOKEN']}&hub.challenge=42`,
      );
      expect(good.status).toBe(200);
      expect(good.text).toBe('42');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  describe('LGPD: access (export) and erasure', () => {
    async function makeSubject(t: TenantFixture) {
      const contactId = createId();
      const phone = `+55${Math.floor(1e10 + Math.random() * 9e10)}`;
      await ctx.db
        .insert(contacts)
        .values({
          id: contactId,
          tenantId: t.id,
          firstName: `${t.key}_SUBJECT`,
          lastName: 'Titular',
        });
      await ctx.db
        .insert(contactIdentities)
        .values({
          id: createId(),
          contactId,
          tenantId: t.id,
          channel: 'whatsapp',
          value: phone,
          normalizedValue: phone,
        });
      const conversationId = createId();
      await ctx.db
        .insert(conversations)
        .values({ id: conversationId, tenantId: t.id, contactId, channel: 'whatsapp' });
      await ctx.db
        .insert(messages)
        .values({
          id: createId(),
          conversationId,
          tenantId: t.id,
          direction: 'inbound',
          content: { text: `${t.key}_PII_MESSAGE` },
        });
      await ctx.db
        .insert(whatsappMessageLogs)
        .values({
          id: createId(),
          tenantId: t.id,
          accountId: t.whatsappAccountId,
          direction: 'inbound',
          from: phone,
          content: { text: `${t.key}_PII_LOG` },
          contactId,
        });
      await ctx.db
        .insert(calendarMeetings)
        .values({
          id: createId(),
          tenantId: t.id,
          contactId,
          title: `${t.key}_SUBJECT_MEETING`,
          contactName: 'Titular',
          contactEmail: `titular-${t.key}@e2e.test`,
          startAt: new Date(Date.now() + 9e8),
          endAt: new Date(Date.now() + 9e8 + 1.8e6),
        });
      return { contactId, phone, conversationId };
    }

    it('an admin exports everything about a data subject, including the messages, and nothing of other tenants', async () => {
      const s = await makeSubject(A);
      const res = await auth(
        api().get(`/api/v1/tenants/${A.id}/privacy/contacts/${s.contactId}/export`),
        A.users.admin.token,
      );
      expect(res.status).toBe(200);
      const body = res.body as {
        messageCount: number;
        messages: Array<{ content: { text: string } }>;
        identities: unknown[];
      };
      expect(body.messageCount).toBe(1);
      expect(body.messages[0]!.content.text).toBe('A_PII_MESSAGE');
      expect(body.identities).toHaveLength(1);
      expect(leaks(res.body, B.secrets)).toEqual([]);
    });

    it('only admin/owner can export, and a foreign contact id is a 404', async () => {
      const s = await makeSubject(A);
      expect(
        (
          await auth(
            api().get(`/api/v1/tenants/${A.id}/privacy/contacts/${s.contactId}/export`),
            A.users.operator.token,
          )
        ).status,
      ).toBe(403);
      expect(
        (
          await auth(
            api().get(`/api/v1/tenants/${B.id}/privacy/contacts/${s.contactId}/export`),
            B.users.admin.token,
          )
        ).status,
      ).toBe(404);
    });

    it("erasure removes the subject's personal data everywhere, keeps the audit trail, and never touches another tenant", async () => {
      const s = await makeSubject(A);
      const beforeB = await snapshotTenant(ctx.db, B.id);

      const res = await auth(
        api().delete(`/api/v1/tenants/${A.id}/privacy/contacts/${s.contactId}`),
        A.users.admin.token,
      ).send({ reason: 'pedido do titular' });
      expect(res.status).toBe(200);

      const [contact] = await ctx.db.select().from(contacts).where(eq(contacts.id, s.contactId));
      expect(contact!.firstName).toBe('[removido]');
      expect(contact!.deletedAt).not.toBeNull();
      expect(
        await ctx.db
          .select()
          .from(contactIdentities)
          .where(eq(contactIdentities.contactId, s.contactId)),
      ).toHaveLength(0);
      const msgs = await ctx.db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, s.conversationId));
      expect(JSON.stringify(msgs)).not.toContain('A_PII_MESSAGE');
      const logs = await ctx.db
        .select()
        .from(whatsappMessageLogs)
        .where(eq(whatsappMessageLogs.contactId, s.contactId));
      expect(JSON.stringify(logs)).not.toContain('A_PII_LOG');
      expect(logs.every((l) => l.from === null)).toBe(true);
      const meetingRows = await ctx.db
        .select()
        .from(calendarMeetings)
        .where(eq(calendarMeetings.contactId, s.contactId));
      expect(meetingRows.every((m) => m.contactEmail === null && m.contactName === null)).toBe(
        true,
      );

      const audit = await ctx.db
        .select()
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.resourceId, s.contactId),
            eq(auditLogs.action, 'privacy.contact_anonymized'),
          ),
        );
      expect(audit.length).toBeGreaterThan(0);
      expect(await snapshotTenant(ctx.db, B.id)).toEqual(beforeB);
    });

    it('erasing a contact id that belongs to another tenant fails and changes nothing there', async () => {
      const s = await makeSubject(B);
      const before = await snapshotTenant(ctx.db, B.id);
      const res = await auth(
        api().delete(`/api/v1/tenants/${A.id}/privacy/contacts/${s.contactId}`),
        A.users.owner.token,
      ).send({});
      expect(res.status).toBe(404);
      expect(await snapshotTenant(ctx.db, B.id)).toEqual(before);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  describe('WhatsApp number ownership and secrets', () => {
    const connect = (t: TenantFixture, phoneNumberId: string) =>
      auth(api().post(`/api/v1/tenants/${t.id}/whatsapp/accounts`), t.users.admin.token).send({
        phoneNumberId,
        wabaId: 'WABA-NEW',
        accessToken: 'EAA_PLAINTEXT_TOKEN_SHOULD_NEVER_COME_BACK',
        verifyToken: 'verify-new',
        webhookUrl: 'https://example.test/webhook/whatsapp',
      });

    it('a number registered by another tenant cannot be taken over', async () => {
      expect((await connect(B, A.phoneNumberId)).status).toBe(409);
      const [row] = await ctx.db
        .select()
        .from(whatsappAccounts)
        .where(eq(whatsappAccounts.phoneNumberId, A.phoneNumberId));
      expect(row!.tenantId).toBe(A.id);
    });

    it('a number a tenant disconnected is STILL owned by it: nobody else can claim it, it can reconnect', async () => {
      const pnid = `PNID_REUSE_${createId()}`;
      expect((await connect(A, pnid)).status).toBe(201);
      const [acc] = await ctx.db
        .select()
        .from(whatsappAccounts)
        .where(eq(whatsappAccounts.phoneNumberId, pnid));
      expect(
        (
          await auth(
            api().delete(`/api/v1/tenants/${A.id}/whatsapp/accounts/${acc!.id}`),
            A.users.admin.token,
          )
        ).status,
      ).toBe(204);

      expect((await connect(B, pnid)).status).toBe(409); // soft-deleted rows still own the number
      const again = await connect(A, pnid);
      expect(again.status).toBe(201);
      const [revived] = await ctx.db
        .select()
        .from(whatsappAccounts)
        .where(eq(whatsappAccounts.phoneNumberId, pnid));
      expect(revived!.tenantId).toBe(A.id);
      expect(revived!.deletedAt).toBeNull();
    });

    it('credentials never come back to the client and are stored encrypted', async () => {
      const pnid = `PNID_SECRET_${createId()}`;
      const res = await connect(B, pnid);
      expect(res.status).toBe(201);
      expect(JSON.stringify(res.body)).not.toContain('EAA_PLAINTEXT_TOKEN');
      expect(res.body).not.toHaveProperty('accessToken');
      expect(res.body).not.toHaveProperty('verifyToken');
      const [row] = await ctx.db
        .select()
        .from(whatsappAccounts)
        .where(eq(whatsappAccounts.phoneNumberId, pnid));
      expect(row!.accessToken).not.toContain('EAA_PLAINTEXT_TOKEN');

      const list = await auth(
        api().get(`/api/v1/tenants/${B.id}/whatsapp/accounts`),
        B.users.viewer.token,
      );
      expect(JSON.stringify(list.body)).not.toMatch(/accessToken|verifyToken|appSecret/);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  describe('calendar OAuth state', () => {
    const SECRET = () => process.env['CALENDAR_OAUTH_STATE_SECRET']!;
    const stateFor = (payload: Record<string, unknown>, secret = SECRET()) => {
      const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
      return `${encoded}.${createHmac('sha256', secret).update(encoded).digest('hex')}`;
    };
    const callback = (state: string) =>
      api().get(`/api/v1/tenants/callback/google?code=abc&state=${encodeURIComponent(state)}`);
    const connections = async (tenantId: string) =>
      (
        await ctx.db
          .select()
          .from(calendarConnections)
          .where(eq(calendarConnections.tenantId, tenantId))
      ).length;

    it('forged, wrongly-signed, default-secret and expired states never create a connection', async () => {
      const before = await connections(A.id);
      const beforeB = await connections(B.id);
      const fresh = {
        tenantId: A.id,
        userId: A.users.admin.id,
        provider: 'google',
        ts: Date.now(),
      };
      const states = [
        'garbage',
        'a.b',
        stateFor(fresh, 'dev-state-secret-change-in-prod'), // the old guessable default
        stateFor(fresh, 'attacker'),
        stateFor({ ...fresh, ts: Date.now() - 11 * 60 * 1000 }), // properly signed but expired
        `${Buffer.from(JSON.stringify({ ...fresh, tenantId: B.id })).toString('base64url')}.${createHmac('sha256', SECRET()).update('x').digest('hex')}`, // tampered payload
      ];
      for (const state of states) {
        const res = await callback(state);
        expect(res.status).toBe(302);
        expect(res.headers['location']).toContain('error=');
      }
      expect(await connections(A.id)).toBe(before);
      expect(await connections(B.id)).toBe(beforeB);
    });

    it('authorize embeds tenant and user in a signed state and rejects unknown providers', async () => {
      const res = await auth(
        api().get(`/api/v1/tenants/${A.id}/calendars/google/authorize`),
        A.users.admin.token,
      );
      expect(res.status).toBe(302);
      const state = new URL(res.headers['location']!).searchParams.get('state')!;
      const [encoded, signature] = state.split('.');
      expect(signature).toBe(createHmac('sha256', SECRET()).update(encoded!).digest('hex'));
      const payload = JSON.parse(Buffer.from(encoded!, 'base64url').toString('utf8')) as {
        tenantId: string;
        userId: string;
        nonce: string;
      };
      expect(payload.tenantId).toBe(A.id);
      expect(payload.userId).toBe(A.users.admin.id);
      expect(payload.nonce).toBeTruthy();

      expect(
        (
          await auth(
            api().get(`/api/v1/tenants/${A.id}/calendars/evil/authorize`),
            A.users.admin.token,
          )
        ).status,
      ).toBe(400);
      expect(
        (
          await auth(
            api().get(`/api/v1/tenants/${A.id}/calendars/google/authorize`),
            A.users.operator.token,
          )
        ).status,
      ).toBe(403);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  describe('outbound workers send through the owning tenant only', () => {
    it('a campaign sends approved templates, only to eligible contacts of its own tenant, via its own number', async () => {
      const create = await auth(
        api().post(`/api/v1/tenants/${B.id}/campaigns`),
        B.users.admin.token,
      ).send({
        name: 'B_LAUNCH',
        segmentId: B.segmentId,
        templateName: 'B_TEMPLATE',
      });
      expect(create.status).toBe(201);
      const campaignId = (create.body as { id: string }).id;

      const eligibility = await auth(
        api().get(`/api/v1/tenants/${B.id}/campaigns/${campaignId}/eligibility`),
        B.users.admin.token,
      );
      expect((eligibility.body as { eligible: number }).eligible).toBe(1);
      expect((eligibility.body as { blocked: number }).blocked).toBeGreaterThanOrEqual(1);
      expect(JSON.stringify(eligibility.body)).toContain('no_consent');

      ctx.http.reset();
      const launch = await auth(
        api().post(`/api/v1/tenants/${B.id}/campaigns/${campaignId}/launch`),
        B.users.admin.token,
      );
      expect(launch.status).toBe(200);

      const done = await waitFor(async () => {
        const [c] = await ctx.db.select().from(campaigns).where(eq(campaigns.id, campaignId));
        return c!.status === 'completed' || c!.status === 'failed' ? c : undefined;
      });
      expect(done.status).toBe('completed');
      expect(done.totalSent).toBe(1);
      expect(done.totalFailed).toBe(0);

      const templates = ctx.http.posts.filter((p) => p.body['type'] === 'template');
      expect(templates).toHaveLength(1);
      expect(templates[0]!.url).toContain(`/${B.phoneNumberId}/messages`);
      expect(templates[0]!.url).not.toContain(A.phoneNumberId);
      expect(String(templates[0]!.body['to']).replace(/\D/g, '')).toBe(
        B.contactPhone.replace(/\D/g, ''),
      );

      const recipients = await ctx.db
        .select()
        .from(campaignRecipients)
        .where(eq(campaignRecipients.campaignId, campaignId));
      expect(recipients).toHaveLength(1);
      expect(recipients[0]!.tenantId).toBe(B.id);
      expect(recipients[0]!.status).toBe('sent');
    });

    it("an operator reply from the inbox is delivered through the tenant's own number and marked sent", async () => {
      ctx.http.reset();
      const conversationId = createId();
      await ctx.db
        .insert(conversations)
        .values({
          id: conversationId,
          tenantId: B.id,
          contactId: B.otherContactId,
          channel: 'whatsapp',
        });

      const res = await auth(
        api().post(`/api/v1/tenants/${B.id}/conversations/${conversationId}/messages`),
        B.users.operator.token,
      ).send({ text: 'Resposta humana' });
      expect(res.status).toBe(201);
      const messageId = (res.body as { id: string }).id;
      expect((res.body as { status: string }).status).toBe('pending');

      const sent = await waitFor(async () => {
        const [m] = await ctx.db.select().from(messages).where(eq(messages.id, messageId));
        return m!.status === 'sent' || m!.status === 'failed' ? m : undefined;
      });
      expect(sent.status).toBe('sent');
      expect(sent.providerMessageId).toMatch(/^wamid\.E2E\./);

      const texts = ctx.http.outboundTexts();
      expect(texts).toHaveLength(1);
      expect(texts[0]!.phoneNumberId).toBe(B.phoneNumberId);
      expect(texts[0]!.text).toBe('Resposta humana');
      expect(texts[0]!.to.replace(/\D/g, '')).toBe(B.otherContactPhone.replace(/\D/g, ''));
    });

    it("a viewer cannot send, and nobody can send into another tenant's conversation", async () => {
      const conversationId = createId();
      await ctx.db
        .insert(conversations)
        .values({
          id: conversationId,
          tenantId: A.id,
          contactId: A.otherContactId,
          channel: 'whatsapp',
        });
      ctx.http.reset();
      expect(
        (
          await auth(
            api().post(`/api/v1/tenants/${A.id}/conversations/${conversationId}/messages`),
            A.users.viewer.token,
          ).send({ text: 'x' })
        ).status,
      ).toBe(403);
      expect(
        (
          await auth(
            api().post(`/api/v1/tenants/${B.id}/conversations/${conversationId}/messages`),
            B.users.operator.token,
          ).send({ text: 'x' })
        ).status,
      ).toBe(404);
      expect(ctx.http.posts).toHaveLength(0);
    });
  });
});
