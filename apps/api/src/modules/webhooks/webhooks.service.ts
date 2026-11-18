import { BadRequestException, Inject, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, asc, eq, isNull } from 'drizzle-orm';
import * as crypto from 'crypto';
import { lookup } from 'dns/promises';
import { isIP } from 'net';
import { DRIZZLE_TOKEN, type DrizzleDB } from '../../database/database.module';
import { outboundWebhooks, type OutboundWebhook } from '../../database/schema/channels';
import { outboxEvents } from '../../database/schema/audit';
import { EncryptionService } from '../../shared/crypto/encryption.service';
import { AuditService } from '../../shared/audit/audit.service';
import { PlanLimitsService } from '../../shared/plans/plan-limits.service';
import { OutboxRelayService } from '../../shared/outbox/outbox-relay.service';

/** Eventos que o cliente pode assinar. */
export const WEBHOOK_EVENTS = {
  'conversation.created': 'Nova conversa iniciada (webchat ou WhatsApp)',
  'message.received': 'Mensagem recebida de um contato',
  'message.replied': 'Resposta enviada pelo agente de IA',
  'conversation.handoff': 'Conversa assumida por um atendente humano',
  'conversation.resolved': 'Conversa encerrada',
  'meeting.created': 'Reunião criada na agenda pelo agente',
  'meeting.canceled': 'Reunião cancelada',
} as const;

export type WebhookEvent = keyof typeof WEBHOOK_EVENTS;
export const WEBHOOK_EVENT_NAMES = Object.keys(WEBHOOK_EVENTS) as WebhookEvent[];

const DELIVERY_EVENT_TYPE = 'webhook.delivery';
const DELIVERY_TIMEOUT_MS = 10_000;

export interface WebhookView {
  id: string;
  url: string;
  description: string | null;
  events: string[];
  isActive: boolean;
  lastDeliveryAt: Date | null;
  lastDeliveryStatus: number | null;
  lastDeliveryError: string | null;
  consecutiveFailures: number;
  createdAt: Date;
}

function isPrivateAddress(ip: string): boolean {
  if (ip.includes(':')) {
    const v6 = ip.toLowerCase();
    if (v6.startsWith('::ffff:')) return isPrivateAddress(v6.slice(7));
    return v6 === '::1' || v6 === '::' || v6.startsWith('fc') || v6.startsWith('fd') || v6.startsWith('fe80');
  }
  const [a = 0, b = 0] = ip.split('.').map(Number);
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  );
}

export function signPayload(secret: string, timestamp: string, body: string): string {
  return crypto.createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
}

/**
 * Webhooks de saída (plano Pro em diante). Entrega assinada (HMAC-SHA256),
 * com novas tentativas pelo outbox e bloqueio de destinos em rede interna (SSRF).
 */
