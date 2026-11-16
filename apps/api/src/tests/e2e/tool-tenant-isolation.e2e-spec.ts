/**
 * Every tool an agent can call, executed for tenant A and tenant B with the OTHER tenant's
 * resource ids. Tools only ever receive a server-built context; nothing a model can put in a
 * tool input may widen it. Also covers the PC connector (device auth, command state machine,
 * server-side capability / folder enforcement) and tenant-scoped RAG.
 */
import { createHash } from 'crypto';
import { and, eq } from 'drizzle-orm';
import request from 'supertest';
import { calendarMeetings, knowledgeChunks, pcCommands, pcDevices } from '../../database/schema';
import { createId } from '../../database/utils/id';
import {
  createExecutionContext,
  type AgentExecutionContext,
} from '../../modules/agents/execution-context';
import { SCHEDULING_TOOL_NAMES, isToolAllowed } from '../../modules/agents/tool-policy';
import { SchedulingToolsService } from '../../modules/calendars/scheduling-tools.service';
import { LabService } from '../../modules/lab/lab.service';
import { PcConnectorService } from '../../modules/pc-connector/pc-connector.service';
import { bootstrapE2E, leaks, say, type E2EContext, type TenantFixture } from './harness';

const PC_TOOLS = [
  'pc.listFiles',
  'pc.readFile',
  'pc.createFile',
  'pc.createFolder',
  'pc.renameFile',
  'pc.moveFile',
  'pc.openApplication',
  'pc.openUrl',
  'pc.getDeviceInfo',
];

