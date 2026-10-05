import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_TOKEN, type DrizzleDB } from '../../database/database.module';
import { outboxEvents, type NewAuditLog } from '../../database/schema/audit';

export const OUTBOX_EVENTS = {
  AGENT_CREATED: 'agent.created.v1',
  AGENT_PUBLISHED: 'agent.published.v1',
  KNOWLEDGE_SOURCE_PROCESSED: 'knowledge.source.processed.v1',
  CONVERSATION_UPDATED: 'conversation.updated.v1',
  MESSAGE_RECEIVED: 'message.received.v1',
  MESSAGE_SENT: 'message.sent.v1',
  HANDOFF_STARTED: 'handoff.started.v1',
  CONTACT_IMPORTED: 'contact.imported.v1',
  APPOINTMENT_CREATED: 'appointment.created.v1',
  CAMPAIGN_STARTED: 'campaign.started.v1',
  USAGE_RECORDED: 'usage.recorded.v1',
} as const;

export type OutboxEventType = (typeof OUTBOX_EVENTS)[keyof typeof OUTBOX_EVENTS];

@Injectable()
export class OutboxService {
  constructor(@Inject(DRIZZLE_TOKEN) private readonly db: DrizzleDB) {}

  async publish(
    db: DrizzleDB,
    eventType: OutboxEventType,
    payload: Record<string, unknown>,
    tenantId?: string,
  ): Promise<void> {
    await db.insert(outboxEvents).values({
      tenantId: tenantId ?? null,
      eventType,
      payload,
      published: 'pending',
    });
  }
}
