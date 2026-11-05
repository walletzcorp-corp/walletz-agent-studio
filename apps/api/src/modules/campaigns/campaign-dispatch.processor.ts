import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import type { Job } from 'bullmq';
import { DRIZZLE_TOKEN, type DrizzleDB } from '../../database/database.module';
import { campaigns, campaignRecipients } from '../../database/schema/campaigns';
import { WhatsappService } from '../whatsapp/whatsapp.service';

export const CAMPAIGN_DISPATCH_QUEUE = 'campaign-dispatch';

export interface CampaignDispatchJobData {
  campaignId: string;
  tenantId: string;
  recipientId: string;
  phone: string;
  accountId: string;
  templateName: string;
  templateLanguage: string;
  templateComponents: unknown[];
}

@Processor(CAMPAIGN_DISPATCH_QUEUE)
export class CampaignDispatchProcessor extends WorkerHost {
  private readonly logger = new Logger(CampaignDispatchProcessor.name);

  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: DrizzleDB,
    private readonly whatsappService: WhatsappService,
  ) {
    super();
  }

  async process(job: Job<CampaignDispatchJobData>): Promise<void> {
    const {
      campaignId, tenantId, recipientId, phone, accountId,
      templateName, templateLanguage, templateComponents,
    } = job.data;

    this.logger.log(`Dispatching campaign ${campaignId} to ${phone}`);

    try {
      await this.whatsappService.sendTemplateMessage(tenantId, accountId, {
        to: phone,
        templateName,
        templateLanguage,
        templateComponents,
        idempotencyKey: `campaign-${campaignId}-${recipientId}`,
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      const isFinalAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
      this.logger.error(
        `Campaign dispatch failed for recipient ${recipientId} ` +
        `(attempt ${job.attemptsMade + 1}/${job.opts.attempts ?? 1}): ${reason}`,
      );

      // Only the last attempt is a real failure; earlier ones are retried by BullMQ.
      if (!isFinalAttempt) throw err;

      await this.db.update(campaignRecipients)
        .set({ status: 'failed', failedAt: new Date() })
        .where(eq(campaignRecipients.id, recipientId));
      await this.db.update(campaigns)
        .set({ totalFailed: sql`${campaigns.totalFailed} + 1`, updatedAt: new Date() })
        .where(and(eq(campaigns.id, campaignId), eq(campaigns.tenantId, tenantId)));
      await this.closeCampaignIfDone(campaignId, tenantId);
      throw err;
    }

    await this.db.update(campaignRecipients)
      .set({ status: 'sent', sentAt: new Date() })
      .where(eq(campaignRecipients.id, recipientId));
    await this.db.update(campaigns)
      .set({ totalSent: sql`${campaigns.totalSent} + 1`, updatedAt: new Date() })
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.tenantId, tenantId)));
    await this.closeCampaignIfDone(campaignId, tenantId);

    this.logger.log(`Sent campaign ${campaignId} message to ${phone}`);
  }

  // Single atomic statement: concurrent workers cannot close the campaign twice.
  private async closeCampaignIfDone(campaignId: string, tenantId: string): Promise<void> {
    await this.db.update(campaigns)
      .set({
        status: sql`CASE WHEN ${campaigns.totalSent} = 0 THEN 'failed'::campaign_status ELSE 'completed'::campaign_status END`,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(
        eq(campaigns.id, campaignId),
        eq(campaigns.tenantId, tenantId),
        eq(campaigns.status, 'running'),
        sql`${campaigns.totalSent} + ${campaigns.totalFailed} >= ${campaigns.totalEligible}`,
      ));
  }
}
