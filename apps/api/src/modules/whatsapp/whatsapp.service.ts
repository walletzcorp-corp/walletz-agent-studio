import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import { eq, and, isNull, ne, desc, inArray } from 'drizzle-orm';
import { DRIZZLE_TOKEN, type DrizzleDB } from '../../database/database.module';
import {
  whatsappAccounts,
  whatsappMessageLogs,
  whatsappTemplates,
  type WhatsappAccount,
} from '../../database/schema/whatsapp';
import { conversations, messages } from '../../database/schema/conversations';
import {
  contacts,
  contactIdentities,
  consents,
  suppressions,
} from '../../database/schema/contacts';
import { agents } from '../../database/schema/agents';
import { AuditService } from '../../shared/audit/audit.service';
import { EncryptionService } from '../../shared/crypto/encryption.service';
import { createId } from '../../database/utils/id';
import { LabService } from '../lab/lab.service';
import { createExecutionContext } from '../agents/execution-context';
import type {
  ConnectWhatsappDto,
  EmbeddedSignupDto,
  SendMessageDto,
} from './dto/connect-account.dto';

const META_GRAPH_URL = 'https://graph.facebook.com/v22.0';

// Keywords that trigger opt-out (case-insensitive, trimmed)
const OPT_OUT_KEYWORDS = new Set([
  'stop',
  'sair',
  'cancelar',
  'pare',
  'parar',
  'remover',
  'descadastrar',
  'desinscrever',
  'não quero',
  'nao quero',
  'opt out',
  'optout',
  'unsubscribe',
  'cancel',
]);

function isOptOutMessage(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  return OPT_OUT_KEYWORDS.has(normalized);
}

export type PublicWhatsappAccount = Omit<
  WhatsappAccount,
  'accessToken' | 'verifyToken' | 'appSecret'
>;

