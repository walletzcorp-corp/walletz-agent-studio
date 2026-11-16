import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { eq, and, asc } from 'drizzle-orm';
import { DRIZZLE_TOKEN, type DrizzleDB } from '../../database/database.module';
import { outboxEvents } from '../../database/schema/audit';

/** Handler de um tipo de evento. Lançar erro = nova tentativa com backoff. */
export type OutboxHandler = (payload: Record<string, unknown>, event: { id: string; tenantId: string | null }) => Promise<void>;

const MAX_ATTEMPTS = 6;
/** Espera antes da tentativa N (segundos): 30s, 1min, 2min, 4min, 8min. */
const backoffSeconds = (attempt: number) => 30 * 2 ** Math.max(0, attempt - 1);

/**
 * Entrega os eventos do outbox. Módulos registram handlers por tipo
 * (ex.: webhooks de saída). Eventos sem handler são só marcados como publicados.
 */
@Injectable()
export class OutboxRelayService {
  private readonly logger = new Logger(OutboxRelayService.name);
  private readonly handlers = new Map<string, OutboxHandler>();
  private running = false;

  constructor(@Inject(DRIZZLE_TOKEN) private readonly db: DrizzleDB) {}

  registerHandler(eventType: string, handler: OutboxHandler): void {
    this.handlers.set(eventType, handler);
  }

  @Cron(CronExpression.EVERY_5_SECONDS)
  async relayPendingEvents(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const pending = await this.db
        .select()
        .from(outboxEvents)
        .where(eq(outboxEvents.published, 'pending'))
        .orderBy(asc(outboxEvents.createdAt))
        .limit(100);

      const now = Date.now();
      for (const event of pending) {
        const payload = (event.payload ?? {}) as Record<string, unknown>;
        const nextAttemptAt = typeof payload['_nextAttemptAt'] === 'string' ? Date.parse(payload['_nextAttemptAt']) : 0;
        if (nextAttemptAt > now) continue;

        const handler = this.handlers.get(event.eventType);
        if (!handler) {
          await this.mark(event.id, 'published');
          continue;
        }
        try {
          await handler(payload, { id: event.id, tenantId: event.tenantId });
          await this.mark(event.id, 'published');
        } catch (err) {
          const attempts = Number(event.retryCount) + 1;
          const error = err instanceof Error ? err.message : String(err);
          const failed = attempts >= MAX_ATTEMPTS;
          await this.db
            .update(outboxEvents)
            .set({
              retryCount: String(attempts),
              lastError: error.slice(0, 500),
              published: failed ? 'failed' : 'pending',
              payload: { ...payload, _nextAttemptAt: new Date(now + backoffSeconds(attempts) * 1000).toISOString() },
            })
            .where(and(eq(outboxEvents.id, event.id), eq(outboxEvents.published, 'pending')));
          if (failed) this.logger.warn(`Evento ${event.eventType} ${event.id} desistido após ${attempts} tentativas`);
        }
      }
    } catch (err) {
      this.logger.error(`Falha no relay do outbox: ${String(err)}`);
    } finally {
      this.running = false;
    }
  }

  private async mark(id: string, status: 'published' | 'failed'): Promise<void> {
    await this.db
      .update(outboxEvents)
      .set({ published: status, publishedAt: new Date() })
      .where(eq(outboxEvents.id, id));
  }
}
