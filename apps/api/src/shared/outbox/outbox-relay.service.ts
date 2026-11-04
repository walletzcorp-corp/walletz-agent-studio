import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { eq } from 'drizzle-orm';
import { DRIZZLE_TOKEN, type DrizzleDB } from '../../database/database.module';
import { outboxEvents } from '../../database/schema/audit';

export const OUTBOX_QUEUE = 'outbox';

@Injectable()
export class OutboxRelayService {
  private readonly logger = new Logger(OutboxRelayService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: DrizzleDB,
    @InjectQueue(OUTBOX_QUEUE) private readonly outboxQueue: Queue,
  ) {}

  @Cron(CronExpression.EVERY_5_SECONDS)
  async relayPendingEvents(): Promise<void> {
    const pending = await this.db
      .select()
      .from(outboxEvents)
      .where(eq(outboxEvents.published, 'pending'))
      .limit(100)
      .for('update', { skipLocked: true });

    for (const event of pending) {
      try {
        await this.outboxQueue.add(event.eventType, {
          id: event.id,
          tenantId: event.tenantId,
          eventType: event.eventType,
          aggregateType: event.aggregateType,
          aggregateId: event.aggregateId,
          payload: event.payload,
          createdAt: event.createdAt,
        });

        await this.db
          .update(outboxEvents)
          .set({ published: 'published', publishedAt: new Date() })
          .where(eq(outboxEvents.id, event.id));
      } catch (err) {
        this.logger.error(`Failed to publish outbox event ${event.id}: ${String(err)}`);
        await this.db
          .update(outboxEvents)
          .set({ lastError: String(err) })
          .where(eq(outboxEvents.id, event.id));
      }
    }
  }
}
