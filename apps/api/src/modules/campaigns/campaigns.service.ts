import {
  Injectable, Inject, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { eq, and, isNull, desc, inArray } from 'drizzle-orm';
import { DRIZZLE_TOKEN, type DrizzleDB } from '../../database/database.module';
import { segments, campaigns, campaignRecipients } from '../../database/schema/campaigns';
import { contacts, contactIdentities, consents, suppressions } from '../../database/schema/contacts';
import { whatsappAccounts } from '../../database/schema/whatsapp';
import { AuditService } from '../../shared/audit/audit.service';
import { createId } from '../../database/utils/id';

export interface SendPolicyResult {
  eligible: number;
  blocked: number;
  reasons: Record<string, number>;
  sampleBlocked: Array<{ phone: string; reason: string }>;
}

@Injectable()
export class CampaignsService {
  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: DrizzleDB,
    private readonly auditService: AuditService,
  ) {}

  // ─── Segments ────────────────────────────────────────────────────────────────

  async listSegments(tenantId: string) {
    return this.db
      .select()
      .from(segments)
      .where(and(eq(segments.tenantId, tenantId), isNull(segments.deletedAt)))
      .orderBy(desc(segments.createdAt));
  }

  async createSegment(tenantId: string, userId: string, data: { name: string; description?: string; filters?: Record<string, unknown> }) {
    const [seg] = await this.db
      .insert(segments)
      .values({
        tenantId,
        name: data.name,
        description: data.description,
        filters: data.filters ?? {},
        createdByUserId: userId,
      })
      .returning();
    return seg!;
  }

  async deleteSegment(tenantId: string, segmentId: string) {
    const [seg] = await this.db
      .select()
      .from(segments)
      .where(and(eq(segments.id, segmentId), eq(segments.tenantId, tenantId)));
    if (!seg) throw new NotFoundException('Segment not found');
    await this.db
      .update(segments)
      .set({ deletedAt: new Date() })
      .where(eq(segments.id, segmentId));
  }

  // ─── Campaigns ───────────────────────────────────────────────────────────────

  async listCampaigns(tenantId: string) {
    return this.db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.tenantId, tenantId), isNull(campaigns.deletedAt)))
      .orderBy(desc(campaigns.createdAt));
  }

  async getCampaign(tenantId: string, campaignId: string) {
    const [row] = await this.db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.tenantId, tenantId)));
    if (!row) throw new NotFoundException('Campaign not found');
    return row;
  }

  async createCampaign(
    tenantId: string,
    userId: string,
    data: {
      name: string;
      agentId?: string;
      segmentId?: string;
      objective?: string;
      channel?: string;
      templateName?: string;
      templateLanguage?: string;
      templateComponents?: unknown[];
      scheduledAt?: string;
    },
  ) {
    const [campaign] = await this.db
      .insert(campaigns)
      .values({
        tenantId,
        agentId: data.agentId,
        name: data.name,
        objective: data.objective,
        channel: data.channel ?? 'whatsapp',
        segmentId: data.segmentId,
        templateName: data.templateName,
        templateLanguage: data.templateLanguage ?? 'pt_BR',
        templateComponents: data.templateComponents ?? [],
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
        createdByUserId: userId,
      })
      .returning();

    await this.auditService.log({
      action: 'campaign.create',
      resourceType: 'campaign',
      resourceId: campaign!.id,
      tenantId,
      userId,
      metadata: { name: data.name },
    });

    return campaign!;
  }

  // ─── Send Policy Gateway ─────────────────────────────────────────────────────

  async checkEligibility(tenantId: string, campaignId: string): Promise<SendPolicyResult> {
    const campaign = await this.getCampaign(tenantId, campaignId);

    if (!campaign.segmentId) {
      throw new BadRequestException('Campaign has no segment selected');
    }

    // Check WhatsApp is connected
    const [wa] = await this.db
      .select()
      .from(whatsappAccounts)
      .where(and(eq(whatsappAccounts.tenantId, tenantId), isNull(whatsappAccounts.deletedAt)))
      .limit(1);

    if (!wa || wa.status !== 'connected') {
      throw new BadRequestException('Nenhuma conta WhatsApp conectada');
    }

    if (!campaign.templateName) {
      throw new BadRequestException('Campanha requer um template aprovado');
    }

    // Get all contacts with whatsapp identities
    const identities = await this.db
      .select({
        contactId: contactIdentities.contactId,
        phone: contactIdentities.normalizedValue,
      })
      .from(contactIdentities)
      .where(
        and(
          eq(contactIdentities.tenantId, tenantId),
          eq(contactIdentities.channel, 'whatsapp'),
        ),
      );

    const results: SendPolicyResult = {
      eligible: 0,
      blocked: 0,
      reasons: {},
      sampleBlocked: [],
    };

    for (const identity of identities) {
      const blockReason = await this.checkSingleRecipient(
        tenantId,
        identity.contactId,
        identity.phone,
      );

      if (blockReason) {
        results.blocked++;
        results.reasons[blockReason] = (results.reasons[blockReason] ?? 0) + 1;
        if (results.sampleBlocked.length < 5) {
          results.sampleBlocked.push({ phone: identity.phone, reason: blockReason });
        }
      } else {
        results.eligible++;
      }
    }

    // Update campaign counts
    await this.db
      .update(campaigns)
      .set({
        totalTargeted: identities.length,
        totalEligible: results.eligible,
        totalBlocked: results.blocked,
        updatedAt: new Date(),
      })
      .where(eq(campaigns.id, campaignId));

    return results;
  }

  private async checkSingleRecipient(
    tenantId: string,
    contactId: string,
    phone: string,
  ): Promise<string | null> {
    // 1. Check suppression list
    const [suppressed] = await this.db
      .select()
      .from(suppressions)
      .where(
        and(
          eq(suppressions.tenantId, tenantId),
          eq(suppressions.channel, 'whatsapp'),
          eq(suppressions.normalizedValue, phone),
        ),
      )
      .limit(1);
    if (suppressed) return 'opt_out';

    // 2. Check consent
    const [consent] = await this.db
      .select()
      .from(consents)
      .where(
        and(
          eq(consents.contactId, contactId),
          eq(consents.tenantId, tenantId),
          eq(consents.channel, 'whatsapp'),
          eq(consents.purpose, 'marketing'),
          eq(consents.status, 'granted'),
        ),
      )
      .limit(1);
    if (!consent) return 'no_consent';

    // 3. Check if contact is blocked
    const [contact] = await this.db
      .select({ isBlocked: contacts.isBlocked })
      .from(contacts)
      .where(and(eq(contacts.id, contactId), eq(contacts.tenantId, tenantId)))
      .limit(1);
    if (contact?.isBlocked) return 'contact_blocked';

    return null;
  }

  async launchCampaign(tenantId: string, campaignId: string, userId: string) {
    const campaign = await this.getCampaign(tenantId, campaignId);

    if (!['draft', 'scheduled'].includes(campaign.status)) {
      throw new BadRequestException(`Campanha não pode ser iniciada (status: ${campaign.status})`);
    }

    // Run eligibility check
    const eligibility = await this.checkEligibility(tenantId, campaignId);

    if (eligibility.eligible === 0) {
      throw new BadRequestException('Nenhum destinatário elegível. Verifique consentimentos e opt-outs.');
    }

    await this.db
      .update(campaigns)
      .set({ status: 'running', startedAt: new Date(), updatedAt: new Date() })
      .where(eq(campaigns.id, campaignId));

    await this.auditService.log({
      action: 'campaign.launch',
      resourceType: 'campaign',
      resourceId: campaignId,
      tenantId,
      userId,
      metadata: { eligible: eligibility.eligible, blocked: eligibility.blocked },
    });

    return { ...campaign, status: 'running', eligibility };
  }
}
