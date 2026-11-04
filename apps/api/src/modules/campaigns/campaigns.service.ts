import {
  Injectable, Inject, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { eq, and, isNull, desc, gte, or } from 'drizzle-orm';
import { DRIZZLE_TOKEN, type DrizzleDB } from '../../database/database.module';
import { segments, campaigns } from '../../database/schema/campaigns';
import { contacts, contactIdentities, consents, suppressions } from '../../database/schema/contacts';
import { whatsappAccounts, whatsappTemplates, whatsappMessageLogs } from '../../database/schema/whatsapp';
import { AuditService } from '../../shared/audit/audit.service';

// Frequency-cap window: a contact may receive at most 1 outbound campaign message per window
const FREQUENCY_CAP_HOURS = 24;

// Template categories that conflict with outbound marketing campaigns
const BLOCKED_TEMPLATE_CATEGORIES = ['AUTHENTICATION'];

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
  //
  // Decision order (mirrors the product spec):
  //   1. Número válido?
  //   2. Tem consentimento?
  //   3. Está em opt-out?
  //   4. Existe template aprovado? (campaign-level)
  //   5. Finalidade combina com o template? (campaign-level)
  //   6. Contato já recebeu mensagem recentemente? (frequency cap)
  //   7. Dentro das políticas da empresa?

  async checkEligibility(tenantId: string, campaignId: string): Promise<SendPolicyResult> {
    const campaign = await this.getCampaign(tenantId, campaignId);

    if (!campaign.segmentId) {
      throw new BadRequestException('Campanha sem segmento selecionado');
    }

    // ── Check 4 (campaign-level): WhatsApp connected ──
    const [wa] = await this.db
      .select()
      .from(whatsappAccounts)
      .where(and(eq(whatsappAccounts.tenantId, tenantId), isNull(whatsappAccounts.deletedAt)))
      .limit(1);

    if (!wa || wa.status !== 'connected') {
      throw new BadRequestException('Nenhuma conta WhatsApp conectada');
    }

    // ── Check 4 (campaign-level): template name set ──
    if (!campaign.templateName) {
      throw new BadRequestException('Campanha sem template definido');
    }

    // ── Check 4 (campaign-level): template exists and is APPROVED ──
    const [approvedTemplate] = await this.db
      .select({ id: whatsappTemplates.id, category: whatsappTemplates.category, status: whatsappTemplates.status })
      .from(whatsappTemplates)
      .where(
        and(
          eq(whatsappTemplates.tenantId, tenantId),
          eq(whatsappTemplates.accountId, wa.id),
          eq(whatsappTemplates.name, campaign.templateName),
        ),
      )
      .limit(1);

    if (!approvedTemplate) {
      throw new BadRequestException(
        `Template "${campaign.templateName}" não encontrado. Sincronize os templates da conta WhatsApp.`,
      );
    }

    if (approvedTemplate.status !== 'APPROVED') {
      throw new BadRequestException(
        `Template "${campaign.templateName}" não está aprovado pela Meta (status: ${approvedTemplate.status}).`,
      );
    }

    // ── Check 5 (campaign-level): template category vs campaign purpose ──
    if (BLOCKED_TEMPLATE_CATEGORIES.includes(approvedTemplate.category.toUpperCase())) {
      throw new BadRequestException(
        `Template de categoria "${approvedTemplate.category}" não pode ser usado em campanhas de marketing.`,
      );
    }

    // ── Get all contacts with whatsapp identities for the tenant ──
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
        wa.id,
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
    accountId: string,
    contactId: string,
    phone: string,
  ): Promise<string | null> {
    // 1. O número é válido? (E.164: starts with +, 8–15 digits total)
    if (!this.isValidE164(phone)) return 'invalid_phone';

    // 2. Tem consentimento válido (status granted e não expirado)?
    const now = new Date();
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
          or(isNull(consents.expiresAt), gte(consents.expiresAt, now)),
        ),
      )
      .limit(1);
    if (!consent) return 'no_consent';

    // 3. Está em opt-out?
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

    // 6. O contato já recebeu mensagem recentemente? (frequency cap)
    const capWindow = new Date(Date.now() - FREQUENCY_CAP_HOURS * 60 * 60 * 1000);
    const [recentMsg] = await this.db
      .select({ id: whatsappMessageLogs.id })
      .from(whatsappMessageLogs)
      .where(
        and(
          eq(whatsappMessageLogs.tenantId, tenantId),
          eq(whatsappMessageLogs.accountId, accountId),
          eq(whatsappMessageLogs.direction, 'outbound'),
          eq(whatsappMessageLogs.to, phone),
          gte(whatsappMessageLogs.createdAt, capWindow),
        ),
      )
      .limit(1);
    if (recentMsg) return 'frequency_capped';

    // 7. Está dentro das políticas da empresa?
    const [contact] = await this.db
      .select({ isBlocked: contacts.isBlocked })
      .from(contacts)
      .where(and(eq(contacts.id, contactId), eq(contacts.tenantId, tenantId)))
      .limit(1);
    if (contact?.isBlocked) return 'contact_blocked';

    return null;
  }

  private isValidE164(phone: string): boolean {
    return /^\+[1-9]\d{7,14}$/.test(phone);
  }

  async launchCampaign(tenantId: string, campaignId: string, userId: string) {
    const campaign = await this.getCampaign(tenantId, campaignId);

    if (!['draft', 'scheduled'].includes(campaign.status)) {
      throw new BadRequestException(`Campanha não pode ser iniciada (status: ${campaign.status})`);
    }

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