@Injectable()
export class WebhooksService implements OnModuleInit {
  private readonly logger = new Logger(WebhooksService.name);
  private readonly allowInsecure: boolean;

  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: DrizzleDB,
    private readonly encryption: EncryptionService,
    private readonly audit: AuditService,
    private readonly planLimits: PlanLimitsService,
    private readonly relay: OutboxRelayService,
    config: ConfigService,
  ) {
    this.allowInsecure = config.get<string>('NODE_ENV') !== 'production';
  }

  onModuleInit(): void {
    this.relay.registerHandler(DELIVERY_EVENT_TYPE, (payload) => this.deliver(payload));
  }

  private toView(row: OutboundWebhook): WebhookView {
    return {
      id: row.id,
      url: row.url,
      description: row.description,
      events: (row.events as string[]) ?? [],
      isActive: row.isActive,
      lastDeliveryAt: row.lastDeliveryAt,
      lastDeliveryStatus: row.lastDeliveryStatus,
      lastDeliveryError: row.lastDeliveryError,
      consecutiveFailures: row.consecutiveFailures,
      createdAt: row.createdAt,
    };
  }

  events() {
    return WEBHOOK_EVENT_NAMES.map((name) => ({ name, description: WEBHOOK_EVENTS[name] }));
  }

  async list(tenantId: string): Promise<WebhookView[]> {
    const rows = await this.db
      .select()
      .from(outboundWebhooks)
      .where(and(eq(outboundWebhooks.tenantId, tenantId), isNull(outboundWebhooks.deletedAt)))
      .orderBy(asc(outboundWebhooks.createdAt));
    return rows.map((r) => this.toView(r));
  }

  private async getRow(tenantId: string, id: string): Promise<OutboundWebhook> {
    const [row] = await this.db
      .select()
      .from(outboundWebhooks)
      .where(and(eq(outboundWebhooks.id, id), eq(outboundWebhooks.tenantId, tenantId), isNull(outboundWebhooks.deletedAt)))
      .limit(1);
    if (!row) throw new NotFoundException('Webhook não encontrado');
    return row;
  }

  /** Só https público; http e rede interna apenas fora de produção. */
  async assertSafeUrl(raw: string): Promise<URL> {
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      throw new BadRequestException('URL inválida');
    }
    if (url.protocol !== 'https:' && !(this.allowInsecure && url.protocol === 'http:')) {
      throw new BadRequestException('O webhook precisa usar https://');
    }
    if (url.username || url.password) throw new BadRequestException('Não inclua usuário/senha na URL');
    if (this.allowInsecure) return url;

    const host = url.hostname.replace(/^\[|\]$/g, '');
    const addresses = isIP(host) ? [host] : (await lookup(host, { all: true }).catch(() => [])).map((a) => a.address);
    if (addresses.length === 0) throw new BadRequestException('Não foi possível resolver o domínio do webhook');
    if (addresses.some(isPrivateAddress)) throw new BadRequestException('O webhook não pode apontar para rede interna');
    return url;
  }

  private validateEvents(events: string[]): WebhookEvent[] {
    const invalid = events.filter((e) => !(WEBHOOK_EVENT_NAMES as string[]).includes(e));
    if (invalid.length > 0) throw new BadRequestException(`Eventos desconhecidos: ${invalid.join(', ')}`);
    if (events.length === 0) throw new BadRequestException('Escolha pelo menos um evento');
    return events as WebhookEvent[];
  }

  async create(
    tenantId: string,
    dto: { url: string; events: string[]; description?: string },
    userId: string,
  ): Promise<WebhookView & { secret: string }> {
    await this.planLimits.assertFeature(tenantId, 'outboundWebhooks');
    await this.planLimits.assertCanAdd(tenantId, 'outboundWebhooks');
    const url = await this.assertSafeUrl(dto.url);
    const events = this.validateEvents(dto.events);
    const secret = `whsec_${crypto.randomBytes(24).toString('base64url')}`;

    const [row] = await this.planLimits.withSlot(tenantId, 'outboundWebhooks', (tx) =>
      tx
      .insert(outboundWebhooks)
      .values({
        tenantId,
        url: url.toString(),
        description: dto.description?.trim() || null,
        encryptedSecret: this.encryption.encrypt(secret),
        events,
        createdByUserId: userId,
      })
      .returning(),
    );

    await this.audit.log({
      tenantId,
      userId,
      action: 'webhook.created',
      resourceType: 'outbound_webhook',
      resourceId: row!.id,
      newState: { url: row!.url, events },
    });
    // O segredo só é mostrado agora; depois, apenas rotação gera outro.
    return { ...this.toView(row!), secret };
  }

  async update(
    tenantId: string,
    id: string,
    dto: { url?: string; events?: string[]; description?: string; isActive?: boolean },
    userId: string,
  ): Promise<WebhookView> {
    const row = await this.getRow(tenantId, id);
    await this.planLimits.assertWithinPlan(tenantId, 'outboundWebhooks', row.id);
    const patch: Partial<OutboundWebhook> = { updatedAt: new Date() };
    if (dto.url !== undefined) patch.url = (await this.assertSafeUrl(dto.url)).toString();
    if (dto.events !== undefined) patch.events = this.validateEvents(dto.events);
    if (dto.description !== undefined) patch.description = dto.description.trim() || null;
    if (dto.isActive !== undefined) {
      patch.isActive = dto.isActive;
      if (dto.isActive) patch.consecutiveFailures = 0;
    }
    const [updated] = await this.db
      .update(outboundWebhooks)
      .set(patch)
      .where(and(eq(outboundWebhooks.id, id), eq(outboundWebhooks.tenantId, tenantId)))
      .returning();
    await this.audit.log({
      tenantId,
      userId,
      action: 'webhook.updated',
      resourceType: 'outbound_webhook',
      resourceId: id,
      previousState: { url: row.url, events: row.events, isActive: row.isActive },
      newState: { url: updated!.url, events: updated!.events, isActive: updated!.isActive },
    });
    return this.toView(updated!);
  }

  async rotateSecret(tenantId: string, id: string, userId: string): Promise<{ secret: string }> {
    await this.getRow(tenantId, id);
    await this.planLimits.assertWithinPlan(tenantId, 'outboundWebhooks', id);
    const secret = `whsec_${crypto.randomBytes(24).toString('base64url')}`;
    await this.db
      .update(outboundWebhooks)
      .set({ encryptedSecret: this.encryption.encrypt(secret), updatedAt: new Date() })
      .where(and(eq(outboundWebhooks.id, id), eq(outboundWebhooks.tenantId, tenantId)));
    await this.audit.log({ tenantId, userId, action: 'webhook.secret_rotated', resourceType: 'outbound_webhook', resourceId: id });
    return { secret };
  }

  async remove(tenantId: string, id: string, userId: string): Promise<void> {
    await this.getRow(tenantId, id);
    await this.db
      .update(outboundWebhooks)
      .set({ deletedAt: new Date(), isActive: false, encryptedSecret: '', updatedAt: new Date() })
      .where(and(eq(outboundWebhooks.id, id), eq(outboundWebhooks.tenantId, tenantId)));
    await this.audit.log({ tenantId, userId, action: 'webhook.deleted', resourceType: 'outbound_webhook', resourceId: id });
  }

  /** Envia agora um evento de teste e devolve o resultado (sem nova tentativa). */
  async sendTest(tenantId: string, id: string): Promise<{ ok: boolean; status: number | null; error: string | null }> {
    const row = await this.getRow(tenantId, id);
    await this.planLimits.assertWithinPlan(tenantId, 'outboundWebhooks', row.id);
    try {
      const status = await this.post(row, 'webhook.test', crypto.randomUUID(), { message: 'Teste do Walletz Studio IA' });
      return { ok: true, status, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, status: null, error: message };
    }
  }

  /**
   * Enfileira o evento para todos os webhooks ativos do tenant que o assinam.
   * Nunca lança: falha ao notificar não pode derrubar o atendimento.
   */
  async emit(tenantId: string, event: WebhookEvent, data: Record<string, unknown>): Promise<void> {
    try {
      const hooks = await this.db
        .select({ id: outboundWebhooks.id, events: outboundWebhooks.events })
        .from(outboundWebhooks)
        .where(
          and(
            eq(outboundWebhooks.tenantId, tenantId),
            eq(outboundWebhooks.isActive, true),
            isNull(outboundWebhooks.deletedAt),
          ),
        );
      if (hooks.length === 0) return;
      // Plano: organização ativa, webhooks no plano e só os webhooks dentro do limite (os mais antigos).
      if (!(await this.planLimits.isUsable(tenantId, { feature: 'outboundWebhooks' }))) return;
      const allowed = await this.planLimits.allowedIds(tenantId, 'outboundWebhooks');
      const targets = hooks.filter((h) => allowed.has(h.id) && ((h.events as string[]) ?? []).includes(event));
      if (targets.length === 0) return;
      const occurredAt = new Date().toISOString();
      await this.db.insert(outboxEvents).values(
        targets.map((h) => ({
          tenantId,
          eventType: DELIVERY_EVENT_TYPE,
          payload: { webhookId: h.id, event, deliveryId: crypto.randomUUID(), occurredAt, data },
          published: 'pending',
        })),
      );
    } catch (err) {
      this.logger.error(`Falha ao enfileirar webhook ${event} (tenant ${tenantId}): ${String(err)}`);
    }
  }

  /** Handler do outbox: uma entrega. Lança erro para nova tentativa. */
  private async deliver(payload: Record<string, unknown>): Promise<void> {
    const webhookId = String(payload['webhookId'] ?? '');
    const [row] = await this.db.select().from(outboundWebhooks).where(eq(outboundWebhooks.id, webhookId)).limit(1);
    if (!row || row.deletedAt || !row.isActive) return; // removido/pausado: descarta
    // Plano mudou entre o enfileiramento e a entrega: não entrega (e não tenta de novo).
    const blocked = await this.planLimits.usageBlock(row.tenantId, {
      feature: 'outboundWebhooks',
      item: { resource: 'outboundWebhooks', id: row.id },
    });
    if (blocked) {
      this.logger.warn(`Entrega do webhook ${row.id} descartada: ${blocked.message}`);
      return;
    }

    const event = String(payload['event']);
    const deliveryId = String(payload['deliveryId']);
    const data = { ...(payload['data'] as Record<string, unknown>), occurredAt: payload['occurredAt'] };
    try {
      const status = await this.post(row, event, deliveryId, data);
      await this.db
        .update(outboundWebhooks)
        .set({ lastDeliveryAt: new Date(), lastDeliveryStatus: status, lastDeliveryError: null, consecutiveFailures: 0 })
        .where(eq(outboundWebhooks.id, row.id));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const failures = row.consecutiveFailures + 1;
      await this.db
        .update(outboundWebhooks)
        .set({
          lastDeliveryAt: new Date(),
          lastDeliveryError: message.slice(0, 300),
          consecutiveFailures: failures,
          // Pausa após 50 falhas seguidas; o cliente reativa pelo painel.
          ...(failures >= 50 ? { isActive: false } : {}),
        })
        .where(eq(outboundWebhooks.id, row.id));
      throw err;
    }
  }

  private async post(row: OutboundWebhook, event: string, deliveryId: string, data: Record<string, unknown>): Promise<number> {
    const secret = this.encryption.tryDecrypt(row.encryptedSecret);
    if (!secret) throw new Error('Segredo do webhook ilegível');
    const url = await this.assertSafeUrl(row.url);
    const body = JSON.stringify({ id: deliveryId, event, tenantId: row.tenantId, data });
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const res = await fetch(url, {
      method: 'POST',
      redirect: 'manual',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Walletz-Webhooks/1.0',
        'X-Walletz-Event': event,
        'X-Walletz-Delivery': deliveryId,
        'X-Walletz-Timestamp': timestamp,
        'X-Walletz-Signature': `sha256=${signPayload(secret, timestamp, body)}`,
      },
      body,
      signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
    });
    if (res.status < 200 || res.status >= 300) {
      await this.db
        .update(outboundWebhooks)
        .set({ lastDeliveryStatus: res.status })
        .where(eq(outboundWebhooks.id, row.id));
      throw new Error(`HTTP ${res.status}`);
    }
    return res.status;
  }
}