function toPublicAccount(account: WhatsappAccount): PublicWhatsappAccount {
  const safe: Partial<WhatsappAccount> = { ...account };
  delete safe.accessToken;
  delete safe.verifyToken;
  delete safe.appSecret;
  return safe as PublicWhatsappAccount;
}

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: DrizzleDB,
    private readonly httpService: HttpService,
    private readonly auditService: AuditService,
    private readonly encryptionService: EncryptionService,
    private readonly labService: LabService,
  ) {}

  // ─── Accounts ────────────────────────────────────────────────────────────────

  private readonly accountPublicColumns = {
    id: whatsappAccounts.id,
    tenantId: whatsappAccounts.tenantId,
    displayName: whatsappAccounts.displayName,
    phoneNumber: whatsappAccounts.phoneNumber,
    phoneNumberId: whatsappAccounts.phoneNumberId,
    wabaId: whatsappAccounts.wabaId,
    webhookUrl: whatsappAccounts.webhookUrl,
    status: whatsappAccounts.status,
    qualityRating: whatsappAccounts.qualityRating,
    messagingLimitTier: whatsappAccounts.messagingLimitTier,
    lastSyncedAt: whatsappAccounts.lastSyncedAt,
    connectedByUserId: whatsappAccounts.connectedByUserId,
    agentId: whatsappAccounts.agentId,
    createdAt: whatsappAccounts.createdAt,
    updatedAt: whatsappAccounts.updatedAt,
  };

  async listAccounts(tenantId: string) {
    return this.db
      .select(this.accountPublicColumns)
      .from(whatsappAccounts)
      .where(and(eq(whatsappAccounts.tenantId, tenantId), isNull(whatsappAccounts.deletedAt)));
  }

  async getAccount(tenantId: string, accountId: string) {
    const [account] = await this.db
      .select(this.accountPublicColumns)
      .from(whatsappAccounts)
      .where(
        and(
          eq(whatsappAccounts.id, accountId),
          eq(whatsappAccounts.tenantId, tenantId),
          isNull(whatsappAccounts.deletedAt),
        ),
      );
    if (!account) throw new NotFoundException('WhatsApp account not found');
    return account;
  }

  private async getAccountInternal(tenantId: string, accountId: string): Promise<WhatsappAccount> {
    const [account] = await this.db
      .select()
      .from(whatsappAccounts)
      .where(
        and(
          eq(whatsappAccounts.id, accountId),
          eq(whatsappAccounts.tenantId, tenantId),
          isNull(whatsappAccounts.deletedAt),
        ),
      );
    if (!account) throw new NotFoundException('WhatsApp account not found');
    return account;
  }

  async connectAccount(
    dto: ConnectWhatsappDto,
    tenantId: string,
    userId: string,
  ): Promise<PublicWhatsappAccount> {
    // Ownership is checked against ALL rows (including soft-deleted ones): a number that ever
    // belonged to another tenant is never silently re-bound.
    const [existing] = await this.db
      .select({ id: whatsappAccounts.id, tenantId: whatsappAccounts.tenantId })
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

    const encryptedToken = this.encryptionService.encrypt(dto.accessToken);
    const encryptedAppSecret = dto.appSecret
      ? this.encryptionService.encrypt(dto.appSecret)
      : undefined;

    const [account] = await this.db
      .insert(whatsappAccounts)
      .values({
        tenantId,
        phoneNumberId: dto.phoneNumberId,
        wabaId: dto.wabaId,
        accessToken: encryptedToken,
        appSecret: encryptedAppSecret,
        verifyToken: dto.verifyToken,
        webhookUrl: dto.webhookUrl,
        displayName,
        phoneNumber,
        status: 'connected',
        connectedByUserId: userId,
      })
      .onConflictDoUpdate({
        target: whatsappAccounts.phoneNumberId,
        setWhere: eq(whatsappAccounts.tenantId, tenantId),
        set: {
          accessToken: encryptedToken,
          appSecret: encryptedAppSecret,
          verifyToken: dto.verifyToken,
          webhookUrl: dto.webhookUrl,
          displayName,
          phoneNumber,
          status: 'connected',
          deletedAt: null,
          updatedAt: new Date(),
        },
      })
      .returning();

    if (!account)
      throw new ConflictException('Phone Number ID already registered to another tenant');

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

    return toPublicAccount(account);
  }

  // ─── Embedded Signup ─────────────────────────────────────────────────────────

  async embeddedSignup(
    dto: EmbeddedSignupDto,
    tenantId: string,
    userId: string,
  ): Promise<PublicWhatsappAccount> {
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    if (!appId || !appSecret) {
      throw new BadRequestException('Configuração Meta não disponível neste ambiente.');
    }

    // 1. Exchange authorization code for access token (backend-only — never in browser)
    let accessToken: string;
    try {
      const tokenResp = await firstValueFrom(
        this.httpService.get(`${META_GRAPH_URL}/oauth/access_token`, {
          params: {
            client_id: appId,
            client_secret: appSecret,
            code: dto.code,
          },
        }),
      );
      const tokenData = tokenResp.data as { access_token?: string; error?: { message: string } };
      if (!tokenData.access_token) {
        throw new Error(tokenData.error?.message ?? 'Token não retornado');
      }
      accessToken = tokenData.access_token;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Embedded Signup token exchange failed: ${msg}`);
      throw new BadRequestException(
        'Não foi possível concluir a autorização com a Meta. Tente novamente.',
      );
    }

    // 2. Resolve WABA ID and Phone Number ID
    let wabaId = dto.wabaId;
    let phoneNumberId = dto.phoneNumberId;
    let displayName: string | undefined;
    let phoneNumber: string | undefined;

    if (!wabaId) {
      // Get WABAs granted to this token
      try {
        const wabaResp = await firstValueFrom(
          this.httpService.get(`${META_GRAPH_URL}/me/businesses`, {
            params: { access_token: accessToken, fields: 'whatsapp_business_accounts' },
          }),
        );
        const bizData = wabaResp.data as {
          data?: Array<{ whatsapp_business_accounts?: { data?: Array<{ id: string }> } }>;
        };
        wabaId = bizData.data?.[0]?.whatsapp_business_accounts?.data?.[0]?.id;
      } catch (err) {
        this.logger.warn(
          `Could not auto-resolve WABA ID: ${err instanceof Error ? err.message : err}`,
        );
      }
    }

    if (wabaId && !phoneNumberId) {
      try {
        const phoneResp = await firstValueFrom(
          this.httpService.get(`${META_GRAPH_URL}/${wabaId}/phone_numbers`, {
            params: {
              access_token: accessToken,
              fields: 'display_phone_number,verified_name,id,status',
            },
          }),
        );
        const phoneData = phoneResp.data as {
          data?: Array<{
            id: string;
            display_phone_number?: string;
            verified_name?: string;
            status?: string;
          }>;
        };
        const firstPhone = phoneData.data?.[0];
        if (firstPhone) {
          phoneNumberId = firstPhone.id;
          phoneNumber = firstPhone.display_phone_number;
          displayName = firstPhone.verified_name;
        }
      } catch (err) {
        this.logger.warn(
          `Could not auto-resolve Phone Number ID: ${err instanceof Error ? err.message : err}`,
        );
      }
    }

    if (!phoneNumberId || !wabaId) {
      throw new BadRequestException(
        'Não conseguimos identificar o número de WhatsApp autorizado. Tente novamente.',
      );
    }

    // 3. If display info still missing, fetch it directly
    if (!displayName || !phoneNumber) {
      try {
        const infoResp = await firstValueFrom(
          this.httpService.get(`${META_GRAPH_URL}/${phoneNumberId}`, {
            params: { fields: 'display_phone_number,verified_name', access_token: accessToken },
          }),
        );
        const infoData = infoResp.data as { display_phone_number?: string; verified_name?: string };
        phoneNumber = phoneNumber ?? infoData.display_phone_number;
        displayName = displayName ?? infoData.verified_name;
      } catch {
        /* use what we have */
      }
    }

    // 4. Cross-tenant ownership check before persisting
    const [existingForPhone] = await this.db
      .select({ id: whatsappAccounts.id, tenantId: whatsappAccounts.tenantId })
      .from(whatsappAccounts)
      .where(eq(whatsappAccounts.phoneNumberId, phoneNumberId))
      .limit(1);

    if (existingForPhone && existingForPhone.tenantId !== tenantId) {
      throw new ConflictException('Phone Number ID already registered to another tenant');
    }

    // 5. Persist — internal verify token is always generated by us, never exposed to user
    const verifyToken =
      existingForPhone?.tenantId === tenantId
        ? undefined // keep existing verifyToken on reconnect
        : crypto.randomBytes(32).toString('hex');
    const encryptedAccessToken = this.encryptionService.encrypt(accessToken);

    const [account] = await this.db
      .insert(whatsappAccounts)
      .values({
        tenantId,
        phoneNumberId,
        wabaId,
        accessToken: encryptedAccessToken,
        verifyToken: verifyToken ?? crypto.randomBytes(32).toString('hex'),
        displayName,
        phoneNumber,
        status: 'connected',
        connectedByUserId: userId,
      })
      .onConflictDoUpdate({
        target: whatsappAccounts.phoneNumberId,
        setWhere: eq(whatsappAccounts.tenantId, tenantId),
        set: {
          accessToken: encryptedAccessToken,
          displayName,
          phoneNumber,
          status: 'connected',
          deletedAt: null,
          updatedAt: new Date(),
        },
      })
      .returning();

    if (!account)
      throw new ConflictException('Phone Number ID already registered to another tenant');

    await this.auditService.log({
      action: 'whatsapp.embedded_signup_completed',
      resourceType: 'whatsapp_account',
      resourceId: account!.id,
      tenantId,
      userId,
      metadata: { path: dto.path ?? 'new', wabaId, phoneNumberId },
    });

    void this.syncTemplates(account!.id, tenantId).catch((e) =>
      this.logger.warn(`Template sync after embedded signup failed: ${e}`),
    );

    return toPublicAccount(account);
  }

  /**
   * Reconnect an existing account after token expiry.
   * Runs the same Embedded Signup flow but upserts the existing accountId.
   */
  async reconnectAccount(
    accountId: string,
    dto: EmbeddedSignupDto,
    tenantId: string,
    userId: string,
  ): Promise<PublicWhatsappAccount> {
    const existing = await this.getAccount(tenantId, accountId);
    // Reuse the embedded signup flow — it upserts on phoneNumberId conflict
    dto.phoneNumberId = dto.phoneNumberId ?? existing.phoneNumberId;
    dto.wabaId = dto.wabaId ?? existing.wabaId;
    const account = await this.embeddedSignup(dto, tenantId, userId);

    await this.auditService.log({
      action: 'whatsapp.account_reconnected',
      resourceType: 'whatsapp_account',
      resourceId: accountId,
      tenantId,
      userId,
      metadata: { phoneNumberId: account.phoneNumberId },
    });

    return account;
  }

  /**
   * Explicit channel -> agent binding. The agent must belong to the same tenant and be published.
   * null removes the binding (the channel then receives messages without an AI reply).
   */
  async assignAgent(
    tenantId: string,
    accountId: string,
    agentId: string | null,
    userId: string,
  ): Promise<PublicWhatsappAccount> {
    await this.getAccount(tenantId, accountId);

    if (agentId) {
      const [agent] = await this.db
        .select({ id: agents.id, status: agents.status })
        .from(agents)
        .where(and(eq(agents.id, agentId), eq(agents.tenantId, tenantId), isNull(agents.deletedAt)))
        .limit(1);
      if (!agent) throw new NotFoundException('Agent not found');
      if (agent.status !== 'published') {
        throw new BadRequestException('Only a published agent can be assigned to a channel');
      }
    }

    await this.db
      .update(whatsappAccounts)
      .set({ agentId, updatedAt: new Date() })
      .where(and(eq(whatsappAccounts.id, accountId), eq(whatsappAccounts.tenantId, tenantId)));

    await this.auditService.log({
      action: 'whatsapp.agent_assigned',
      resourceType: 'whatsapp_account',
      resourceId: accountId,
      tenantId,
      userId,
      metadata: { agentId },
    });

    return this.getAccount(tenantId, accountId) as Promise<PublicWhatsappAccount>;
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

  /**
   * Detects Meta token expiry/revocation (error codes 190, 102, 463)
   * and marks the account as needing reconnection.
   */
  private async handleApiError(err: unknown, accountId: string, tenantId: string): Promise<void> {
    const body = (err as { response?: { data?: { error?: { code?: number } } } })?.response?.data
      ?.error;
    const tokenExpiryCodes = [190, 102, 463, 467];
    if (body?.code && tokenExpiryCodes.includes(body.code)) {
      this.logger.warn(
        `Token expired/invalid for account ${accountId} (code ${body.code}) — marking for reconnection`,
      );
      await this.db
        .update(whatsappAccounts)
        .set({ status: 'error', updatedAt: new Date() })
        .where(and(eq(whatsappAccounts.id, accountId), eq(whatsappAccounts.tenantId, tenantId)));
      await this.auditService.log({
        action: 'whatsapp.token_expired',
        resourceType: 'whatsapp_account',
        resourceId: accountId,
        tenantId,
        metadata: { errorCode: body.code },
      });
    }
  }

  /** Returns plaintext access token from stored (encrypted) value. */
  private decryptToken(account: WhatsappAccount): string {
    return this.encryptionService.tryDecrypt(account.accessToken) ?? account.accessToken;
  }

  // ─── Messaging ───────────────────────────────────────────────────────────────

  async sendTextMessage(
    tenantId: string,
    accountId: string,
    dto: SendMessageDto,
  ): Promise<{ messageId: string; status: string; providerMessageId?: string }> {
    const account = await this.getAccountInternal(tenantId, accountId);

    if (account.status !== 'connected') {
      throw new BadRequestException('WhatsApp account is not connected');
    }

    const reservation = await this.reserveOutboundLog(
      tenantId,
      accountId,
      dto.to,
      'text',
      { text: dto.text },
      dto.idempotencyKey,
    );
    if (reservation.deduplicated) return { messageId: reservation.logId, status: 'deduplicated' };
    const logId = reservation.logId;

    const bearerToken = this.decryptToken(account);

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
          { headers: { Authorization: `Bearer ${bearerToken}` } },
        ),
      );

      const data = resp.data as { messages?: Array<{ id: string }> };
      const providerMsgId = data.messages?.[0]?.id ?? '';

      await this.db
        .update(whatsappMessageLogs)
        .set({ status: 'sent', providerMessageId: providerMsgId, sentAt: new Date() })
        .where(and(eq(whatsappMessageLogs.id, logId), eq(whatsappMessageLogs.tenantId, tenantId)));

      return { messageId: logId, status: 'sent', providerMessageId: providerMsgId };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await this.db
        .update(whatsappMessageLogs)
        .set({ status: 'failed', errorMessage: msg, failedAt: new Date() })
        .where(and(eq(whatsappMessageLogs.id, logId), eq(whatsappMessageLogs.tenantId, tenantId)));
      // Detect expired/invalid token and mark account for reconnection
      await this.handleApiError(err, account.id, tenantId);
      throw new BadRequestException(`Falha ao enviar mensagem: ${msg}`);
    }
  }

  // Idempotent outbound log. Only a previous non-failed log short-circuits; a failed one is
  // re-armed so queue retries actually resend instead of reporting a phantom success.
  private async reserveOutboundLog(
    tenantId: string,
    accountId: string,
    to: string,
    messageType: 'text' | 'template',
    content: Record<string, unknown>,
    idempotencyKey?: string,
  ): Promise<{ logId: string; deduplicated: boolean }> {
    if (idempotencyKey) {
      const [existing] = await this.db
        .select({ id: whatsappMessageLogs.id, status: whatsappMessageLogs.status })
        .from(whatsappMessageLogs)
        .where(
          and(
            eq(whatsappMessageLogs.tenantId, tenantId),
            eq(whatsappMessageLogs.idempotencyKey, idempotencyKey),
          ),
        )
        .limit(1);

      if (existing && existing.status !== 'failed') {
        return { logId: existing.id, deduplicated: true };
      }
      if (existing) {
        await this.db
          .update(whatsappMessageLogs)
          .set({ status: 'pending', errorMessage: null, failedAt: null })
          .where(
            and(
              eq(whatsappMessageLogs.id, existing.id),
              eq(whatsappMessageLogs.tenantId, tenantId),
            ),
          );
        return { logId: existing.id, deduplicated: false };
      }
    }

    const logId = createId();
    await this.db.insert(whatsappMessageLogs).values({
      id: logId,
      tenantId,
      accountId,
      direction: 'outbound',
      status: 'pending',
      to,
      messageType,
      content,
      idempotencyKey: idempotencyKey ?? logId,
    });
    return { logId, deduplicated: false };
  }

  async sendTemplateMessage(
    tenantId: string,
    accountId: string,
    dto: {
      to: string;
      templateName: string;
      templateLanguage: string;
      templateComponents: unknown[];
      idempotencyKey?: string;
    },
  ): Promise<{ messageId: string; status: string }> {
    const account = await this.getAccountInternal(tenantId, accountId);

    if (account.status !== 'connected') {
      throw new BadRequestException('WhatsApp account is not connected');
    }

    const reservation = await this.reserveOutboundLog(
      tenantId,
      accountId,
      dto.to,
      'template',
      { templateName: dto.templateName, components: dto.templateComponents },
      dto.idempotencyKey,
    );
    if (reservation.deduplicated) return { messageId: reservation.logId, status: 'deduplicated' };
    const logId = reservation.logId;

    const bearerToken = this.decryptToken(account);

    try {
      const resp = await firstValueFrom(
        this.httpService.post(
          `${META_GRAPH_URL}/${account.phoneNumberId}/messages`,
          {
            messaging_product: 'whatsapp',
            to: dto.to,
            type: 'template',
            template: {
              name: dto.templateName,
              language: { code: dto.templateLanguage },
              components: dto.templateComponents,
            },
          },
          { headers: { Authorization: `Bearer ${bearerToken}` } },
        ),
      );

      const data = resp.data as { messages?: Array<{ id: string }> };
      const providerMsgId = data.messages?.[0]?.id ?? '';

      await this.db
        .update(whatsappMessageLogs)
        .set({ status: 'sent', providerMessageId: providerMsgId, sentAt: new Date() })
        .where(and(eq(whatsappMessageLogs.id, logId), eq(whatsappMessageLogs.tenantId, tenantId)));

      return { messageId: logId, status: 'sent' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await this.db
        .update(whatsappMessageLogs)
        .set({ status: 'failed', errorMessage: msg, failedAt: new Date() })
        .where(and(eq(whatsappMessageLogs.id, logId), eq(whatsappMessageLogs.tenantId, tenantId)));
      await this.handleApiError(err, account.id, tenantId);
      throw new BadRequestException(`Falha ao enviar template: ${msg}`);
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
    inboundProviderMessageId: string,
  ): Promise<void> {
    const tenantId = account.tenantId;
    const logId = createId();
    // One AI reply per inbound message, however many times the pipeline is entered.
    const idempotencyKey = `ai-reply-${inboundProviderMessageId}`;

    const [dup] = await this.db
      .select({ id: whatsappMessageLogs.id })
      .from(whatsappMessageLogs)
      .where(
        and(
          eq(whatsappMessageLogs.tenantId, tenantId),
          eq(whatsappMessageLogs.idempotencyKey, idempotencyKey),
        ),
      )
      .limit(1);
    if (dup) return;

    await this.db.insert(whatsappMessageLogs).values({
      id: logId,
      tenantId,
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
    const [outbound] = await this.db
      .insert(messages)
      .values({
        conversationId,
        tenantId,
        direction: 'outbound',
        status: 'pending',
        content: { text },
        sentByAgentId: agentId,
        isAiGenerated: true,
        traceId,
      })
      .returning({ id: messages.id });

    const bearerToken = this.decryptToken(account);

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
          { headers: { Authorization: `Bearer ${bearerToken}` } },
        ),
      );

      const data = resp.data as { messages?: Array<{ id: string }> };
      const providerMsgId = data.messages?.[0]?.id ?? '';

      await this.db
        .update(whatsappMessageLogs)
        .set({ status: 'sent', providerMessageId: providerMsgId, sentAt: new Date() })
        .where(and(eq(whatsappMessageLogs.id, logId), eq(whatsappMessageLogs.tenantId, tenantId)));

      await this.db
        .update(messages)
        .set({ status: 'sent', providerMessageId: providerMsgId, sentAt: new Date() })
        .where(and(eq(messages.id, outbound!.id), eq(messages.tenantId, tenantId)));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`AI reply send failed: ${msg}`);
      await this.db
        .update(whatsappMessageLogs)
        .set({ status: 'failed', errorMessage: msg, failedAt: new Date() })
        .where(and(eq(whatsappMessageLogs.id, logId), eq(whatsappMessageLogs.tenantId, tenantId)));
      await this.db
        .update(messages)
        .set({ status: 'failed', failedAt: new Date(), failureReason: msg })
        .where(and(eq(messages.id, outbound!.id), eq(messages.tenantId, tenantId)));
      await this.handleApiError(err, account.id, tenantId);
    }
  }

  // ─── Webhook ─────────────────────────────────────────────────────────────────

  verifyWebhook(mode: string, challenge: string, token: string): string {
    if (mode !== 'subscribe') throw new BadRequestException('Invalid mode');
    const expected = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
    const given = Buffer.from(token ?? '');
    const wanted = Buffer.from(expected ?? '');
    if (!expected || given.length !== wanted.length || !crypto.timingSafeEqual(given, wanted)) {
      throw new UnauthorizedException('Invalid verify token');
    }
    return challenge;
  }

  /**
   * Meta signs every webhook with the app secret. Fail closed: without a configured secret the
   * endpoint refuses traffic (a forged event would otherwise be attributed to a real tenant).
   * Unsigned events can only be enabled explicitly, never in production.
   */
  private verifyWebhookSignature(signature: string | undefined, rawBody: Buffer): void {
    const appSecret = process.env.META_APP_SECRET;

    if (!appSecret) {
      const unsignedAllowed =
        process.env.NODE_ENV !== 'production' &&
        process.env.WHATSAPP_ALLOW_UNSIGNED_WEBHOOKS === 'true';
      if (!unsignedAllowed) {
        this.logger.error('Webhook rejected: META_APP_SECRET is not configured');
        throw new UnauthorizedException('Webhook signature verification is not configured');
      }
      this.logger.warn('Accepting UNSIGNED webhook (WHATSAPP_ALLOW_UNSIGNED_WEBHOOKS=true)');
      return;
    }

    if (!signature) {
      this.logger.warn('Webhook rejected: missing x-hub-signature-256 header');
      throw new UnauthorizedException('Webhook signature required');
    }
    const expected = `sha256=${this.encryptionService.hmacSha256(appSecret, rawBody)}`;
    if (
      signature.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    ) {
      this.logger.warn('Webhook rejected: signature mismatch');
      throw new UnauthorizedException('Invalid webhook signature');
    }
  }

  async handleWebhookEvent(
    payload: unknown,
    signature: string | undefined,
    rawBody: Buffer,
  ): Promise<void> {
    this.verifyWebhookSignature(signature, rawBody);

    const body = payload as WebhookPayload;
    if (body?.object !== 'whatsapp_business_account') return;

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== 'messages') continue;
        const value = change.value;

        // The tenant is derived ONLY from the receiving number registered with us.
        const account = await this.resolveInboundAccount(value.metadata?.phone_number_id);
        if (!account) continue;

        for (const message of value.messages ?? []) {
          await this.processInboundMessage(account, message, value.contacts?.[0]);
        }

        for (const status of value.statuses ?? []) {
          await this.processStatusUpdate(account, status);
        }
      }
    }
  }

  /**
   * phone_number_id -> exactly one registered account -> trusted tenantId.
   * Unknown / ambiguous / disconnected numbers are dropped (and ambiguity is a security event);
   * nothing is ever resolved by "first match" or by anything written in the message itself.
   */
  private async resolveInboundAccount(
    phoneNumberId: string | undefined,
  ): Promise<WhatsappAccount | null> {
    if (!phoneNumberId) return null;

    const rows = await this.db
      .select()
      .from(whatsappAccounts)
      .where(eq(whatsappAccounts.phoneNumberId, phoneNumberId))
      .limit(2);

    if (rows.length === 0) {
      this.logger.warn(`Webhook ignored: no account registered for phoneNumberId ${phoneNumberId}`);
      return null;
    }
    if (rows.length > 1) {
      this.logger.error(`Webhook dropped: phoneNumberId ${phoneNumberId} maps to several accounts`);
      await this.auditService.logSync({
        action: 'SECURITY_WHATSAPP_ACCOUNT_AMBIGUOUS',
        resourceType: 'whatsapp_account',
        metadata: { phoneNumberId, accountIds: rows.map((r) => r.id) },
      });
      return null;
    }

    const account = rows[0]!;
    if (account.deletedAt || account.status === 'disconnected') {
      this.logger.warn(`Webhook ignored: account ${account.id} is disconnected`);
      return null;
    }
    return account;
  }

  private async processInboundMessage(
    account: WhatsappAccount,
    message: WaMessage,
    waContact: WaContact | undefined,
  ): Promise<void> {
    const tenantId = account.tenantId;
    const content = this.extractMessageContent(message);

    // Normalize phone: Meta sends without '+', E.164 needs '+'
    const normalizedPhone = message.from.startsWith('+') ? message.from : `+${message.from}`;

    // Everything below is one transaction: either the message is fully recorded (and counted as
    // received) or nothing is, so a Meta retry can never lose or duplicate a message.
    const recorded = await this.db.transaction(async (tx) => {
      const inserted = await tx
        .insert(whatsappMessageLogs)
        .values({
          tenantId,
          accountId: account.id,
          direction: 'inbound',
          status: 'delivered',
          providerMessageId: message.id,
          from: normalizedPhone,
          messageType: message.type,
          content,
          idempotencyKey: message.id,
        })
        .onConflictDoNothing()
        .returning({ id: whatsappMessageLogs.id });

      if (inserted.length === 0) return null; // already processed: idempotent retry
      const logId = inserted[0]!.id;

      const contactId = await this.findOrCreateContact(tx, tenantId, normalizedPhone, waContact);

      const [existingConv] = await tx
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.tenantId, tenantId),
            eq(conversations.contactId, contactId),
            eq(conversations.channel, 'whatsapp'),
            ne(conversations.status, 'resolved'),
          ),
        )
        .limit(1);

      let conversationId: string;
      let aiPausedAt: Date | null = null;

      if (existingConv) {
        conversationId = existingConv.id;
        aiPausedAt = existingConv.aiPausedAt;
        await tx
          .update(conversations)
          .set({ lastMessageAt: new Date(), status: 'open', updatedAt: new Date() })
          .where(and(eq(conversations.id, conversationId), eq(conversations.tenantId, tenantId)));
      } else {
        const [newConv] = await tx
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

      await tx.insert(messages).values({
        conversationId,
        tenantId,
        direction: 'inbound',
        status: 'delivered',
        providerMessageId: message.id,
        content,
        isAiGenerated: false,
      });

      await tx
        .update(whatsappMessageLogs)
        .set({ conversationId, contactId })
        .where(and(eq(whatsappMessageLogs.id, logId), eq(whatsappMessageLogs.tenantId, tenantId)));

      const [contact] = await tx
        .select({ isBlocked: contacts.isBlocked })
        .from(contacts)
        .where(and(eq(contacts.id, contactId), eq(contacts.tenantId, tenantId)))
        .limit(1);

      return { conversationId, contactId, aiPausedAt, contactBlocked: contact?.isBlocked ?? false };
    });

    if (!recorded) {
      this.logger.log(`Duplicate webhook delivery ignored (message ${message.id})`);
      return;
    }

    this.logger.log(`Inbound message from ${normalizedPhone} (${message.type})`);
    const { conversationId, contactId, aiPausedAt, contactBlocked } = recorded;

    // ── Opt-out handling: STOP keywords trigger suppression + confirmation ──
    if (message.type === 'text' && message.text?.body && isOptOutMessage(message.text.body)) {
      await this.handleOptOut(tenantId, account, normalizedPhone, contactId);
      return;
    }

    if (aiPausedAt) {
      this.logger.log(`AI is paused for conversation ${conversationId}, skipping response`);
      return;
    }
    if (contactBlocked) {
      this.logger.log(`Contact ${contactId} is blocked, skipping AI response`);
      return;
    }

    // Only respond to text messages
    if (message.type !== 'text' || !message.text?.body) return;

    this.trackAiRun(
      this.triggerAiResponse(
        account,
        conversationId,
        contactId,
        normalizedPhone,
        message.text.body,
        message.id,
      ),
    );
  }

  /** The AI turn runs after the webhook has been acknowledged; tests/shutdown can await it. */
  private readonly aiRuns = new Set<Promise<void>>();

  private trackAiRun(run: Promise<void>): void {
    this.aiRuns.add(run);
    void run.finally(() => this.aiRuns.delete(run));
  }

  async whenAiIdle(): Promise<void> {
    await Promise.allSettled([...this.aiRuns]);
  }

  private async handleOptOut(
    tenantId: string,
    account: WhatsappAccount,
    normalizedPhone: string,
    contactId: string,
  ): Promise<void> {
    this.logger.log(`Opt-out received from ${normalizedPhone}`);

    // Add to suppressions (idempotent)
    await this.db
      .insert(suppressions)
      .values({
        tenantId,
        channel: 'whatsapp',
        value: normalizedPhone,
        normalizedValue: normalizedPhone,
        reason: 'user_requested_stop',
      })
      .onConflictDoNothing();

    // Revoke all whatsapp marketing consents for this contact
    await this.db
      .update(consents)
      .set({ status: 'revoked', revokedAt: new Date() })
      .where(
        and(
          eq(consents.contactId, contactId),
          eq(consents.tenantId, tenantId),
          eq(consents.channel, 'whatsapp'),
        ),
      );

    // Send opt-out confirmation (best-effort)
    const confirmText =
      'Você foi removido com sucesso das nossas comunicações de marketing. ' +
      'Não enviaremos mais mensagens promocionais. ' +
      'Se precisar de suporte, responda qualquer coisa a esta mensagem.';

    const bearerToken = this.decryptToken(account);
    await firstValueFrom(
      this.httpService.post(
        `${META_GRAPH_URL}/${account.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: normalizedPhone,
          type: 'text',
          text: { preview_url: false, body: confirmText },
        },
        { headers: { Authorization: `Bearer ${bearerToken}` } },
      ),
    ).catch((e) => this.logger.warn(`Opt-out confirmation send failed: ${e}`));

    await this.auditService.log({
      action: 'whatsapp.opt_out',
      resourceType: 'contact',
      resourceId: contactId,
      tenantId,
      metadata: { phone: normalizedPhone },
    });
  }

  private async findOrCreateContact(
    db: Pick<DrizzleDB, 'select' | 'insert'>,
    tenantId: string,
    normalizedPhone: string,
    waContact: WaContact | undefined,
  ): Promise<string> {
    const [identity] = await db
      .select({ contactId: contactIdentities.contactId })
      .from(contactIdentities)
      .where(
        and(
          eq(contactIdentities.tenantId, tenantId),
          eq(contactIdentities.channel, 'whatsapp'),
          eq(contactIdentities.normalizedValue, normalizedPhone),
        ),
      )
      .limit(1);

    if (identity) return identity.contactId;

    const name = waContact?.profile?.name ?? '';
    const [firstName, ...rest] = name.split(' ');

    const [newContact] = await db
      .insert(contacts)
      .values({
        tenantId,
        firstName: firstName || null,
        lastName: rest.length > 0 ? rest.join(' ') : null,
        origin: 'whatsapp_inbound',
      })
      .returning();

    await db.insert(contactIdentities).values({
      contactId: newContact!.id,
      tenantId,
      channel: 'whatsapp',
      value: normalizedPhone,
      normalizedValue: normalizedPhone,
      isVerified: true,
    });

    return newContact!.id;
  }

  /** Last turns of this conversation (tenant-scoped), oldest first, excluding the new message. */
  private async loadConversationHistory(
    tenantId: string,
    conversationId: string,
    excludeProviderMessageId: string,
  ): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
    const rows = await this.db
      .select({
        direction: messages.direction,
        content: messages.content,
        providerMessageId: messages.providerMessageId,
      })
      .from(messages)
      .where(and(eq(messages.tenantId, tenantId), eq(messages.conversationId, conversationId)))
      .orderBy(desc(messages.createdAt))
      .limit(14);

    const history = rows
      .filter((m) => m.providerMessageId !== excludeProviderMessageId)
      .reverse()
      .map((m) => ({
        role: (m.direction === 'inbound' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: String((m.content as { text?: string } | null)?.text ?? '').slice(0, 2000),
      }))
      .filter((m) => m.content.length > 0);

    while (history.length > 0 && history[0]!.role !== 'user') history.shift();
    return history;
  }

  private async triggerAiResponse(
    account: WhatsappAccount,
    conversationId: string,
    contactId: string,
    to: string,
    userMessage: string,
    inboundProviderMessageId: string,
  ): Promise<void> {
    const tenantId = account.tenantId;

    if (account.status !== 'connected') {
      this.logger.warn(`Account ${account.id} is ${account.status}; AI reply skipped`);
      return;
    }

    // Only the agent explicitly assigned to THIS channel may answer, and only if published.
    if (!account.agentId) {
      this.logger.log(`No agent assigned to WhatsApp account ${account.id}, skipping AI response`);
      return;
    }
    const [agent] = await this.db
      .select({ id: agents.id })
      .from(agents)
      .where(
        and(
          eq(agents.id, account.agentId),
          eq(agents.tenantId, tenantId),
          eq(agents.status, 'published'),
          isNull(agents.deletedAt),
        ),
      )
      .limit(1);

    if (!agent) {
      this.logger.warn(`Agent ${account.agentId} of account ${account.id} is not published`);
      return;
    }

    try {
      const ctx = createExecutionContext({
        tenantId,
        agentId: agent.id,
        channel: 'whatsapp',
        source: 'external_contact',
        conversationId,
        contactId,
      });
      const history = await this.loadConversationHistory(
        tenantId,
        conversationId,
        inboundProviderMessageId,
      );
      const result = await this.labService.chat(
        { agentId: agent.id, message: userMessage, history },
        ctx,
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
        inboundProviderMessageId,
      );

      this.logger.log(
        `AI reply sent for conversation ${conversationId} (trace: ${result.traceId})`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`AI response pipeline failed: ${msg}`);
    }
  }

  private async processStatusUpdate(
    account: WhatsappAccount,
    status: WaStatusUpdate,
  ): Promise<void> {
    if (!status.status || !status.id) return;
    if (!['sent', 'delivered', 'read', 'failed'].includes(status.status)) return;

    const next = status.status as 'sent' | 'delivered' | 'read' | 'failed';
    const when = new Date(Number(status.timestamp) * 1000);
    const at = Number.isNaN(when.getTime()) ? new Date() : when;

    // A status may only move forward (a late "delivered" never downgrades "read").
    const movesFrom: Record<typeof next, Array<'pending' | 'sent' | 'delivered' | 'read'>> = {
      sent: ['pending'],
      delivered: ['pending', 'sent'],
      read: ['pending', 'sent', 'delivered'],
      failed: ['pending', 'sent'],
    };

    const timestamps =
      next === 'sent'
        ? { sentAt: at }
        : next === 'delivered'
          ? { deliveredAt: at }
          : next === 'read'
            ? { readAt: at }
            : {
                failedAt: new Date(),
                errorCode: status.errors?.[0]?.code?.toString() ?? '',
                errorMessage: status.errors?.[0]?.title ?? '',
              };

    // Scoped to the account (and therefore tenant) that received the event.
    await this.db
      .update(whatsappMessageLogs)
      .set({ status: next, ...timestamps })
      .where(
        and(
          eq(whatsappMessageLogs.tenantId, account.tenantId),
          eq(whatsappMessageLogs.accountId, account.id),
          eq(whatsappMessageLogs.providerMessageId, status.id),
          eq(whatsappMessageLogs.direction, 'outbound'),
          inArray(whatsappMessageLogs.status, movesFrom[next]),
        ),
      );

    // Mirror the delivery state into the inbox message so agents see real ticks.
    const messageTimestamps =
      next === 'sent'
        ? { sentAt: at }
        : next === 'delivered'
          ? { deliveredAt: at }
          : next === 'read'
            ? { readAt: at }
            : {
                failedAt: new Date(),
                failureReason: status.errors?.[0]?.title ?? 'Delivery failed',
              };
    await this.db
      .update(messages)
      .set({ status: next, ...messageTimestamps })
      .where(
        and(
          eq(messages.tenantId, account.tenantId),
          eq(messages.providerMessageId, status.id),
          eq(messages.direction, 'outbound'),
          inArray(messages.status, movesFrom[next]),
        ),
      );
  }

  // ─── Templates ───────────────────────────────────────────────────────────────

  async syncTemplates(accountId: string, tenantId: string): Promise<void> {
    const [account] = await this.db
      .select()
      .from(whatsappAccounts)
      .where(and(eq(whatsappAccounts.id, accountId), eq(whatsappAccounts.tenantId, tenantId)))
      .limit(1);

    if (!account) throw new NotFoundException('WhatsApp account not found');

    const plainToken = this.decryptToken(account);

    try {
      const resp = await firstValueFrom(
        this.httpService.get(`${META_GRAPH_URL}/${account.wabaId}/message_templates`, {
          params: { access_token: plainToken, limit: 100 },
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
            target: [whatsappTemplates.accountId, whatsappTemplates.templateId],
            set: { status: tpl.status, components: tpl.components ?? [], updatedAt: new Date() },
          });
      }

      await this.db
        .update(whatsappAccounts)
        .set({ lastSyncedAt: new Date() })
        .where(and(eq(whatsappAccounts.id, accountId), eq(whatsappAccounts.tenantId, tenantId)));

      this.logger.log(`Synced ${templates.length} templates for account ${accountId}`);
    } catch (err) {
      this.logger.error(`Template sync error: ${err}`);
    }
  }

  async listTemplates(tenantId: string, accountId: string) {
    await this.getAccount(tenantId, accountId);
    return this.db
      .select()
      .from(whatsappTemplates)
      .where(
        and(eq(whatsappTemplates.tenantId, tenantId), eq(whatsappTemplates.accountId, accountId)),
      );
  }

  async getStats(tenantId: string, accountId: string) {
    await this.getAccount(tenantId, accountId);
    const logs = await this.db
      .select()
      .from(whatsappMessageLogs)
      .where(
        and(
          eq(whatsappMessageLogs.tenantId, tenantId),
          eq(whatsappMessageLogs.accountId, accountId),
        ),
      );

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

interface WaContact {
  profile?: { name: string };
  wa_id: string;
}

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
