import { Injectable, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { eq, lt, and } from 'drizzle-orm';
import { DRIZZLE_TOKEN, type DrizzleDB } from '../../database/database.module';
import { outboxEvents } from '../../database/schema/audit';

@Injectable()
export class OutboxRelayService {
  constructor(@Inject(DRIZZLE_TOKEN) private readonly db: DrizzleDB) {}

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
        // TODO Sprint 5: publish to BullMQ queues based on eventType
        // For now, mark as published (events will be consumed by workers)
        await this.db
          .update(outboxEvents)
          .set({ published: 'published', publishedAt: new Date() })
          .where(eq(outboxEvents.id, event.id));
      } catch (err) {
        await this.db
          .update(outboxEvents)
          .set({ lastError: String(err) })
          .where(eq(outboxEvents.id, event.id));
      }
    }
  }
}
