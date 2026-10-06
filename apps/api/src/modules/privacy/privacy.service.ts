import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, isNull } from 'drizzle-orm';
import { DRIZZLE_TOKEN, type DrizzleDB } from '../../database/database.module';
import { contacts, contactIdentities, consents, suppressions } from '../../database/schema/contacts';
import { whatsappMessageLogs } from '../../database/schema/whatsapp';
import { conversations, messages } from '../../database/schema/conversations';
import { AuditService } from '../../shared/audit/audit.service';

export interface DataSubjectExport {
  contact: Record<string, unknown>;
  identities: Record<string, unknown>[];
  consents: Record<string, unknown>[];
  suppressions: Record<string, unknown>[];
  conversations: { id: string; channel: string; status: string; createdAt: Date }[];
  messageCount: number;
  exportedAt: string;
  requestedBy: string;
}

@Injectable()
export class PrivacyService {
  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: DrizzleDB,
    private readonly auditService: AuditService,
  ) {}

  // ─── LGPD Art. 18 I — Acesso aos dados ────────────────────────────────────

  async exportContactData(
    tenantId: string,
    contactId: string,
    requestedByUserId: string,
  ): Promise<DataSubjectExport> {
    const [contact] = await this.db
      .select()
      .from(contacts)
      .where(and(eq(contacts.id, contactId), eq(contacts.tenantId, tenantId)))
      .limit(1);

    if (!contact) throw new NotFoundException('Contact not found');

    const [identityRows, consentRows, suppressionRows, convRows] = await Promise.all([
      this.db.select().from(contactIdentities).where(eq(contactIdentities.contactId, contactId)),
      this.db.select().from(consents).where(and(eq(consents.contactId, contactId), eq(consents.tenantId, tenantId))),
      this.db.select().from(suppressions).where(and(eq(suppressions.tenantId, tenantId))),
      this.db
        .select({ id: conversations.id, channel: conversations.channel, status: conversations.status, createdAt: conversations.createdAt })
        .from(conversations)
        .where(and(eq(conversations.contactId, contactId), eq(conversations.tenantId, tenantId))),
    ]);

    const [msgCount] = await this.db
      .select({ count: messages.id })
      .from(messages)
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .where(and(eq(conversations.contactId, contactId), eq(conversations.tenantId, tenantId)));

    const suppFiltered = suppressionRows.filter((s) =>
      identityRows.some((i) => i.normalizedValue === s.normalizedValue),
    );

    await this.auditService.log({
      action: 'privacy.data_export',
      resourceType: 'contact',
      resourceId: contactId,
      tenantId,
      userId: requestedByUserId,
      metadata: { lgpd_basis: 'art18_i_access' },
    });

    return {
      contact: { ...contact, accessToken: undefined } as Record<string, unknown>,
      identities: identityRows,
      consents: consentRows,
      suppressions: suppFiltered,
      conversations: convRows,
      messageCount: convRows.length,
      exportedAt: new Date().toISOString(),
      requestedBy: requestedByUserId,
    };
  }

  // ─── LGPD Art. 18 VI — Anonimização / exclusão ────────────────────────────

  async anonymizeContact(
    tenantId: string,
    contactId: string,
    requestedByUserId: string,
    reason: string,
  ): Promise<{ anonymized: true; contactId: string }> {
    const [contact] = await this.db
      .select()
      .from(contacts)
      .where(and(eq(contacts.id, contactId), eq(contacts.tenantId, tenantId)))
      .limit(1);

    if (!contact) throw new NotFoundException('Contact not found');

    // Anonymize PII fields — preserve record for audit/stats, remove identity
    await this.db
      .update(contacts)
      .set({
        firstName: '[removido]',
        lastName: '[removido]',
        company: null,
        tags: [],
        customFields: {},
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(contacts.id, contactId), eq(contacts.tenantId, tenantId)));

    // Remove identity records (phone, email)
    await this.db
      .delete(contactIdentities)
      .where(eq(contactIdentities.contactId, contactId));

    // Revoke all consents
    await this.db
      .update(consents)
      .set({ status: 'revoked', revokedAt: new Date() })
      .where(and(eq(consents.contactId, contactId), eq(consents.tenantId, tenantId)));

    await this.auditService.log({
      action: 'privacy.contact_anonymized',
      resourceType: 'contact',
      resourceId: contactId,
      tenantId,
      userId: requestedByUserId,
      metadata: { lgpd_basis: 'art18_vi_erasure', reason },
    });

    return { anonymized: true, contactId };
  }

  // ─── LGPD Art. 18 — Consentimentos do tenant ──────────────────────────────

  async listConsentsByTenant(tenantId: string, params?: {
    channel?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    const limit = params?.limit ?? 50;
    const offset = params?.offset ?? 0;

    const rows = await this.db
      .select({
        id: consents.id,
        contactId: consents.contactId,
        channel: consents.channel,
        purpose: consents.purpose,
        status: consents.status,
        source: consents.source,
        collectedAt: consents.collectedAt,
        expiresAt: consents.expiresAt,
        revokedAt: consents.revokedAt,
      })
      .from(consents)
      .where(eq(consents.tenantId, tenantId))
      .limit(limit)
      .offset(offset);

    return rows;
  }

  // ─── LGPD — Registrar opt-out manual ─────────────────────────────────────

  async revokeConsent(
    tenantId: string,
    contactId: string,
    channel: string,
    purpose: string,
    requestedByUserId: string,
  ): Promise<void> {
    await this.db
      .update(consents)
      .set({ status: 'revoked', revokedAt: new Date() })
      .where(
        and(
          eq(consents.contactId, contactId),
          eq(consents.tenantId, tenantId),
          eq(consents.channel, channel),
          eq(consents.purpose, purpose),
        ),
      );

    await this.auditService.log({
      action: 'privacy.consent_revoked',
      resourceType: 'consent',
      resourceId: contactId,
      tenantId,
      userId: requestedByUserId,
      metadata: { channel, purpose, lgpd_basis: 'art15_i_revogacao' },
    });
  }

  // ─── Audit log de acessos aos dados ──────────────────────────────────────

  async logDataAccess(
    tenantId: string,
    userId: string,
    resourceType: string,
    resourceId: string,
    action: string,
    ipAddress?: string,
  ): Promise<void> {
    await this.auditService.log({
      action: `data_access.${action}`,
      resourceType,
      resourceId,
      tenantId,
      userId,
      ipAddress,
      metadata: { lgpd_tracking: true },
    });
  }
}
