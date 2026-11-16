import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { DRIZZLE_TOKEN, type DrizzleDB } from '../../database/database.module';
import { agents } from '../../database/schema/agents';
import { segments } from '../../database/schema/campaigns';
import { contacts } from '../../database/schema/contacts';
import { conversations } from '../../database/schema/conversations';
import { calendarConnections } from '../../database/schema/calendars';
import { whatsappAccounts } from '../../database/schema/whatsapp';

/**
 * Single place that answers "does this id, sent by the client, belong to this tenant?".
 * Every id that arrives in a body/query and gets stored or acted upon goes through here, so a
 * foreign id can neither be attached to our data nor probed for existence: not-yours and
 * does-not-exist are indistinguishable (404).
 */
@Injectable()
export class TenantOwnershipService {
  constructor(@Inject(DRIZZLE_TOKEN) private readonly db: DrizzleDB) {}

  async assertAgent(tenantId: string, id: string): Promise<void> {
    const [row] = await this.db
      .select({ id: agents.id })
      .from(agents)
      .where(and(eq(agents.id, id), eq(agents.tenantId, tenantId), isNull(agents.deletedAt)))
      .limit(1);
    if (!row) throw new NotFoundException('Agent not found');
  }

  async assertSegment(tenantId: string, id: string): Promise<void> {
    const [row] = await this.db
      .select({ id: segments.id })
      .from(segments)
      .where(and(eq(segments.id, id), eq(segments.tenantId, tenantId), isNull(segments.deletedAt)))
      .limit(1);
    if (!row) throw new NotFoundException('Segment not found');
  }

  async assertContact(tenantId: string, id: string): Promise<void> {
    const [row] = await this.db
      .select({ id: contacts.id })
      .from(contacts)
      .where(and(eq(contacts.id, id), eq(contacts.tenantId, tenantId), isNull(contacts.deletedAt)))
      .limit(1);
    if (!row) throw new NotFoundException('Contact not found');
  }

  async assertConversation(tenantId: string, id: string): Promise<void> {
    const [row] = await this.db
      .select({ id: conversations.id })
      .from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.tenantId, tenantId)))
      .limit(1);
    if (!row) throw new NotFoundException('Conversation not found');
  }

  async assertCalendarConnection(tenantId: string, id: string): Promise<void> {
    const [row] = await this.db
      .select({ id: calendarConnections.id })
      .from(calendarConnections)
      .where(
        and(
          eq(calendarConnections.id, id),
          eq(calendarConnections.tenantId, tenantId),
          isNull(calendarConnections.deletedAt),
        ),
      )
      .limit(1);
    if (!row) throw new NotFoundException('Calendar connection not found');
  }

  async assertWhatsappAccount(tenantId: string, id: string): Promise<void> {
    const [row] = await this.db
      .select({ id: whatsappAccounts.id })
      .from(whatsappAccounts)
      .where(
        and(
          eq(whatsappAccounts.id, id),
          eq(whatsappAccounts.tenantId, tenantId),
          isNull(whatsappAccounts.deletedAt),
        ),
      )
      .limit(1);
    if (!row) throw new NotFoundException('WhatsApp account not found');
  }
}
