// Pacotes só ESM: o serviço recebe a Meta simulada pelo construtor, então bastam stubs.
jest.mock('@nestjs/axios', () => ({ HttpService: class {}, HttpModule: { register: () => ({}) } }));
jest.mock('@nestjs/bullmq', () => ({ InjectQueue: () => () => {}, BullModule: { registerQueue: () => ({}) } }));

import * as fs from 'fs';
import * as path from 'path';
import { BadGatewayException, ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { and, eq, inArray } from 'drizzle-orm';
import { Pool } from 'pg';
import { of, throwError, type Observable } from 'rxjs';
import * as schema from '../database/schema';
import { agents } from '../database/schema/agents';
import { tenants } from '../database/schema/tenants';
import { conversations, messages, humanHandoffs } from '../database/schema/conversations';
import { contacts, contactIdentities } from '../database/schema/contacts';
import { whatsappAccounts, whatsappMessageLogs } from '../database/schema/whatsapp';
import { createId } from '../database/utils/id';
import type { DrizzleDB } from '../database/database.module';
import { PlanLimitsService } from '../shared/plans/plan-limits.service';
import { EncryptionService } from '../shared/crypto/encryption.service';
import { WhatsappService } from '../modules/whatsapp/whatsapp.service';
import { ConversationsService } from '../modules/conversations/conversations.service';
import type { LabChatDto } from '../modules/lab/dto/chat.dto';

/**
 * Atendimento pelo WhatsApp contra o Postgres real, com a Meta e o modelo de IA simulados:
 * histórico da conversa, recusa da Meta passando para atendente, resposta e reenvio do
 * atendente, janela de 24h, situação de envio do número e isolamento entre organizações.
 */
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

type MetaReply = 'ok' | { status: number; code?: number; message?: string };
const PAYMENT_ERROR: MetaReply = { status: 400, code: 10, message: '(#10) Viewer cannot access the provided Paid Message Account 3961783927455245' };

/** Meta simulada: cada envio consome a próxima resposta da fila (padrão: sucesso). */
class FakeMeta {
  replies: MetaReply[] = [];
  sent: Array<{ to: string; body: string }> = [];
  health: unknown = { health_status: { can_send_message: 'AVAILABLE', entities: [] }, name_status: 'APPROVED' };
  private seq = 0;
  post = (_url: string, payload: { to: string; text: { body: string } }): Observable<unknown> => {
    const r = this.replies.shift() ?? 'ok';
    if (r === 'ok') {
      this.sent.push({ to: payload.to, body: payload.text.body });
      return of({ data: { messages: [{ id: `wamid.out.${++this.seq}` }] } });
    }
    return throwError(() => ({ response: { status: r.status, data: r.code ? { error: { code: r.code, message: r.message ?? 'erro' } } : undefined } }));
  };
  get = (): Observable<unknown> => of({ data: this.health });
}

class FakeRedis {
  store = new Map<string, string>();
  async get(k: string): Promise<string | null> { return this.store.get(k) ?? null; }
  async set(k: string, v: string): Promise<'OK'> { this.store.set(k, v); return 'OK'; }
  async del(...keys: string[]): Promise<number> { let n = 0; for (const k of keys) if (this.store.delete(k)) n++; return n; }
}

describe('WhatsApp: histórico, atendente e situação de envio (integração com Postgres)', () => {
  let pool: Pool;
  let db: DrizzleDB;
  let meta: FakeMeta;
  let redis: FakeRedis;
  let wa: WhatsappService;
  let convs: ConversationsService;
  const audit = { log: jest.fn(async () => undefined) };
  const webhooks = { emit: jest.fn(async () => undefined) };
  const lab = { chat: jest.fn() };
  const tenantIds: string[] = [];
  let seq = 0;

  beforeAll(() => {
    pool = new Pool({ connectionString: databaseUrl(), max: 5 });
    db = drizzle(pool, { schema });
  });

  beforeEach(() => {
    meta = new FakeMeta();
    redis = new FakeRedis();
    audit.log.mockClear();
    webhooks.emit.mockClear();
    lab.chat.mockReset();
    lab.chat.mockImplementation(async (dto: LabChatDto) => ({ reply: `Resposta para: ${dto.message}`, traceId: createId() }));
    wa = new WhatsappService(
      db, { post: meta.post, get: meta.get } as never, audit as never, new EncryptionService(), lab as never,
      new PlanLimitsService(db), webhooks as never, {} as never, {} as never, redis as never,
    );
    convs = new ConversationsService(db, webhooks as never, wa);
  });

  afterAll(async () => {
    if (tenantIds.length) {
      await db.delete(humanHandoffs).where(inArray(humanHandoffs.tenantId, tenantIds));
      await db.delete(messages).where(inArray(messages.tenantId, tenantIds));
      await db.delete(whatsappMessageLogs).where(inArray(whatsappMessageLogs.tenantId, tenantIds));
      await db.delete(conversations).where(inArray(conversations.tenantId, tenantIds));
      await db.delete(contactIdentities).where(inArray(contactIdentities.tenantId, tenantIds));
      await db.delete(contacts).where(inArray(contacts.tenantId, tenantIds));
      await db.delete(whatsappAccounts).where(inArray(whatsappAccounts.tenantId, tenantIds));
      await db.delete(agents).where(inArray(agents.tenantId, tenantIds));
      await db.delete(tenants).where(inArray(tenants.id, tenantIds));
    }
    await pool?.end();
  });

  /** Organização Pro ativa com um agente publicado e um número conectado. */
  async function setup(): Promise<{ tenantId: string; phoneNumberId: string; accountId: string }> {
    const tenantId = createId();
    tenantIds.push(tenantId);
    await db.insert(tenants).values({ id: tenantId, slug: `wa-test-${tenantId}`, name: 'WhatsApp teste', planId: 'pro', status: 'active' });
    const [agent] = await db.insert(agents).values({ tenantId, name: 'Luna', status: 'published' }).returning({ id: agents.id });
    const phoneNumberId = `pn-${tenantId}`;
    const [account] = await db.insert(whatsappAccounts).values({
      tenantId, phoneNumberId, wabaId: 'waba', accessToken: 'token-teste', verifyToken: 'v', status: 'connected',
      agentId: agent!.id, credentialSource: 'client',
    }).returning({ id: whatsappAccounts.id });
    return { tenantId, phoneNumberId, accountId: account!.id };
  }

  const inbound = (phoneNumberId: string, from: string, text: string) => {
    const id = `wamid.in.${++seq}.${createId()}`;
    return { id, run: () => wa.processQueuedInbound({ phoneNumberId, message: { id, from, timestamp: '1', type: 'text', text: { body: text } }, waContact: { wa_id: from, profile: { name: 'Cliente' } } }) };
  };
  const conversationOf = async (tenantId: string, messageId: string) => {
    const [log] = await db.select({ c: whatsappMessageLogs.conversationId }).from(whatsappMessageLogs)
      .where(and(eq(whatsappMessageLogs.tenantId, tenantId), eq(whatsappMessageLogs.idempotencyKey, messageId)));
    const [conv] = await db.select().from(conversations).where(eq(conversations.id, log!.c!));
    return conv!;
  };
  const lastHistory = () => (lab.chat.mock.calls.at(-1)![0] as LabChatDto).history;

  it('o agente recebe o histórico da conversa, sem respostas que não chegaram ao cliente', async () => {
    const { tenantId, phoneNumberId } = await setup();
    const from = '5541990000001';
    await inbound(phoneNumberId, from, 'Oi, quero uma pizza').run();
    expect(lastHistory()).toEqual([]);

    await inbound(phoneNumberId, from, 'Calabresa grande').run();
    expect(lastHistory()).toEqual([
      { role: 'user', content: 'Oi, quero uma pizza' },
      { role: 'assistant', content: 'Resposta para: Oi, quero uma pizza' },
    ]);

    // Meta instável: a resposta falha, o erro sobe para a fila tentar de novo e nada vai para atendente.
    meta.replies.push({ status: 503 });
    const m3 = inbound(phoneNumberId, from, 'Com borda');
    await expect(m3.run()).rejects.toBeDefined();
    const conv = await conversationOf(tenantId, m3.id);
    expect(conv.status).toBe('open');
    expect(conv.aiPausedAt).toBeNull();

    await inbound(phoneNumberId, from, 'Pode entregar?').run();
    const history = lastHistory()!;
    expect(history.map((h) => h.content)).toEqual([
      'Oi, quero uma pizza', 'Resposta para: Oi, quero uma pizza',
      'Calabresa grande', 'Resposta para: Calabresa grande',
      'Com borda', // a resposta que falhou não aparece
    ]);
    expect(meta.sent.every((s) => s.to === from)).toBe(true);
  });

  it('recusa permanente da Meta passa a conversa para atendente e para de gastar a IA', async () => {
    const { tenantId, phoneNumberId } = await setup();
    meta.replies.push(PAYMENT_ERROR);
    const m1 = inbound(phoneNumberId, '5541990000002', 'Bom dia');
    await expect(m1.run()).resolves.toBeUndefined(); // não volta para a fila: tentar de novo não resolve

    const conv = await conversationOf(tenantId, m1.id);
    expect(conv.status).toBe('waiting_human');
    expect(conv.aiPausedAt).not.toBeNull();
    const [handoff] = await db.select().from(humanHandoffs).where(eq(humanHandoffs.conversationId, conv.id));
    expect(handoff!.status).toBe('active');
    expect(handoff!.reason).toMatch(/forma de pagamento/);
    const [failed] = await db.select().from(messages).where(and(eq(messages.conversationId, conv.id), eq(messages.direction, 'outbound')));
    expect(failed!.status).toBe('failed');
    expect(failed!.failureReason).toMatch(/Configurações de pagamento/);
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'conversation.handoff_automatic', resourceId: conv.id, tenantId }));
    expect(webhooks.emit).toHaveBeenCalledWith(tenantId, 'conversation.handoff', expect.objectContaining({ conversationId: conv.id, automatic: true }));

    // Outro cliente logo depois: a IA nem é chamada, a conversa vai direto para atendente.
    const callsBefore = lab.chat.mock.calls.length;
    const m2 = inbound(phoneNumberId, '5541990000003', 'Olá');
    await m2.run();
    expect(lab.chat.mock.calls.length).toBe(callsBefore);
    const conv2 = await conversationOf(tenantId, m2.id);
    expect(conv2.status).toBe('waiting_human');
    const [h2] = await db.select().from(humanHandoffs).where(eq(humanHandoffs.conversationId, conv2.id));
    expect(h2!.reason).toMatch(/não foi gerada/);

    // Nova mensagem na conversa com atendente: continua aguardando e sem IA; sem passagem duplicada.
    await inbound(phoneNumberId, '5541990000002', 'Alô?').run();
    expect((await conversationOf(tenantId, m1.id)).status).toBe('waiting_human');
    expect(lab.chat.mock.calls.length).toBe(callsBefore);
    expect(await db.select().from(humanHandoffs).where(eq(humanHandoffs.conversationId, conv.id))).toHaveLength(1);
  });

  it('o atendente responde pelo WhatsApp, reenvia o que falhou e respeita a janela de 24h', async () => {
    const { tenantId, phoneNumberId } = await setup();
    const from = '5541990000004';
    const m1 = inbound(phoneNumberId, from, 'Quero falar com alguém');
    await m1.run();
    const conv = await conversationOf(tenantId, m1.id);
    const userId = undefined as unknown as string; // atendente sem usuário cadastrado no teste

    const sent = await convs.sendHumanMessage(tenantId, conv.id, 'Oi, aqui é a Ana.', userId);
    expect(sent!.status).toBe('sent');
    expect(meta.sent.at(-1)).toEqual({ to: from, body: 'Oi, aqui é a Ana.' });
    const after = await convs.getConversation(tenantId, conv.id);
    expect(after.aiPausedAt).not.toBeNull();
    expect(after.status).toBe('in_progress');

    // A Meta recusa: a mensagem fica registrada como não entregue, com o motivo.
    meta.replies.push(PAYMENT_ERROR);
    await expect(convs.sendHumanMessage(tenantId, conv.id, 'Seu pedido saiu.', userId)).rejects.toBeInstanceOf(BadGatewayException);
    const [failed] = await db.select().from(messages).where(and(eq(messages.conversationId, conv.id), eq(messages.status, 'failed')));
    expect(failed!.failureReason).toMatch(/pagamento/);

    const resent = await convs.resendMessage(tenantId, conv.id, failed!.id, userId);
    expect(resent.status).toBe('sent');
    expect(resent.retriedFrom).toBe(failed!.id);
    expect(meta.sent.at(-1)!.body).toBe('Seu pedido saiu.');
    await expect(convs.resendMessage(tenantId, conv.id, failed!.id, userId)).rejects.toBeInstanceOf(ConflictException);
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'conversation.message_resent', tenantId }));

    // Mais de 24h desde a última mensagem do cliente: nada é enviado.
    await db.update(whatsappMessageLogs).set({ createdAt: new Date(Date.now() - 25 * 3600_000) })
      .where(and(eq(whatsappMessageLogs.conversationId, conv.id), eq(whatsappMessageLogs.direction, 'inbound')));
    const before = meta.sent.length;
    await expect(convs.sendHumanMessage(tenantId, conv.id, 'Ainda aí?', userId)).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(meta.sent.length).toBe(before);

    // Devolver para a IA encerra a passagem e tira o "aguardando".
    const back = await convs.returnToAi(tenantId, conv.id);
    expect(back.aiPausedAt).toBeNull();
    expect(back.status).toBe('open');
  });

  it('situação do número: bloqueio por pagamento e nome de exibição, ignorando chamadas de voz', async () => {
    const { tenantId, phoneNumberId, accountId } = await setup();
    meta.health = {
      name_status: 'NON_EXISTS',
      health_status: {
        can_send_message: 'BLOCKED',
        entities: [
          { entity_type: 'PHONE_NUMBER', can_send_message: 'LIMITED', errors: [{ error_code: 138024, error_description: 'SIP not enabled' }] },
          { entity_type: 'WABA', can_send_message: 'BLOCKED', errors: [{ error_code: 141006, error_description: 'There is an error with the payment method.' }] },
          { entity_type: 'APP', can_send_message: 'AVAILABLE' },
        ],
      },
    };
    meta.replies.push(PAYMENT_ERROR);
    await inbound(phoneNumberId, '5541990000005', 'Oi').run();

    const health = await wa.getSendHealth(tenantId, accountId, true);
    expect(health.send).toBe('blocked');
    const text = health.reasons.map((r) => r.message).join(' | ');
    expect(text).toMatch(/forma de pagamento/);
    expect(text).toMatch(/nome de exibição/);
    expect(text).not.toMatch(/SIP/);
    expect(health.failedSinceLastSuccess).toBe(1);
    expect(health.lastFailure!.message).toMatch(/pagamento/);
    expect(health.lastInboundAt).not.toBeNull();

    // Meta liberada e "Verificar agora": o bloqueio guardado sai e a IA volta a responder.
    meta.health = { name_status: 'APPROVED', health_status: { can_send_message: 'AVAILABLE', entities: [] } };
    await wa.getSendHealth(tenantId, accountId, true);
    expect(redis.store.size).toBe(1); // só o cache da consulta
    const calls = lab.chat.mock.calls.length;
    await inbound(phoneNumberId, '5541990000006', 'Olá de novo').run();
    expect(lab.chat.mock.calls.length).toBe(calls + 1);
    const after = await wa.getSendHealth(tenantId, accountId);
    expect(after.failedSinceLastSuccess).toBe(0);
    expect(after.send).toBe('available');
  });

  it('última tentativa da fila sem sucesso passa a conversa para atendente', async () => {
    const { tenantId, phoneNumberId } = await setup();
    lab.chat.mockRejectedValue(new Error('modelo fora do ar'));
    const m = inbound(phoneNumberId, '5541990000007', 'Oi');
    await expect(m.run()).rejects.toThrow('modelo fora do ar');
    await wa.handOffUnanswered({ phoneNumberId, message: { id: m.id, from: '5541990000007', timestamp: '1', type: 'text' } });
    const conv = await conversationOf(tenantId, m.id);
    expect(conv.status).toBe('waiting_human');
    const [h] = await db.select().from(humanHandoffs).where(eq(humanHandoffs.conversationId, conv.id));
    expect(h!.reason).toMatch(/3 tentativas/);
  });

  it('uma organização não vê nem responde conversas de outra', async () => {
    const a = await setup();
    const b = await setup();
    const m = inbound(a.phoneNumberId, '5541990000008', 'Mensagem da organização A');
    await m.run();
    const conv = await conversationOf(a.tenantId, m.id);

    await expect(convs.sendHumanMessage(b.tenantId, conv.id, 'invasão', undefined as unknown as string)).rejects.toBeInstanceOf(NotFoundException);
    await expect(wa.sendHumanReply(b.tenantId, conv.id, 'invasão', undefined as unknown as string)).rejects.toBeInstanceOf(NotFoundException);
    await expect(wa.getSendHealth(b.tenantId, a.accountId)).rejects.toBeInstanceOf(NotFoundException);
    expect(meta.sent.some((s) => s.body === 'invasão')).toBe(false);

    // O histórico da organização B não traz nada da A.
    await inbound(b.phoneNumberId, '5541990000008', 'Oi, sou da B').run();
    expect(lastHistory()).toEqual([]);
  });
});
