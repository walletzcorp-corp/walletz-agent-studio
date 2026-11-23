import * as fs from 'fs';
import * as path from 'path';
import { BadRequestException, ConflictException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, inArray } from 'drizzle-orm';
import type Redis from 'ioredis';
import { Pool } from 'pg';
import * as schema from '../database/schema';
import { agents } from '../database/schema/agents';
import { agentCalendarSettings, calendarConnections, calendarMeetings, type CalendarConnection, type CalendarMeeting } from '../database/schema/calendars';
import { tenants } from '../database/schema/tenants';
import { createId } from '../database/utils/id';
import type { DrizzleDB } from '../database/database.module';
import { AvailabilityService } from '../modules/calendars/availability.service';
import { CalendarsService } from '../modules/calendars/calendars.service';
import { GoogleCalendarService } from '../modules/calendars/google.service';
import { MicrosoftCalendarService } from '../modules/calendars/microsoft.service';
import { MicrosoftGraphAuthService } from '../modules/calendars/ms-graph-auth.service';
import { SchedulingToolsService } from '../modules/calendars/scheduling-tools.service';
import type { WebhooksService } from '../modules/webhooks/webhooks.service';
import type { AuditService } from '../shared/audit/audit.service';
import { PlanLimitsService } from '../shared/plans/plan-limits.service';

/** Agenda Google de ponta a ponta no serviço: Postgres real e Google simulado por HTTP. */
function databaseUrl(): string {
  if (process.env['DATABASE_URL']) return process.env['DATABASE_URL'];
  const line = ['../../.env.local', '../../../../.env.local']
    .map((rel) => path.resolve(__dirname, rel))
    .filter((f) => fs.existsSync(f))
    .flatMap((f) => fs.readFileSync(f, 'utf8').split(/\r?\n/))
    .find((l) => l.startsWith('DATABASE_URL='));
  if (!line) throw new Error('DATABASE_URL não definida (nem em .env.local)');
  return line.slice('DATABASE_URL='.length).trim();
}

/** Google mínimo: token, free/busy, eventos e revogação. `fail` força o status de uma operação. */
class FakeGoogle {
  events = new Map<string, { start: string; end: string }>();
  invites: string[] = [];
  busy: Array<{ start: string; end: string }> = [];
  validAccess = new Set<string>();
  validRefresh = new Set<string>(['refresh-ok']);
  revoked: string[] = [];
  calls: string[] = [];
  fail: Partial<Record<'freeBusy' | 'create' | 'patch' | 'delete' | 'revoke' | 'token', number>> = {};
  private seq = 0;

  handle = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = new URL(String(input));
    const method = init?.method ?? 'GET';
    const json = (status: number, body: unknown = {}): Response => new Response(status === 204 ? null : JSON.stringify(body), { status });
    const form = new URLSearchParams(String(init?.body ?? ''));

    if (url.hostname === 'oauth2.googleapis.com') {
      if (url.pathname === '/revoke') {
        this.calls.push('revoke');
        if (this.fail.revoke) return json(this.fail.revoke);
        this.revoked.push(form.get('token') ?? '');
        return json(200);
      }
      this.calls.push('token');
      if (this.fail.token) return json(this.fail.token);
      if (!this.validRefresh.has(form.get('refresh_token') ?? '')) return json(400, { error: 'invalid_grant' });
      const access = `access-${++this.seq}`;
      this.validAccess.add(access);
      return json(200, { access_token: access, expires_in: 3600 });
    }

    const auth = new Headers(init?.headers).get('authorization')?.replace('Bearer ', '') ?? '';
    const op = url.pathname.endsWith('/freeBusy') ? 'freeBusy' : method === 'POST' ? 'create' : method === 'PATCH' ? 'patch' : 'delete';
    this.calls.push(op);
    if (!this.validAccess.has(auth)) return json(401, { error: { code: 401 } });
    const forced = this.fail[op];
    if (forced) return json(forced);

