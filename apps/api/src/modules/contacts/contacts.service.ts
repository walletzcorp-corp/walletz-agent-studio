import {
  Injectable, Inject, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { eq, and, isNull, desc, ilike, or, inArray } from 'drizzle-orm';
import { DRIZZLE_TOKEN, type DrizzleDB } from '../../database/database.module';
import { contacts, contactIdentities, consents } from '../../database/schema/contacts';
import { AuditService } from '../../shared/audit/audit.service';
import { createId } from '../../database/utils/id';

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  // Brazil: add +55 if starts with DDD (10-11 digits)
  if (digits.length === 10 || digits.length === 11) return `+55${digits}`;
  // Already has country code
  if (digits.length >= 12) return `+${digits}`;
  return `+${digits}`;
}

export interface ImportContactDto {
  firstName?: string;
  lastName?: string;
  company?: string;
  phone?: string;
  email?: string;
  origin?: string;
  segment?: string;
  tags?: string[];
  observation?: string;
  responsavel?: string;
  hasWhatsappConsent?: boolean;
  consentDate?: string;
  consentOrigin?: string;
  customFields?: Record<string, string>;
}

@Injectable()
export class ContactsService {
  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: DrizzleDB,
    private readonly auditService: AuditService,
  ) {}

  async listContacts(tenantId: string, params?: { search?: string; segment?: string; limit?: number; offset?: number }) {
    const limit = params?.limit ?? 50;
    const offset = params?.offset ?? 0;

    const rows = await this.db
      .select()
      .from(contacts)
      .where(and(eq(contacts.tenantId, tenantId), isNull(contacts.deletedAt)))
      .orderBy(desc(contacts.createdAt))
      .limit(limit)
      .offset(offset);

    return rows;
  }

  async getContact(tenantId: string, contactId: string) {
    const [row] = await this.db
      .select()
      .from(contacts)
      .where(and(eq(contacts.id, contactId), eq(contacts.tenantId, tenantId), isNull(contacts.deletedAt)))
      .limit(1);
    if (!row) throw new NotFoundException('Contact not found');
    return row;
  }

  async importContacts(
    rows: ImportContactDto[],
    tenantId: string,
    userId: string,
    batchId?: string,
  ): Promise<{ imported: number; skipped: number; errors: string[] }> {
    const importBatchId = batchId ?? createId();
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const row of rows) {
      try {
        const phone = row.phone ? normalizePhone(row.phone) : null;

        // Deduplication: check existing by normalized phone
        let contactId: string | null = null;
        if (phone) {
          const [existing] = await this.db
            .select({ contactId: contactIdentities.contactId })
            .from(contactIdentities)
            .where(
              and(
                eq(contactIdentities.tenantId, tenantId),
                eq(contactIdentities.channel, 'whatsapp'),
                eq(contactIdentities.normalizedValue, phone),
              ),
            )
            .limit(1);

          if (existing) {
            skipped++;
            continue;
          }
        }

        const tags: string[] = [];
        if (row.segment) tags.push(row.segment);
        if (row.tags) tags.push(...row.tags);

        const [contact] = await this.db
          .insert(contacts)
          .values({
            tenantId,
            firstName: row.firstName,
            lastName: row.lastName,
            company: row.company,
            origin: row.origin ?? 'import',
            tags,
            customFields: row.customFields ?? {},
            importBatchId,
          })
          .returning();

        contactId = contact!.id;

        if (phone) {
          await this.db.insert(contactIdentities).values({
            contactId: contactId,
            tenantId,
            channel: 'whatsapp',
            value: row.phone!,
            normalizedValue: phone,
          }).onConflictDoNothing();
        }

        if (row.email) {
          await this.db.insert(contactIdentities).values({
            contactId: contactId,
            tenantId,
            channel: 'email',
            value: row.email,
            normalizedValue: row.email.toLowerCase(),
          }).onConflictDoNothing();
        }

        // Add consent if provided
        if (row.hasWhatsappConsent && phone) {
          await this.db.insert(consents).values({
            contactId: contactId,
            tenantId,
            channel: 'whatsapp',
            purpose: 'marketing',
            status: 'granted',
            source: row.consentOrigin ?? 'import',
            collectedAt: row.consentDate ? new Date(row.consentDate) : new Date(),
          });
        }

        imported++;
      } catch (err) {
        errors.push(`Linha ${imported + skipped + 1}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    await this.auditService.log({
      action: 'contacts.import',
      resourceType: 'contact',
      resourceId: importBatchId,
      tenantId,
      userId,
      metadata: { imported, skipped, errors: errors.length, batchId: importBatchId },
    });

    return { imported, skipped, errors };
  }

  async deleteContact(tenantId: string, contactId: string, userId: string): Promise<void> {
    await this.getContact(tenantId, contactId);
    await this.db
      .update(contacts)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(contacts.id, contactId), eq(contacts.tenantId, tenantId)));

    await this.auditService.log({
      action: 'contact.delete',
      resourceType: 'contact',
      resourceId: contactId,
      tenantId,
      userId,
    });
  }
}
