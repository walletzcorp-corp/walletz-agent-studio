import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import type { Job } from 'bullmq';
import { DRIZZLE_TOKEN, type DrizzleDB } from '../../database/database.module';
import { messages } from '../../database/schema/conversations';
import { contactIdentities } from '../../database/schema/contacts';
import { whatsappAccounts } from '../../database/schema/whatsapp';
import { WhatsappService } from '../whatsapp/whatsapp.service';

export const INBOX_DISPATCH_QUEUE = 'inbox-dispatch';

export interface InboxDispatchJobData {
  messageId: string;
  conversationId: string;
  tenantId: string;
  text: string;
  contactId: string;
}

@Processor(INBOX_DISPATCH_QUEUE)
export class InboxDispatchProcessor extends WorkerHost {
  private readonly logger = new Logger(InboxDispatchProcessor.name);

  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: DrizzleDB,
    private readonly whatsappService: WhatsappService,
  ) {
    super();
  }

  async process(job: Job<InboxDispatchJobData>): Promise<void> {
    const { messageId, tenantId, text, contactId } = job.data;

    this.logger.log(`Dispatching inbox message ${messageId}`);

    const [wa] = await this.db
      .select({ id: whatsappAccounts.id })
      .from(whatsappAccounts)
      .where(
        and(
          eq(whatsappAccounts.tenantId, tenantId),
          eq(whatsappAccounts.status, 'connected'),
          isNull(whatsappAccounts.deletedAt),
        ),
      )
      .limit(1);

    if (!wa) {
      this.logger.warn(`No connected WhatsApp account for tenant ${tenantId}`);
      await this.db
        .update(messages)
        .set({
          status: 'failed',
          failedAt: new Date(),
          failureReason: 'No connected WhatsApp account',
        })
        .where(eq(messages.id, messageId));
      return;
    }

    const [identity] = await this.db
      .select({ phone: contactIdentities.normalizedValue })
      .from(contactIdentities)
      .where(
        and(
          eq(contactIdentities.tenantId, tenantId),
          eq(contactIdentities.contactId, contactId),
          eq(contactIdentities.channel, 'whatsapp'),
        ),
      )
      .limit(1);

    if (!identity) {
      this.logger.warn(`Contact ${contactId} has no WhatsApp phone`);
      await this.db
        .update(messages)
        .set({
          status: 'failed',
          failedAt: new Date(),
          failureReason: 'Contact has no WhatsApp phone',
        })
        .where(eq(messages.id, messageId));
      return;
    }

    try {
      await this.whatsappService.sendTextMessage(tenantId, wa.id, {
        to: identity.phone,
        text,
        idempotencyKey: `inbox-${messageId}`,
      });

      await this.db
        .update(messages)
        .set({ status: 'sent', sentAt: new Date() })
        .where(eq(messages.id, messageId));

      this.logger.log(`Sent inbox message ${messageId} to ${identity.phone}`);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to send inbox message ${messageId}: ${reason}`);
      await this.db
        .update(messages)
        .set({ status: 'failed', failedAt: new Date(), failureReason: reason })
        .where(eq(messages.id, messageId));
      throw err;
    }
  }
}