    if (op === 'freeBusy') {
      const busy = [...this.busy, ...[...this.events.values()]];
      return json(200, { calendars: { primary: { busy } } });
    }
    const body = JSON.parse(String(init?.body ?? '{}')) as { id?: string; start?: { dateTime: string }; end?: { dateTime: string } };
    if (op === 'create') {
      const id = body.id!;
      if (url.searchParams.get('sendUpdates') === 'all') this.invites.push(id);
      this.events.set(id, { start: body.start!.dateTime, end: body.end!.dateTime });
      return json(200, { id, hangoutLink: `https://meet.google.com/${id.slice(0, 6)}` });
    }
    const id = decodeURIComponent(url.pathname.split('/').pop()!);
    if (!this.events.has(id)) return json(404);
    if (op === 'patch') {
      this.events.set(id, { start: body.start!.dateTime, end: body.end!.dateTime });
      return json(200, { id, status: 'confirmed' });
    }
    this.events.delete(id);
    return json(204);
  };
}

const KEY = 'a'.repeat(64);
const HOUR = 3_600_000;
const realFetch = global.fetch;

describe('Google Agenda (integração com Postgres)', () => {
  let pool: Pool;
  let db: DrizzleDB;
  let svc: CalendarsService;
  let tools: SchedulingToolsService;
  let google: FakeGoogle;
  const audit = { log: jest.fn(async () => undefined) };
  const tenantIds: string[] = [];
  const enc = (s: string): string => (svc as unknown as { encrypt(v: string): string }).encrypt(s);

  beforeAll(() => {
    pool = new Pool({ connectionString: databaseUrl(), max: 10 });
    db = drizzle(pool, { schema });
    const values: Record<string, string> = { CALENDAR_ENCRYPTION_KEY: KEY, GOOGLE_OAUTH_CLIENT_ID: 'id', GOOGLE_OAUTH_CLIENT_SECRET: 'secret' };
    const config = { get: (k: string, d?: unknown) => values[k] ?? d } as unknown as ConfigService;
    const plans = new PlanLimitsService(db);
    const availability = new AvailabilityService();
    svc = new CalendarsService(
      db, config, audit as unknown as AuditService, new GoogleCalendarService(config), new MicrosoftCalendarService(config),
      new MicrosoftGraphAuthService(config), availability, {} as Redis, plans,
      { emit: jest.fn(async () => undefined) } as unknown as WebhooksService,
    );
    tools = new SchedulingToolsService(db, svc, availability, plans);
  });

  beforeEach(() => {
    google = new FakeGoogle();
    global.fetch = google.handle as typeof fetch;
    audit.log.mockClear();
  });

  afterAll(async () => {
    global.fetch = realFetch;
    if (tenantIds.length) {
      await db.delete(calendarMeetings).where(inArray(calendarMeetings.tenantId, tenantIds));
      await db.delete(agentCalendarSettings).where(inArray(agentCalendarSettings.tenantId, tenantIds));
      await db.delete(calendarConnections).where(inArray(calendarConnections.tenantId, tenantIds));
      await db.delete(agents).where(inArray(agents.tenantId, tenantIds));
      await db.delete(tenants).where(inArray(tenants.id, tenantIds));
    }
    await pool?.end();
  });

  async function connect(tenantId: string, email: string, over: Partial<CalendarConnection> = {}): Promise<string> {
    const [row] = await db.insert(calendarConnections).values({
      tenantId, provider: 'google', email,
      encryptedAccessToken: enc('access-vencido'), encryptedRefreshToken: enc('refresh-ok'),
      tokenExpiresAt: new Date(Date.now() - HOUR), scopes: ['calendar'], ...over,
    }).returning({ id: calendarConnections.id });
    return row!.id;
  }

  async function setup(options: { withConnection?: boolean; email?: string } = {}): Promise<{ tenantId: string; agentId: string; connectionId: string | null }> {
    const tenantId = createId();
    tenantIds.push(tenantId);
    await db.insert(tenants).values({ id: tenantId, slug: `cal-${tenantId}`, name: 'Teste agenda', planId: 'business', status: 'active' });
    const [agent] = await db.insert(agents).values({ tenantId, name: 'Agente', status: 'published' }).returning({ id: agents.id });
    const connectionId = options.withConnection === false ? null : await connect(tenantId, options.email ?? `${tenantId}@x.com`);
    const all = Object.fromEntries(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((d) => [d, { start: '00:00', end: '23:59', enabled: true }]));
    await db.insert(agentCalendarSettings).values({ tenantId, agentId: agent!.id, connectionId, canSchedule: true, minLeadTimeMinutes: 0, bufferMinutes: 0, availableHours: all });
    return { tenantId, agentId: agent!.id, connectionId };
  }

  const slot = (hours: number): { startAt: string; endAt: string } => {
    const base = Math.ceil(Date.now() / HOUR) * HOUR + 24 * HOUR + hours * HOUR;
    return { startAt: new Date(base).toISOString(), endAt: new Date(base + HOUR / 2).toISOString() };
  };
  const meetingsOf = (tenantId: string): Promise<CalendarMeeting[]> => db.select().from(calendarMeetings).where(eq(calendarMeetings.tenantId, tenantId));
  const connOf = async (id: string): Promise<CalendarConnection> => (await db.select().from(calendarConnections).where(eq(calendarConnections.id, id)))[0]!;
  const book = async (ctx: { tenantId: string; agentId: string }, hours = 0): Promise<CalendarMeeting> =>
    (await tools.createMeeting(ctx, { ...slot(hours), title: 'Demo', contactEmail: 'c@x.com' })).meeting;

  describe('1. renovação do token', () => {
    it('token vencido é renovado, gravado cifrado e reaproveitado', async () => {
      const ctx = await setup();
      await tools.getAvailability(ctx, 3);
      await tools.getAvailability(ctx, 3);
      expect(google.calls).toEqual(['token', 'freeBusy', 'freeBusy']);
      const conn = await connOf(ctx.connectionId!);
      expect(conn.syncStatus).toBe('synced');
      expect(conn.tokenExpiresAt!.getTime()).toBeGreaterThan(Date.now() + HOUR / 2);
      expect(conn.encryptedAccessToken).not.toContain('access-');
    });

    it('chamadas simultâneas renovam uma vez só', async () => {
      const ctx = await setup();
      await Promise.all([1, 2, 3, 4].map(() => tools.getAvailability(ctx, 3)));
      expect(google.calls.filter((c) => c === 'token')).toHaveLength(1);
    });

    it('token recusado antes do vencimento é renovado e a operação repetida', async () => {
      const ctx = await setup();
      await db.update(calendarConnections).set({ tokenExpiresAt: new Date(Date.now() + HOUR) }).where(eq(calendarConnections.id, ctx.connectionId!));
      await tools.getAvailability(ctx, 3);
      expect(google.calls).toEqual(['freeBusy', 'token', 'freeBusy']);
    });

    it('autorização revogada → erro claro e conexão "Reautorizar"', async () => {
      const ctx = await setup();
      google.validRefresh.clear();
      await expect(tools.getAvailability(ctx, 3)).rejects.toBeInstanceOf(ConflictException);
      expect((await connOf(ctx.connectionId!)).syncStatus).toBe('reauth_required');
    });

    it('falha temporária do Google não marca a conexão como "Reautorizar"', async () => {
      const ctx = await setup();
      google.fail.token = 503;
      await expect(tools.getAvailability(ctx, 3)).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect((await connOf(ctx.connectionId!)).syncStatus).toBe('pending');
    });
  });

  describe('2 e 6. disponibilidade consulta o Google', () => {
    it('não oferece horário ocupado no Google, inclusive dia inteiro', async () => {
      const ctx = await setup();
      const start = new Date(Math.ceil(Date.now() / HOUR) * HOUR);
      google.busy = [{ start: new Date(Date.now() - HOUR).toISOString(), end: new Date(start.getTime() + 24 * HOUR).toISOString() }];
      const { slots } = await tools.getAvailability(ctx, 2);
      expect(slots.length).toBeGreaterThan(0);
      for (const s of slots) expect(new Date(s.start).getTime()).toBeGreaterThanOrEqual(start.getTime() + 24 * HOUR);
    });

    it('recusa marcar em cima de compromisso do Google', async () => {
      const ctx = await setup();
      const s = slot(0);
      google.busy = [{ start: s.startAt, end: s.endAt }];
      await expect(book(ctx)).rejects.toThrow(/ocupado/);
      expect(google.calls).not.toContain('create');
      expect(await meetingsOf(ctx.tenantId)).toHaveLength(0);
    });

    it('Google fora do ar → erro, nunca "livre"; o painel também falha', async () => {
      const ctx = await setup();
      google.fail.freeBusy = 500;
      await expect(tools.getAvailability(ctx, 3)).rejects.toBeInstanceOf(ServiceUnavailableException);
      await expect(svc.getAvailableSlots(ctx.tenantId, ctx.agentId, 3)).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    it('agente não usa agenda de outra organização', async () => {
      const a = await setup();
      const b = await setup();
      await db.update(agentCalendarSettings).set({ connectionId: a.connectionId }).where(eq(agentCalendarSettings.agentId, b.agentId));
      await expect(tools.getAvailability(b, 3)).rejects.toBeInstanceOf(ConflictException);
      expect(google.calls).toEqual([]);
    });
  });

  describe('3. só confirma com evento no provedor', () => {
    it('sucesso: confirmada com external_event_id', async () => {
      const m = await book(await setup());
      expect(m.status).toBe('confirmed');
      expect(google.events.has(m.externalEventId!)).toBe(true);
    });

    it('Google falha ao criar → nada salvo, e tenta apagar o que possa ter sido criado', async () => {
      const ctx = await setup();
      google.fail.create = 500;
      await expect(book(ctx)).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(await meetingsOf(ctx.tenantId)).toHaveLength(0);
      expect(google.calls).toContain('delete');
    });

    it('sem agenda conectada → recusa e não salva', async () => {
      const ctx = await setup({ withConnection: false });
      await expect(book(ctx)).rejects.toThrow(/nenhuma agenda/i);
      expect(await meetingsOf(ctx.tenantId)).toHaveLength(0);
    });

    it('banco falha depois do Google → o evento criado é desfeito', async () => {
      const ctx = await setup();
      await expect(tools.createMeeting(ctx, { ...slot(0), title: 'x', platform: 'invalida' as unknown as 'phone' })).rejects.toThrow();
      expect(google.events.size).toBe(0);
    });

    it('painel sem agenda escolhida → pendente, não confirmada', async () => {
      const ctx = await setup();
      const m = await svc.createMeeting(ctx.tenantId, 'u', { ...slot(0), title: 'Manual' });
      expect(m.status).toBe('pending');
    });
  });

  describe('fuso de Brasília', () => {
    it('agente marca 14h sem fuso como 14h de Brasília e devolve o texto certo', async () => {
      const ctx = await setup();
      const date = new Date(Date.now() + 3 * 24 * HOUR).toISOString().slice(0, 10);
      const r = await tools.createMeeting(ctx, { startAt: `${date}T14:00:00`, endAt: `${date}T14:30:00`, title: 'x' });
      expect(r.meeting.startAt.toISOString()).toBe(`${date}T17:00:00.000Z`);
      expect(r.message).toContain('14:00');
      expect([...google.events.values()][0]!.start).toBe(`${date}T17:00:00.000Z`);
      const { meetings } = await tools.findMeetings(ctx);
      expect(meetings[0]!.horario).toContain('14:00');
    });

    it('expediente 9h–18h oferece só horários de Brasília', async () => {
      const ctx = await setup();
      const day = { start: '09:00', end: '18:00', enabled: true };
      await svc.upsertAgentSettings(ctx.tenantId, ctx.agentId, 'u', { availableHours: Object.fromEntries(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((d) => [d, day])) });
      const { slots } = await tools.getAvailability(ctx, 3);
      expect(slots.length).toBeGreaterThan(0);
      for (const s of slots) {
        expect(s.start.endsWith('-03:00')).toBe(true);
        expect(s.start.slice(11, 16) >= '09:00' && s.end.slice(11, 16) <= '18:00').toBe(true);
      }
    });
  });

  describe('convite', () => {
    it('com e-mail o convite é pedido ao Google; sem e-mail o agente sabe que não foi', async () => {
      const ctx = await setup();
      const a = await tools.createMeeting(ctx, { ...slot(0), title: 'x', contactEmail: 'c@x.com' });
      const b = await tools.createMeeting(ctx, { ...slot(2), title: 'y' });
      expect([a.inviteSent, b.inviteSent]).toEqual([true, false]);
      expect(google.invites).toEqual([a.meeting.externalEventId]);
      expect(b.message).toContain('Nenhum convite foi enviado');
    });
  });

  describe('configuração do agente', () => {
    it('liga a agenda, valida expediente e exige agenda para agendar', async () => {
      const ctx = await setup({ withConnection: false });
      const up = (dto: Parameters<CalendarsService['upsertAgentSettings']>[3]) => svc.upsertAgentSettings(ctx.tenantId, ctx.agentId, 'u', dto);
      await expect(up({ canSchedule: true, connectionId: null })).rejects.toBeInstanceOf(BadRequestException);
      const connectionId = await connect(ctx.tenantId, 'a@b.com');
      expect(await up({ canSchedule: true, connectionId })).toMatchObject({ canSchedule: true, connectionId, timeZone: 'America/Sao_Paulo' });
      await expect(up({ availableHours: { mon: { start: '18:00', end: '09:00', enabled: true } } })).rejects.toBeInstanceOf(BadRequestException);
      await expect(up({ connectionId: null })).rejects.toBeInstanceOf(BadRequestException);
      expect(await up({ canSchedule: false, connectionId: null })).toMatchObject({ canSchedule: false, connectionId: null });
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'calendar.agent_settings.upsert' }));
    });

    it('não aceita agenda nem agente de outra organização', async () => {
      const a = await setup();
      const b = await setup({ withConnection: false });
      await expect(svc.upsertAgentSettings(b.tenantId, b.agentId, 'u', { connectionId: a.connectionId })).rejects.toBeInstanceOf(BadRequestException);
      await expect(svc.upsertAgentSettings(b.tenantId, a.agentId, 'u', { canSchedule: false })).rejects.toBeInstanceOf(NotFoundException);
      const [s] = await db.select().from(agentCalendarSettings).where(eq(agentCalendarSettings.agentId, a.agentId));
      expect(s!.canSchedule).toBe(true);
    });
  });

  describe('verificar conexão', () => {
    it('consulta o Google de verdade e mostra o resultado', async () => {
      const ctx = await setup();
      expect(await svc.triggerSync(ctx.tenantId)).toEqual({ checked: 1, synced: 1, failed: 0 });
      expect((await connOf(ctx.connectionId!)).syncStatus).toBe('synced');
      google.fail.freeBusy = 500;
      expect(await svc.triggerSync(ctx.tenantId)).toEqual({ checked: 1, synced: 0, failed: 1 });
      expect((await connOf(ctx.connectionId!)).syncStatus).toBe('error');
    });
  });

  describe('painel', () => {
    it('horário de reunião cancelada pode ser usado de novo; sobreposição parcial é recusada', async () => {
      const ctx = await setup();
      const create = (h: number, extra = {}) => svc.createMeeting(ctx.tenantId, 'u', { ...slot(h), title: 'p', connectionId: ctx.connectionId!, ...extra });
      const m = await create(0);
      const s = slot(0);
      const mid = new Date(new Date(s.startAt).getTime() + 10 * 60_000).toISOString();
      const late = new Date(new Date(s.endAt).getTime() + 10 * 60_000).toISOString();
      await expect(create(0, { startAt: mid, endAt: late })).rejects.toBeInstanceOf(ConflictException);
      await svc.cancelMeeting(ctx.tenantId, m.id, 'u');
      expect((await create(0)).status).toBe('confirmed');
    });

    it('reagendar pelo painel para horário ocupado é recusado', async () => {
      const ctx = await setup();
      const m = await book(ctx);
      const other = slot(6);
      google.busy = [{ start: other.startAt, end: other.endAt }];
      await expect(svc.rescheduleMeeting(ctx.tenantId, m.id, 'u', other)).rejects.toBeInstanceOf(ConflictException);
      expect(google.calls).not.toContain('patch');
    });
  });

  describe('reunião de outro contato', () => {
    const asContact = (ctx: { tenantId: string; agentId: string }, n: string) => ({ tenantId: ctx.tenantId, agentId: ctx.agentId, contactId: `contato-${n}`, conversationId: `conversa-${n}` });

    it('não vê, não reagenda e não cancela, e recebe a mesma resposta de reunião inexistente', async () => {
      const base = await setup();
      const ana = asContact(base, 'ana');
      const beto = asContact(base, 'beto');
      const m = await book(ana);
      const before = google.calls.length;
      expect((await tools.findMeetings(beto)).meetings).toEqual([]);
      const n = slot(5);
      const attempts = await Promise.allSettled([
        tools.cancelMeeting(beto, m.id),
        tools.rescheduleMeeting(beto, m.id, n.startAt, n.endAt),
        tools.cancelMeeting(beto, createId()),
      ]);
      const messages = attempts.map((a) => (a.status === 'rejected' ? (a.reason as Error).message : 'ok'));
      expect(messages).toEqual(['Reunião não encontrada.', 'Reunião não encontrada.', 'Reunião não encontrada.']);
      expect(google.calls.length).toBe(before);
      expect((await meetingsOf(base.tenantId)).map((x) => x.status)).toEqual(['confirmed']);
    });

    it('o dono reagenda e cancela, inclusive em outra conversa', async () => {
      const base = await setup();
      const m = await book(asContact(base, 'ana'));
      const later = { ...asContact(base, 'ana'), conversationId: 'conversa-nova' };
      const n = slot(5);
      const { meeting } = await tools.rescheduleMeeting(later, m.id, n.startAt, n.endAt);
      expect((await tools.findMeetings(later, 'confirmed')).meetings.map((x) => x.id)).toEqual([meeting.id]);
      await tools.cancelMeeting(later, meeting.id);
      expect(google.events.size).toBe(0);
    });

    it('Laboratório só alcança as próprias reuniões de teste', async () => {
      const base = await setup();
      const client = await book(asContact(base, 'ana'));
      const manual = await svc.createMeeting(base.tenantId, 'u', { ...slot(3), title: 'Manual', connectionId: base.connectionId! });
      const test = await book(base, 6);
      const lab = { tenantId: base.tenantId, agentId: base.agentId };
      expect((await tools.findMeetings(lab)).meetings.map((x) => x.id)).toEqual([test.id]);
      for (const id of [client.id, manual.id]) await expect(tools.cancelMeeting(lab, id)).rejects.toBeInstanceOf(NotFoundException);
      const [other] = await db.insert(agents).values({ tenantId: base.tenantId, name: 'Outro', status: 'published' }).returning({ id: agents.id });
      await db.insert(agentCalendarSettings).values({ tenantId: base.tenantId, agentId: other!.id, connectionId: base.connectionId, canSchedule: true });
      await expect(tools.cancelMeeting({ ...lab, agentId: other!.id }, test.id)).rejects.toBeInstanceOf(NotFoundException);
      await tools.cancelMeeting(lab, test.id);
    });

    it('contato de outra organização com o mesmo ID não alcança', async () => {
      const a = await setup();
      const b = await setup();
      const m = await book(asContact(a, 'x'));
      await expect(tools.cancelMeeting(asContact(b, 'x'), m.id)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('agente sem permissão de agendar não cancela', async () => {
      const base = await setup();
      const m = await book(base);
      await svc.upsertAgentSettings(base.tenantId, base.agentId, 'u', { canSchedule: false });
      await expect(tools.cancelMeeting(base, m.id)).rejects.toThrow(/não está habilitado/);
    });

    it('a equipe, pelo painel, continua alterando qualquer reunião da organização', async () => {
      const base = await setup();
      const m = await book(asContact(base, 'ana'));
      await svc.cancelMeeting(base.tenantId, m.id, 'u');
      expect((await meetingsOf(base.tenantId))[0]!.status).toBe('cancelled');
    });

    it('o modelo não recebe IDs internos', async () => {
      const base = await setup();
      const ctx = asContact(base, 'ana');
      const m = await book(ctx);
      const out = JSON.stringify(await tools.dispatch('find_meetings', {}, ctx));
      expect(out).toContain(m.id);
      for (const secret of [base.tenantId, base.agentId, base.connectionId!, m.externalEventId!, 'contato-ana', 'c@x.com']) expect(out).not.toContain(secret);
    });
  });

  describe('4. desconectar', () => {
    it('apaga os tokens, revoga no Google e registra auditoria', async () => {
      const ctx = await setup();
      await expect(svc.disconnect(ctx.tenantId, ctx.connectionId!, 'u')).resolves.toEqual({ revocation: 'revoked' });
      expect(google.revoked).toEqual(['refresh-ok']);
      expect(await connOf(ctx.connectionId!)).toMatchObject({ encryptedAccessToken: '', encryptedRefreshToken: null, scopes: null, syncStatus: 'disconnected' });
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'calendar.disconnect', metadata: expect.objectContaining({ revocation: 'revoked' }) }));
      await expect(svc.disconnect(ctx.tenantId, ctx.connectionId!, 'u')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('Google não responde → tokens apagados mesmo assim', async () => {
      const ctx = await setup();
      google.fail.revoke = 503;
      await expect(svc.disconnect(ctx.tenantId, ctx.connectionId!, 'u')).resolves.toEqual({ revocation: 'failed' });
      expect((await connOf(ctx.connectionId!)).encryptedRefreshToken).toBeNull();
    });

    it('mesma conta em outra organização → não derruba a conexão dela', async () => {
      const email = `${createId()}@agencia.com`;
      const a = await setup({ email });
      const b = await setup({ email });
      await expect(svc.disconnect(a.tenantId, a.connectionId!, 'u')).resolves.toEqual({ revocation: 'shared_account' });
      expect(google.revoked).toEqual([]);
      await expect(tools.getAvailability(b, 3)).resolves.toBeDefined();
      await expect(svc.disconnect(b.tenantId, b.connectionId!, 'u')).resolves.toEqual({ revocation: 'revoked' });
    });

    it('outra organização não desconecta a agenda', async () => {
      const a = await setup();
      const b = await setup();
      await expect(svc.disconnect(b.tenantId, a.connectionId!, 'u')).rejects.toBeInstanceOf(NotFoundException);
      expect((await connOf(a.connectionId!)).encryptedRefreshToken).not.toBeNull();
    });

    it('reconectar a mesma conta volta a atender o agente e as reuniões antigas', async () => {
      const ctx = await setup();
      const m = await book(ctx);
      const { email } = await connOf(ctx.connectionId!);
      await svc.disconnect(ctx.tenantId, ctx.connectionId!, 'u');
      await expect(svc.cancelMeeting(ctx.tenantId, m.id, 'u')).rejects.toBeInstanceOf(ConflictException);
      await connect(ctx.tenantId, email);
      await svc.cancelMeeting(ctx.tenantId, m.id, 'u');
      expect(google.events.size).toBe(0);
    });
  });

  describe('5. reagendar e cancelar', () => {
    it('reagendar move o mesmo evento e preserva link e vínculos', async () => {
      const ctx = { ...(await setup()), conversationId: 'conv-1' };
      const m = await book(ctx);
      const n = slot(5);
      const moved = await svc.rescheduleMeeting(ctx.tenantId, m.id, 'u', n);
      expect(moved).toMatchObject({ externalEventId: m.externalEventId, externalMeetUrl: m.externalMeetUrl, status: 'confirmed', conversationId: 'conv-1', rescheduledFromId: m.id });
      expect(google.events.get(m.externalEventId!)!.start).toBe(n.startAt);
      expect((await meetingsOf(ctx.tenantId)).find((x) => x.id === m.id)!.status).toBe('rescheduled');
      await expect(svc.cancelMeeting(ctx.tenantId, m.id, 'u')).rejects.toBeInstanceOf(ConflictException);
    });

    it('Google recusa o reagendamento → nada muda na plataforma', async () => {
      const ctx = await setup();
      const m = await book(ctx);
      google.fail.patch = 500;
      await expect(svc.rescheduleMeeting(ctx.tenantId, m.id, 'u', slot(5))).rejects.toBeInstanceOf(ServiceUnavailableException);
      const rows = await meetingsOf(ctx.tenantId);
      expect(rows).toHaveLength(1);
      expect(rows[0]!.status).toBe('confirmed');
    });

    it('evento apagado no Google → avisa em vez de confirmar', async () => {
      const ctx = await setup();
      const m = await book(ctx);
      google.events.clear();
      await expect(svc.rescheduleMeeting(ctx.tenantId, m.id, 'u', slot(5))).rejects.toBeInstanceOf(ConflictException);
      await svc.cancelMeeting(ctx.tenantId, m.id, 'u'); // já não existe no Google: cancela normalmente
      expect((await meetingsOf(ctx.tenantId))[0]!.status).toBe('cancelled');
    });

    it('agente: aceita horário que encosta no antigo, recusa horário ocupado por outro', async () => {
      const ctx = await setup();
      const m = await book(ctx);
      const shifted = {
        start: new Date(m.startAt.getTime() + 15 * 60_000).toISOString(),
        end: new Date(m.endAt.getTime() + 15 * 60_000).toISOString(),
      };
      const { meeting } = await tools.rescheduleMeeting(ctx, m.id, shifted.start, shifted.end);
      expect(meeting.status).toBe('confirmed');
      const other = slot(8);
      google.busy = [{ start: other.startAt, end: other.endAt }];
      await expect(tools.rescheduleMeeting(ctx, meeting.id, other.startAt, other.endAt)).rejects.toThrow(/ocupado/);
    });

    it('dois reagendamentos simultâneos: só um vale', async () => {
      const ctx = await setup();
      const m = await book(ctx);
      const r = await Promise.allSettled([svc.rescheduleMeeting(ctx.tenantId, m.id, 'u', slot(4)), svc.rescheduleMeeting(ctx.tenantId, m.id, 'u', slot(6))]);
      expect(r.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
      const winner = (await meetingsOf(ctx.tenantId)).find((x) => x.status === 'confirmed')!;
      expect(google.events.get(m.externalEventId!)!.start).toBe(winner.startAt.toISOString());
    });

    it('exclusão falha no Google → a reunião continua ativa', async () => {
      const ctx = await setup();
      const m = await book(ctx);
      google.fail.delete = 500;
      await expect(svc.cancelMeeting(ctx.tenantId, m.id, 'u')).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect((await meetingsOf(ctx.tenantId))[0]!.status).toBe('confirmed');
      google.fail = {};
      await svc.cancelMeeting(ctx.tenantId, m.id, 'u');
      expect((await meetingsOf(ctx.tenantId))[0]!.status).toBe('cancelled');
      expect(google.events.size).toBe(0);
    });
  });
});
