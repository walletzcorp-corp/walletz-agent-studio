import {
  Injectable, Inject, Logger, NotFoundException,
  BadRequestException, ConflictException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import { eq, and, isNull, ne } from 'drizzle-orm';
import { DRIZZLE_TOKEN, type DrizzleDB } from '../../database/database.module';
import {
  whatsappAccounts, whatsappMessageLogs, whatsappTemplates,
  type WhatsappAccount,
} from '../../database/schema/whatsapp';
import {
  conversations, messages,
} from '../../database/schema/conversations';
import {
  contacts, contactIdentities,
} from '../../database/schema/contacts';
import { agents } from '../../database/schema/agents';
import { AuditService } from '../../shared/audit/audit.service';
import { createId } from '../../database/utils/id';
import { LabService } from '../lab/lab.service';
import type { ConnectWhatsappDto, SendMessageDto } from './dto/connect-account.dto';

const META_GRAPH_URL = 'https://graph.facebook.com/v20.0';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: DrizzleDB,
    private readonly httpService: HttpService,
    private readonly auditService: AuditService,
    private readonly labService: LabService,
  ) {}

  // ─── Accounts ────────────────────────────────────────────────────────────────

  async listAccounts(tenantId: string): Promise<WhatsappAccount[]> {
    return this.db
      .select()
      .from(whatsappAccounts)
      .where(and(eq(whatsappAccounts.tenantId, tenantId), isNull(whatsappAccounts.deletedAt)));
  }

  async getAccount(tenantId: string, accountId: string): Promise<WhatsappAccount> {
    const [account] = await this.db
      .select()
      .from(whatsappAccounts)
      .where(and(
        eq(whatsappAccounts.id, accountId),
        eq(whatsappAccounts.tenantId, tenantId),
        isNull(whatsappAccounts.deletedAt),
      ));
    if (!account) throw new NotFoundException('WhatsApp account not found');
    return account;
  }

  async connectAccount(dto: ConnectWhatsappDto, tenantId: string, userId: string): Promise<WhatsappAccount> {
    const [existing] = await this.db
      .select()
      .from(whatsappAccounts)
      .where(eq(whatsappAccounts.phoneNumberId, dto.phoneNumberId));

    if (existing && existing.tenantId !== tenantId) {
      throw new ConflictException('Phone Number ID already registered to another tenant');
    }

    let displayName: string | undefined;
    let phoneNumber: string | undefined;

    try {
      const resp = await firstValueFrom(
        this.httpService.get(`${META_GRAPH_URL}/${dto.phoneNumberId}`, {
          params: { fields: 'display_phone_number,verified_name', access_token: dto.accessToken },
        }),
      );
      const data = resp.data as { display_phone_number?: string; verified_name?: string };
      phoneNumber = data.display_phone_number;
      displayName = data.verified_name;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Meta API verification failed: ${msg}`);
      throw new BadRequestException(`Falha ao verificar credenciais com a Meta: ${msg}`);
    }

    const [account] = await this.db
      .insert(whatsappAccounts)
      .values({
        tenantId,
        phoneNumberId: dto.phoneNumberId,
        wabaId: dto.wabaId,
        accessToken: dto.accessToken,
        appSecret: dto.appSecret,
        verifyToken: dto.verifyToken,
        webhookUrl: dto.webhookUrl,
        displayName,
        phoneNumber,
        status: 'connected',
        connectedByUserId: userId,
      })
      .onConflictDoUpdate({
        target: whatsappAccounts.phoneNumberId,
        set: {
          accessToken: dto.accessToken,
          appSecret: dto.appSecret,
          verifyToken: dto.verifyToken,
          webhookUrl: dto.webhookUrl,
          displayName,
          phoneNumber,
          status: 'connected',
          updatedAt: new Date(),
        },
      })
      .returning();

    await this.auditService.log({
      action: 'whatsapp.account_connected',
      resourceType: 'whatsapp_account',
      resourceId: account!.id,
      tenantId,
      userId,
      metadata: { phoneNumberId: dto.phoneNumberId, wabaId: dto.wabaId },
    });

    void this.syncTemplates(account!.id, tenantId).catch((e) =>
      this.logger.warn(`Template sync failed: ${e}`),
    );

    return account!;
  }

  async disconnectAccount(tenantId: string, accountId: string, userId: string): Promise<void> {
    await this.getAccount(tenantId, accountId);
    await this.db
      .update(whatsappAccounts)
      .set({ status: 'disconnected', deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(whatsappAccounts.id, accountId), eq(whatsappAccounts.tenantId, tenantId)));

    await this.auditService.log({
      action: 'whatsapp.account_disconnected',
      resourceType: 'whatsapp_account',
      resourceId: accountId,
      tenantId,
      userId,
    });
  }

  // ─── Messaging ───────────────────────────────────────────────────────────────

  async sendTextMessage(
    tenantId: string,
    accountId: string,
    dto: SendMessageDto,
  ): Promise<{ messageId: string; status: string }> {
    const account = await this.getAccount(tenantId, accountId);

    if (account.status !== 'connected') {
      throw new BadRequestException('WhatsApp account is not connected');
    }

    if (dto.idempotencyKey) {
      const [dup] = await this.db
        .select({ id: whatsappMessageLogs.id })
        .from(whatsappMessageLogs)
        .where(and(
          eq(whatsappMessageLogs.tenantId, tenantId),
          eq(whatsappMessageLogs.idempotencyKey, dto.idempotencyKey),
        ))
        .limit(1);
      if (dup) return { messageId: dup.id, status: 'deduplicated' };
    }

    const logId = createId();
    const idempotencyKey = dto.idempotencyKey ?? logId;

    await this.db.insert(whatsappMessageLogs).values({
      id: logId,
      tenantId,
      accountId,
      direction: 'outbound',
      status: 'pending',
      to: dto.to,
      messageType: 'text',
      content: { text: dto.text },
      idempotencyKey,
    });

    try {
      const resp = await firstValueFrom(
        this.httpService.post(
          `${META_GRAPH_URL}/${account.phoneNumberId}/messages`,
          {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: dto.to,
            type: 'text',
            text: { preview_url: false, body: dto.text },
          },
          { headers: { Authorization: `Bearer ${account.accessToken}` } },
        ),
      );

      const data = resp.data as { messages?: Array<{ id: string }> };
      const providerMsgId = data.messages?.[0]?.id ?? '';

      await this.db
        .update(whatsappMessageLogs)
        .set({ status: 'sent', providerMessageId: providerMsgId, sentAt: new Date() })
        .where(eq(whatsappMessageLogs.id, logId));

      return { messageId: logId, status: 'sent' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await this.db
        .update(whatsappMessageLogs)
        .set({ status: 'failed', errorMessage: msg, failedAt: new Date() })
        .where(eq(whatsappMessageLogs.id, logId));
      throw new BadRequestException(`Falha ao enviar mensagem: ${msg}`);
    }
  }

  // Internal: send AI reply without account lookup (used in webhook pipeline)
  private async sendAiReply(
    account: WhatsappAccount,
    to: string,
    text: string,
    conversationId: string,
    contactId: string,
    agentId: string,
    traceId: string,
  ): Promise<void> {
    const logId = createId();
    const idempotencyKey = `ai-${traceId}`;

    // Check idempotency
    const [dup] = await this.db
      .select({ id: whatsappMessageLogs.id })
      .from(whatsappMessageLogs)
      .where(and(
        eq(whatsappMessageLogs.tenantId, account.tenantId),
        eq(whatsappMessageLogs.idempotencyKey, idempotencyKey),
      ))
      .limit(1);
    if (dup) return;

    await this.db.insert(whatsappMessageLogs).values({
      id: logId,
      tenantId: account.tenantId,
      accountId: account.id,
      direction: 'outbound',
      status: 'pending',
      to,
      messageType: 'text',
      content: { text },
      conversationId,
      contactId,
      idempotencyKey,
    });

    // Insert outbound message in messages table
    await this.db.insert(messages).values({
      conversationId,
      tenantId: account.tenantId,
      direction: 'outbound',
      status: 'pending',
      content: { text },
      sentByAgentId: agentId,
      isAiGenerated: true,
      traceId,
    });

    try {
      const resp = await firstValueFrom(
        this.httpService.post(
          `${META_GRAPH_URL}/${account.phoneNumberId}/messages`,
          {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to,
            type: 'text',
            text: { preview_url: false, body: text },
          },
          { headers: { Authorization: `Bearer ${account.accessToken}` } },
        ),
      );

      const data = resp.data as { messages?: Array<{ id: string }> };
      const providerMsgId = data.messages?.[0]?.id ?? '';

      await this.db
        .update(whatsappMessageLogs)
        .set({ status: 'sent', providerMessageId: providerMsgId, sentAt: new Date() })
        .where(eq(whatsappMessageLogs.id, logId));

      await this.db
        .update(messages)
        .set({ status: 'sent', sentAt: new Date() })
        .where(and(eq(messages.traceId, traceId), eq(messages.conversationId, conversationId)));

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`AI reply send failed: ${msg}`);
      await this.db
        .update(whatsappMessageLogs)
        .set({ status: 'failed', errorMessage: msg, failedAt: new Date() })
        .where(eq(whatsappMessageLogs.id, logId));
    }
  }

  // ─── Webhook ─────────────────────────────────────────────────────────────────

  verifyWebhook(phoneNumberId: string, mode: string, challenge: string, token: string): string {
    if (mode !== 'subscribe') throw new BadRequestException('Invalid mode');
    return challenge;
  }

  async handleWebhookEvent(
    payload: unknown,
    signature: string | undefined,
    rawBody: Buffer,
  ): Promise<void> {
    const body = payload as WebhookPayload;

    if (body.object !== 'whatsapp_business_account') return;

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== 'messages') continue;
        const value = change.value;

        for (const message of value.messages ?? []) {
          await this.processInboundMessage(value.metadata?.phone_number_id, message, value.contacts?.[0]);
        }

        for (const status of value.statuses ?? []) {
          await this.processStatusUpdate(status);
        }
      }
    }
  }

  private async processInboundMessage(
    phoneNumberId: string | undefined,
    message: WaMessage,
    waContact: WaContact | undefined,
  ): Promise<void> {
    if (!phoneNumberId) return;

    const [account] = await this.db
      .select()
      .from(whatsappAccounts)
      .where(eq(whatsappAccounts.phoneNumberId, phoneNumberId))
      .limit(1);

    if (!account) {
      this.logger.warn(`No account found for phoneNumberId: ${phoneNumberId}`);
      return;
    }

    const tenantId = account.tenantId;
    const content = this.extractMessageContent(message);

    // Normalize phone: Meta sends without '+', E.164 needs '+'
    const normalizedPhone = message.from.startsWith('+') ? message.from : `+${message.from}`;

    // ── Store raw log (idempotent on provider message ID) ──
    await this.db.insert(whatsappMessageLogs).values({
      tenantId,
      accountId: account.id,
      direction: 'inbound',
      status: 'delivered',
      providerMessageId: message.id,
      from: normalizedPhone,
      messageType: message.type,
      content,
      idempotencyKey: message.id,
    }).onConflictDoNothing();

    this.logger.log(`Inbound message from ${normalizedPhone} (${message.type})`);

    // ── Find or create contact ──
    const contactId = await this.findOrCreateContact(tenantId, normalizedPhone, waContact);

    // ── Find or create conversation ──
    const [existingConv] = await this.db
      .select()
      .from(conversations)
      .where(and(
        eq(conversations.tenantId, tenantId),
        eq(conversations.contactId, contactId),
        eq(conversations.channel, 'whatsapp'),
        ne(conversations.status, 'resolved'),
      ))
      .limit(1);

    let conversationId: string;

    if (existingConv) {
      conversationId = existingConv.id;
      await this.db
        .update(conversations)
        .set({ lastMessageAt: new Date(), status: 'open', updatedAt: new Date() })
        .where(eq(conversations.id, conversationId));
    } else {
      const [newConv] = await this.db
        .insert(conversations)
        .values({
          tenantId,
          contactId,
          channel: 'whatsapp',
          channelConversationId: normalizedPhone,
          status: 'open',
          lastMessageAt: new Date(),
        })
        .returning();
      conversationId = newConv!.id;
    }

    // ── Insert inbound message into messages table ──
    await this.db.insert(messages).values({
      conversationId,
      tenantId,
      direction: 'inbound',
      status: 'delivered',
      providerMessageId: message.id,
      content,
      isAiGenerated: false,
    });

    // ── Update whatsapp_message_logs with conversationId + contactId ──
    await this.db
      .update(whatsappMessageLogs)
      .set({ conversationId, contactId })
      .where(eq(whatsappMessageLogs.idempotencyKey, message.id));

    // ── Trigger AI response if conversation is not paused ──
    const conv = existingConv ?? (await this.db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1)
      .then((r) => r[0]));

    if (conv?.aiPausedAt) {
      this.logger.log(`AI is paused for conversation ${conversationId}, skipping response`);
      return;
    }

    // Only respond to text messages
    if (message.type !== 'text' || !message.text?.body) return;

    void this.triggerAiResponse(account, conversationId, contactId, normalizedPhone, message.text.body, tenantId);
  }

  private async findOrCreateContact(
    tenantId: string,
    normalizedPhone: string,
    waContact: WaContact | undefined,
  ): Promise<string> {
    const [identity] = await this.db
      .select({ contactId: contactIdentities.contactId })
      .from(contactIdentities)
      .where(and(
        eq(contactIdentities.tenantId, tenantId),
        eq(contactIdentities.channel, 'whatsapp'),
        eq(contactIdentities.normalizedValue, normalizedPhone),
      ))
      .limit(1);

    if (identity) return identity.contactId;

    const name = waContact?.profile?.name ?? '';
    const [firstName, ...rest] = name.split(' ');

    const [newContact] = await this.db
      .insert(contacts)
      .values({
        tenantId,
        firstName: firstName || null,
        lastName: rest.length > 0 ? rest.join(' ') : null,
        origin: 'whatsapp_inbound',
      })
      .returning();

    await this.db.insert(contactIdentities).values({
      contactId: newContact!.id,
      tenantId,
      channel: 'whatsapp',
      value: normalizedPhone,
      normalizedValue: normalizedPhone,
      isVerified: true,
    });

    return newContact!.id;
  }

  private async triggerAiResponse(
    account: WhatsappAccount,
    conversationId: string,
    contactId: string,
    to: string,
    userMessage: string,
    tenantId: string,
  ): Promise<void> {
    // Find active agent for tenant
    const [agent] = await this.db
      .select({ id: agents.id })
      .from(agents)
      .where(and(
        eq(agents.tenantId, tenantId),
        isNull(agents.deletedAt),
        ne(agents.status, 'archived'),
      ))
      .limit(1);

    if (!agent) {
      this.logger.log(`No active agent found for tenant ${tenantId}, skipping AI response`);
      return;
    }

    try {
      const result = await this.labService.chat(
        { agentId: agent.id, message: userMessage },
        tenantId,
      );

      if (!result.reply) return;

      await this.sendAiReply(
        account,
        to,
        result.reply,
        conversationId,
        contactId,
        agent.id,
        result.traceId,
      );

      this.logger.log(`AI reply sent for conversation ${conversationId} (trace: ${result.traceId})`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`AI response pipeline failed: ${msg}`);
    }
  }

  private async processStatusUpdate(status: WaStatusUpdate): Promise<void> {
    const updateData: Record<string, unknown> = {};

    if (status.status === 'sent') updateData['sentAt'] = new Date(Number(status.timestamp) * 1000);
    else if (status.status === 'delivered') updateData['deliveredAt'] = new Date(Number(status.timestamp) * 1000);
    else if (status.status === 'read') updateData['readAt'] = new Date(Number(status.timestamp) * 1000);
    else if (status.status === 'failed') {
      updateData['failedAt'] = new Date();
      updateData['errorCode'] = status.errors?.[0]?.code?.toString() ?? '';
      updateData['errorMessage'] = status.errors?.[0]?.title ?? '';
    }

    if (!status.status) return;

    const safeStatus = status.status as 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
    await this.db
      .update(whatsappMessageLogs)
      .set({ status: safeStatus, ...updateData as Record<string, Date | string | null> })
      .where(eq(whatsappMessageLogs.providerMessageId, status.id));
  }

  // ─── Templates ───────────────────────────────────────────────────────────────

  async syncTemplates(accountId: string, tenantId: string): Promise<void> {
    const [account] = await this.db
      .select()
      .from(whatsappAccounts)
      .where(and(eq(whatsappAccounts.id, accountId), eq(whatsappAccounts.tenantId, tenantId)))
      .limit(1);

    if (!account) return;

    try {
      const resp = await firstValueFrom(
        this.httpService.get(`${META_GRAPH_URL}/${account.wabaId}/message_templates`, {
          params: { access_token: account.accessToken, limit: 100 },
        }),
      );

      const data = resp.data as { data?: WaTemplate[] };
      const templates = data.data ?? [];

      for (const tpl of templates) {
        await this.db
          .insert(whatsappTemplates)
          .values({
            tenantId,
            accountId,
            templateId: tpl.id,
            name: tpl.name,
            language: tpl.language,
            category: tpl.category,
            status: tpl.status,
            components: tpl.components ?? [],
          })
          .onConflictDoUpdate({
            target: whatsappTemplates.accountId,
            set: { status: tpl.status, components: tpl.components ?? [], updatedAt: new Date() },
          });
      }

      await this.db
        .update(whatsappAccounts)
        .set({ lastSyncedAt: new Date() })
        .where(eq(whatsappAccounts.id, accountId));

      this.logger.log(`Synced ${templates.length} templates for account ${accountId}`);
    } catch (err) {
      this.logger.error(`Template sync error: ${err}`);
    }
  }

  async listTemplates(tenantId: string, accountId: string) {
    return this.db
      .select()
      .from(whatsappTemplates)
      .where(and(
        eq(whatsappTemplates.tenantId, tenantId),
        eq(whatsappTemplates.accountId, accountId),
      ));
  }

  async getStats(tenantId: string, accountId: string) {
    const logs = await this.db
      .select()
      .from(whatsappMessageLogs)
      .where(and(
        eq(whatsappMessageLogs.tenantId, tenantId),
        eq(whatsappMessageLogs.accountId, accountId),
      ));

    const sent = logs.filter((l) => l.direction === 'outbound').length;
    const received = logs.filter((l) => l.direction === 'inbound').length;
    const failed = logs.filter((l) => l.status === 'failed').length;

    return { sent, received, failed, total: logs.length };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private extractMessageContent(msg: WaMessage): Record<string, unknown> {
    if (msg.type === 'text') return { text: msg.text?.body ?? '' };
    if (msg.type === 'image') return { image: msg.image };
    if (msg.type === 'document') return { document: msg.document };
    if (msg.type === 'audio') return { audio: msg.audio };
    if (msg.type === 'video') return { video: msg.video };
    if (msg.type === 'interactive') return { interactive: msg.interactive };
    if (msg.type === 'button') return { button: msg.button };
    return { raw: msg };
  }
}

// ─── WhatsApp Webhook Types ─────────────────────────────────────────────────

interface WebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      field: string;
      value: {
        messaging_product: string;
        metadata?: { display_phone_number: string; phone_number_id: string };
        contacts?: WaContact[];
        messages?: WaMessage[];
        statuses?: WaStatusUpdate[];
      };
    }>;
  }>;
}

interface WaContact { profile?: { name: string }; wa_id: string }

interface WaMessage {
  id: string;
  from: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  image?: unknown;
  document?: unknown;
  audio?: unknown;
  video?: unknown;
  interactive?: unknown;
  button?: unknown;
}

interface WaStatusUpdate {
  id: string;
  status: string;
  timestamp: string;
  recipient_id: string;
  errors?: Array<{ code: number; title: string }>;
}

interface WaTemplate {
  id: string;
  name: string;
  language: string;
  category: string;
  status: string;
  components?: unknown[];
}