describe('Tool tenant isolation', () => {
  let ctx: E2EContext;
  let A: TenantFixture;
  let B: TenantFixture;
  let tools: SchedulingToolsService;
  let pc: PcConnectorService;
  let lab: LabService;

  const external = (t: TenantFixture, contactId = t.contactId): AgentExecutionContext =>
    createExecutionContext({
      tenantId: t.id,
      agentId: t.publishedAgentId,
      channel: 'whatsapp',
      source: 'external_contact',
      conversationId: t.conversationId,
      contactId,
    });

  const internal = (t: TenantFixture): AgentExecutionContext =>
    createExecutionContext({
      tenantId: t.id,
      agentId: t.publishedAgentId,
      channel: 'lab',
      source: 'internal_user',
      userId: t.users.owner.id,
    });

  const meeting = async (id: string) =>
    (await ctx.db.select().from(calendarMeetings).where(eq(calendarMeetings.id, id)))[0];

  beforeAll(async () => {
    ctx = await bootstrapE2E();
    A = ctx.A;
    B = ctx.B;
    tools = ctx.app.get(SchedulingToolsService);
    pc = ctx.app.get(PcConnectorService);
    lab = ctx.app.get(LabService);
  });

  afterAll(async () => {
    await ctx.close();
  });

  beforeEach(() => {
    ctx.llm.reset();
  });

  // ── execution context + policy ────────────────────────────────────────────

  describe('execution context and tool policy', () => {
    it('the context is immutable and cannot be built without a tenant, or for a contact without ids', () => {
      const c = external(A);
      expect(Object.isFrozen(c)).toBe(true);
      expect(() => {
        (c as { tenantId: string }).tenantId = B.id;
      }).toThrow();
      expect(() =>
        createExecutionContext({
          tenantId: '',
          agentId: 'x',
          channel: 'lab',
          source: 'internal_user',
          userId: 'u',
        }),
      ).toThrow();
      expect(() =>
        createExecutionContext({
          tenantId: A.id,
          agentId: 'x',
          channel: 'whatsapp',
          source: 'external_contact',
        }),
      ).toThrow();
    });

    it.each(SCHEDULING_TOOL_NAMES.map((n) => [n]))(
      'scheduling tool %s is allowed in every context',
      (name) => {
        expect(isToolAllowed(name, external(A))).toBe(true);
        expect(isToolAllowed(name, internal(A))).toBe(true);
      },
    );

    it.each(PC_TOOLS.map((n) => [n]))(
      'PC tool %s is internal-lab only, never for an external contact',
      (name) => {
        expect(isToolAllowed(name, external(A))).toBe(false);
        expect(isToolAllowed(name, external(B))).toBe(false);
        expect(isToolAllowed(name, internal(A))).toBe(true);
      },
    );

    it.each([['send_message'], ['lookup_contact'], ['sql.query'], ['read_env'], ['']])(
      'unknown tool "%s" is denied everywhere',
      (name) => {
        expect(isToolAllowed(name, external(A))).toBe(false);
        expect(isToolAllowed(name, internal(A))).toBe(false);
      },
    );

    it('dispatch refuses unknown tools', async () => {
      await expect(tools.dispatch('drop_database', {}, external(A))).rejects.toThrow();
    });
  });

  // ── scheduling tools × tenants × crossed ids ──────────────────────────────

  describe.each([
    ['A', () => A, () => B],
    ['B', () => B, () => A],
  ])('tenant %s agent vs the other tenant', (_name, own, other) => {
    it("find_meetings (external) returns only the caller's own meetings, whatever the input says", async () => {
      const mine = own();
      const foreign = other();
      for (const input of [
        {},
        { status: 'all' },
        { tenant_id: foreign.id, tenantId: foreign.id },
        { contact_id: foreign.contactId, conversation_id: foreign.conversationId },
        { limit: 1000, all: true },
      ]) {
        const out = (await tools.dispatch('find_meetings', input, external(mine))) as {
          meetings: Array<{ id: string }>;
        };
        expect(out.meetings.map((m) => m.id)).toEqual([mine.meetingId]);
        expect(leaks(out, [...foreign.secrets, mine.otherMeetingId])).toEqual([]);
      }
    });

    it('find_meetings (external) for a contact without meetings returns nothing, never the tenant', async () => {
      const mine = own();
      const stranger = createId();
      const strangerCtx = createExecutionContext({
        tenantId: mine.id,
        agentId: mine.publishedAgentId,
        channel: 'whatsapp',
        source: 'external_contact',
        conversationId: createId(),
        contactId: stranger,
      });
      const out = (await tools.dispatch('find_meetings', {}, strangerCtx)) as {
        meetings: unknown[];
      };
      expect(out.meetings).toEqual([]);
    });

    it('find_meetings (internal lab) sees its own tenant and nothing of the other', async () => {
      const mine = own();
      const out = (await tools.dispatch('find_meetings', {}, internal(mine))) as {
        meetings: Array<{ id: string }>;
      };
      expect(out.meetings.map((m) => m.id).sort()).toEqual(
        [mine.meetingId, mine.otherMeetingId].sort(),
      );
      expect(leaks(out, other().secrets)).toEqual([]);
    });

    it('find_meetings never returns descriptions, e-mails or attendee data', async () => {
      const mine = own();
      const out = JSON.stringify(await tools.dispatch('find_meetings', {}, internal(mine)));
      expect(out).not.toMatch(/@tenant-/);
      expect(out).not.toContain('DESCRIPTION_SECRET');
    });

    it('get_availability reveals no meeting details of anyone', async () => {
      const mine = own();
      const out = JSON.stringify(
        await tools.dispatch(
          'get_availability',
          { tenant_id: other().id, days_ahead: 30 },
          external(mine),
        ),
      );
      expect(leaks(out, [...other().secrets, ...mine.secrets])).toEqual([]);
    });

    it('reschedule/cancel with a meeting id of the OTHER tenant fails and changes nothing', async () => {
      const mine = own();
      const foreign = other();
      const before = await meeting(foreign.meetingId);
      for (const ctxx of [external(mine), internal(mine)]) {
        await expect(
          tools.dispatch(
            'reschedule_meeting',
            {
              meeting_id: foreign.meetingId,
              new_start_at: '2031-01-01T10:00:00Z',
              new_end_at: '2031-01-01T10:30:00Z',
            },
            ctxx,
          ),
        ).rejects.toThrow(/not found/i);
        await expect(
          tools.dispatch('cancel_meeting', { meeting_id: foreign.meetingId }, ctxx),
        ).rejects.toThrow(/not found/i);
      }
      expect(await meeting(foreign.meetingId)).toEqual(before);
    });

    it("an external contact cannot touch another contact's meeting of the same tenant", async () => {
      const mine = own();
      const before = await meeting(mine.otherMeetingId);
      await expect(
        tools.dispatch('cancel_meeting', { meeting_id: mine.otherMeetingId }, external(mine)),
      ).rejects.toThrow(/not found/i);
      await expect(
        tools.dispatch(
          'reschedule_meeting',
          {
            meeting_id: mine.otherMeetingId,
            new_start_at: '2031-02-01T10:00:00Z',
            new_end_at: '2031-02-01T10:30:00Z',
          },
          external(mine),
        ),
      ).rejects.toThrow(/not found/i);
      expect(await meeting(mine.otherMeetingId)).toEqual(before);
    });

    it('create_meeting is bound to the server-side context; injected tenant/contact fields are ignored', async () => {
      const mine = own();
      const foreign = other();
      const start = new Date(Date.now() + 25 * 24 * 60 * 60 * 1000);
      start.setUTCHours(12, 15, 0, 0);
      const title = `ctx-bound-${mine.key}-${createId()}`;
      await tools.dispatch(
        'create_meeting',
        {
          start_at: start.toISOString(),
          end_at: new Date(start.getTime() + 1_800_000).toISOString(),
          title,
          tenant_id: foreign.id,
          tenantId: foreign.id,
          contact_id: foreign.contactId,
          conversation_id: foreign.conversationId,
          agent_id: foreign.publishedAgentId,
        },
        external(mine),
      );
      const [row] = await ctx.db
        .select()
        .from(calendarMeetings)
        .where(eq(calendarMeetings.title, title));
      expect(row!.tenantId).toBe(mine.id);
      expect(row!.contactId).toBe(mine.contactId);
      expect(row!.conversationId).toBe(mine.conversationId);
      expect(row!.agentId).toBe(mine.publishedAgentId);
      expect(row!.status).toBe('pending'); // no provider event id => never "confirmed"
      expect(row!.externalEventId).toBeNull();
    });

    it('an internal user rescheduling inside its own tenant works and keeps the contact link', async () => {
      const mine = own();
      // A local-only meeting (no provider event), so no external calendar call is involved.
      const localId = createId();
      const base = new Date(Date.now() + 27 * 24 * 60 * 60 * 1000);
      base.setUTCHours(8, 0, 0, 0);
      await ctx.db.insert(calendarMeetings).values({
        id: localId,
        tenantId: mine.id,
        agentId: mine.publishedAgentId,
        contactId: mine.otherContactId,
        conversationId: mine.conversationId,
        title: `${mine.key}_LOCAL_MEETING`,
        status: 'pending',
        startAt: base,
        endAt: new Date(base.getTime() + 1_800_000),
      });

      const start = new Date(base.getTime() + 24 * 60 * 60 * 1000);
      const out = (await tools.dispatch(
        'reschedule_meeting',
        {
          meeting_id: localId,
          new_start_at: start.toISOString(),
          new_end_at: new Date(start.getTime() + 1_800_000).toISOString(),
        },
        internal(mine),
      )) as { meeting: { id: string } };

      const original = await meeting(localId);
      const moved = await meeting(out.meeting.id);
      expect(original!.status).toBe('rescheduled');
      expect(moved!.contactId).toBe(mine.otherContactId);
      expect(moved!.conversationId).toBe(mine.conversationId);
      expect(moved!.tenantId).toBe(mine.id);
      expect(moved!.rescheduledFromId).toBe(localId);
    });

    it('a failing provider update aborts the reschedule instead of desynchronising the calendar', async () => {
      const mine = own();
      const before = await meeting(mine.otherMeetingId); // linked to a (fake-token) provider connection
      const start = new Date(Date.now() + 29 * 24 * 60 * 60 * 1000);
      start.setUTCHours(8, 0, 0, 0);
      await expect(
        tools.dispatch(
          'reschedule_meeting',
          {
            meeting_id: mine.otherMeetingId,
            new_start_at: start.toISOString(),
            new_end_at: new Date(start.getTime() + 1_800_000).toISOString(),
          },
          internal(mine),
        ),
      ).rejects.toThrow();
      expect(await meeting(mine.otherMeetingId)).toEqual(before);
    });
  });

  // ── RAG / knowledge is retrieved per tenant ───────────────────────────────

  describe('knowledge retrieval (the agent\'s "search" tool)', () => {
    it("never puts another tenant's documents or approved facts into the prompt", async () => {
      for (const t of [A, B]) {
        await ctx.db.insert(knowledgeChunks).values({
          id: createId(),
          tenantId: t.id,
          sourceId: t.knowledgeSourceId,
          content: `needle segredo ${t.key}_CHUNK_SECRET`,
          chunkIndex: 0,
        });
      }
      ctx.llm.script = () => say('ok');

      const dto = { agentId: B.publishedAgentId, message: 'needle segredo' };
      await lab.chat(dto, internal(B));
      const prompt = ctx.llm.requests.at(-1)!.system;

      expect(prompt).toContain('B_CHUNK_SECRET');
      expect(prompt).toContain('B_FACT_SECRET');
      expect(prompt).not.toContain('A_CHUNK_SECRET');
      expect(prompt).not.toContain('A_FACT_SECRET');
    });

    it('an agent id of another tenant cannot be run at all', async () => {
      await expect(
        lab.chat(
          { agentId: A.publishedAgentId, message: 'oi' },
          createExecutionContext({
            tenantId: B.id,
            agentId: A.publishedAgentId,
            channel: 'lab',
            source: 'internal_user',
            userId: B.users.owner.id,
          }),
        ),
      ).rejects.toThrow(/not found/i);
    });
  });

  // ── PC connector ──────────────────────────────────────────────────────────

  describe('PC connector', () => {
    const get = (deviceId: string, secret?: string) => {
      const r = request(ctx.app.getHttpServer()).get(
        `/api/v1/pc-connector/devices/${deviceId}/commands`,
      );
      return secret ? r.set('x-device-secret', secret) : r;
    };

    it('a device can only poll its own commands, with its own secret', async () => {
      expect((await get(B.deviceId)).status).toBe(401);
      expect((await get(B.deviceId, 'wrong')).status).toBe(401);
      expect((await get(B.deviceId, A.deviceSecret)).status).toBe(401); // A's secret on B's device
      const own = await get(B.deviceId, B.deviceSecret);
      expect(own.status).toBe(200);
      expect(
        (own.body as Array<{ id: string; tenantId: string }>).every((c) => c.tenantId === B.id),
      ).toBe(true);
      expect(JSON.stringify(own.body)).not.toContain(A.commandId);
    });

    it("a device cannot post a result for another device's command", async () => {
      const res = await request(ctx.app.getHttpServer())
        .post(`/api/v1/pc-connector/devices/${A.deviceId}/commands/${B.commandId}/result`)
        .set('x-device-secret', A.deviceSecret)
        .send({ success: true, result: { pwned: true } });
      expect(res.status).toBe(404);
      const [cmd] = await ctx.db.select().from(pcCommands).where(eq(pcCommands.id, B.commandId));
      expect(cmd!.status).toBe('pending');
    });

    it('a result is accepted once, only for a pending command', async () => {
      const first = await request(ctx.app.getHttpServer())
        .post(`/api/v1/pc-connector/devices/${B.deviceId}/commands/${B.commandId}/result`)
        .set('x-device-secret', B.deviceSecret)
        .send({ success: true, result: { files: [] } });
      expect(first.status).toBe(204);
      const again = await request(ctx.app.getHttpServer())
        .post(`/api/v1/pc-connector/devices/${B.deviceId}/commands/${B.commandId}/result`)
        .set('x-device-secret', B.deviceSecret)
        .send({ success: false, error: 'overwrite attempt' });
      expect(again.status).toBe(409);
    });

    it('a high-risk command waits for approval; the device cannot complete it, only the tenant admin can release it', async () => {
      const out = await pc
        .enqueueCommand(B.id, B.deviceId, 'pc.deleteFile', { path: 'C:/B/x' })
        .catch((e: Error) => e);
      // deleteFile is not an allowed tool at all (no capability) -> refused outright
      expect(out).toBeInstanceOf(Error);

      // Seed an awaiting_approval command directly (as the approval workflow would)
      const commandId = createId();
      await ctx.db.insert(pcCommands).values({
        id: commandId,
        deviceId: B.deviceId,
        tenantId: B.id,
        toolName: 'pc.createFile',
        params: { path: 'C:/B/a.txt' } as never,
        status: 'awaiting_approval',
        requiresApproval: true,
      });

      const deviceTry = await request(ctx.app.getHttpServer())
        .post(`/api/v1/pc-connector/devices/${B.deviceId}/commands/${commandId}/result`)
        .set('x-device-secret', B.deviceSecret)
        .send({ success: true });
      expect(deviceTry.status).toBe(409);

      const url = (t: TenantFixture) =>
        `/api/v1/tenants/${t.id}/pc-connector/commands/${commandId}/approve`;
      expect(
        (
          await request(ctx.app.getHttpServer())
            .patch(url(A))
            .set('Authorization', `Bearer ${A.users.admin.token}`)
            .send({ approved: true })
        ).status,
      ).toBe(404);
      expect(
        (
          await request(ctx.app.getHttpServer())
            .patch(url(B))
            .set('Authorization', `Bearer ${B.users.viewer.token}`)
            .send({ approved: true })
        ).status,
      ).toBe(403);
      expect(
        (
          await request(ctx.app.getHttpServer())
            .patch(url(B))
            .set('Authorization', `Bearer ${B.users.admin.token}`)
            .send({ approved: 'false' })
        ).status,
      ).toBe(400); // string is not a boolean
      expect(
        (
          await request(ctx.app.getHttpServer())
            .patch(url(B))
            .set('Authorization', `Bearer ${B.users.admin.token}`)
            .send({ approved: true })
        ).status,
      ).toBe(200);
      const [cmd] = await ctx.db.select().from(pcCommands).where(eq(pcCommands.id, commandId));
      expect(cmd!.status).toBe('pending');
      // and it cannot be approved twice
      expect(
        (
          await request(ctx.app.getHttpServer())
            .patch(url(B))
            .set('Authorization', `Bearer ${B.users.admin.token}`)
            .send({ approved: true })
        ).status,
      ).toBe(400);
    });

    it("a tenant cannot enqueue commands on another tenant's device", async () => {
      await expect(pc.enqueueCommand(A.id, B.deviceId, 'pc.getDeviceInfo', {})).rejects.toThrow(
        /not found/i,
      );
      const rows = await ctx.db
        .select()
        .from(pcCommands)
        .where(
          and(eq(pcCommands.deviceId, B.deviceId), eq(pcCommands.toolName, 'pc.getDeviceInfo')),
        );
      expect(rows).toHaveLength(0);
    });

    it('capabilities and authorized folders are enforced on the server, not only by the connector', async () => {
      // device B allows files.read/create only, inside C:/B
      await expect(
        pc.enqueueCommand(B.id, B.deviceId, 'pc.readFile', { path: 'C:/A/secret.txt' }),
      ).rejects.toThrow(/authorized folders/);
      await expect(
        pc.enqueueCommand(B.id, B.deviceId, 'pc.readFile', { path: 'C:/B/../A/secret.txt' }),
      ).rejects.toThrow(/authorized folders/);
      await expect(
        pc.enqueueCommand(B.id, B.deviceId, 'pc.readFile', { path: 'C:/Bonus/x' }),
      ).rejects.toThrow(/authorized folders/); // prefix trick
      await expect(
        pc.enqueueCommand(B.id, B.deviceId, 'pc.renameFile', { path: 'C:/B/a', new_name: 'b' }),
      ).rejects.toThrow(/files.rename disabled/);
      await expect(
        pc.enqueueCommand(B.id, B.deviceId, 'pc.moveFile', {
          source: 'C:/B/a',
          destination: 'C:/B/b',
        }),
      ).rejects.toThrow(/files.move disabled/);
      await expect(
        pc.enqueueCommand(B.id, B.deviceId, 'pc.openApplication', { app: 'calc.exe' }),
      ).rejects.toThrow(/apps.open disabled/);
      await expect(pc.enqueueCommand(B.id, B.deviceId, 'pc.nuke', {})).rejects.toThrow(
        /unknown tool/,
      );
    });

    it('the pairing token is stored hashed, single-use, and the device secret is never stored in clear', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post(`/api/v1/tenants/${B.id}/pc-connector/pair-token`)
        .set('Authorization', `Bearer ${B.users.admin.token}`);
      expect(res.status).toBe(201);
      const token = (res.body as { token: string }).token;

      const stored = await ctx.db.select().from(pcDevices).where(eq(pcDevices.tenantId, B.id));
      expect(stored.some((d) => d.pairingToken === token)).toBe(false);
      expect(
        stored.some((d) => d.pairingToken === createHash('sha256').update(token).digest('hex')),
      ).toBe(true);

      const paired = await request(ctx.app.getHttpServer())
        .post('/api/v1/pc-connector/pair')
        .send({ token, deviceName: 'Notebook QA', platform: 'windows' });
      expect(paired.status).toBe(201);
      const { deviceId, deviceSecret } = paired.body as { deviceId: string; deviceSecret: string };

      const [device] = await ctx.db.select().from(pcDevices).where(eq(pcDevices.id, deviceId));
      expect(device!.tenantId).toBe(B.id);
      expect(device!.deviceSecretHash).toBe(
        createHash('sha256').update(deviceSecret).digest('hex'),
      );
      expect(device!.deviceSecretHash).not.toBe(deviceSecret);

      const again = await request(ctx.app.getHttpServer())
        .post('/api/v1/pc-connector/pair')
        .send({ token, deviceName: 'Outro', platform: 'windows' });
      expect(again.status).toBeGreaterThanOrEqual(400);
    });

    it('viewers and operators cannot manage devices; admins of another tenant cannot either', async () => {
      const patch = (t: TenantFixture, token: string) =>
        request(ctx.app.getHttpServer())
          .patch(`/api/v1/tenants/${t.id}/pc-connector/devices/${B.deviceId}/capabilities`)
          .set('Authorization', `Bearer ${token}`)
          .send({ capabilities: { files: { read: false } } });
      expect((await patch(B, B.users.viewer.token)).status).toBe(403);
      expect((await patch(B, B.users.operator.token)).status).toBe(403);
      expect((await patch(A, A.users.owner.token)).status).toBe(404); // own tenant URL, foreign device id
      expect((await patch(B, A.users.owner.token)).status).toBe(403); // foreign tenant URL
      expect((await patch(B, B.users.admin.token)).status).toBe(200);
      const bad = await request(ctx.app.getHttpServer())
        .patch(`/api/v1/tenants/${B.id}/pc-connector/devices/${B.deviceId}/capabilities`)
        .set('Authorization', `Bearer ${B.users.admin.token}`)
        .send({ capabilities: { files: 'yes' } });
      expect(bad.status).toBe(400);
    });
  });
});
