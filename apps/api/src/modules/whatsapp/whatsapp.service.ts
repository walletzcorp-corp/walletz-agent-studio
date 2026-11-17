import {
  Injectable, Inject, Logger, NotFoundException,
  BadRequestException, ConflictException, UnauthorizedException,
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
  contacts, contactIdentities, consents, suppressions,
} from '../../database/schema/contacts';
import { agents } from '../../database/schema/agents';
import { AuditService } from '../../shared/audit/audit.service';
import { PlanLimitsService } from '../../shared/plans/plan-limits.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { EncryptionService } from '../../shared/crypto/encryption.service';
import { createId } from '../../database/utils/id';
import { LabService } from '../lab/lab.service';
import type { ConnectWhatsappDto, EmbeddedSignupDto, SendMessageDto } from './dto/connect-account.dto';

const META_GRAPH_URL = 'https://graph.facebook.com/v22.0';

export interface WhatsappAccountView {
  id: string;
  tenantId: string;
  displayName: string | null;
  phoneNumber: string | null;
  phoneNumberId: string;
  wabaId: string;
  status: WhatsappAccount['status'];
  qualityRating: string | null;
  messagingLimitTier: string | null;
  lastSyncedAt: Date | null;
  agentId: string | null;
  credentialSource: 'client' | 'embedded';
  hasAppSecret: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WhatsappAccountConnectResult {
  account: WhatsappAccountView;
  /** Dados para colar no app Meta do cliente (WhatsApp → Configuração → Webhook). */
  webhook: { callbackUrl: string; verifyToken: string; fields: string[] };
  /** App inscrito na WABA (subscribed_apps). */
  subscribed: boolean;
  /** null = token permanente. */
  tokenExpiresAt: Date | null;
}

// Keywords that trigger opt-out (case-insensitive, trimmed)
const OPT_OUT_KEYWORDS = new Set([
  'stop', 'sair', 'cancelar', 'pare', 'parar', 'remover', 'descadastrar',
  'desinscrever', 'não quero', 'nao quero', 'opt out', 'optout',
  'unsubscribe', 'cancel',
]);

function isOptOutMessage(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  return OPT_OUT_KEYWORDS.has(normalized);
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
    private readonly planLimits: PlanLimitsService,
    private readonly webhooks: WebhooksService,
  ) {}

  /** WhatsApp oficial só nos planos que o incluem, até o limite de números. */
  private async assertCanConnectNumber(tenantId: string, phoneNumberId?: string): Promise<void> {
    await this.planLimits.assertFeature(tenantId, 'whatsapp');
    if (phoneNumberId) {
      const [same] = await this.db
        .select({ id: whatsappAccounts.id })
        .from(whatsappAccounts)
        .where(and(
          eq(whatsappAccounts.tenantId, tenantId),
          eq(whatsappAccounts.phoneNumberId, phoneNumberId),
          isNull(whatsappAccounts.deletedAt),
        ))
        .limit(1);
      if (same) return;
    }
    await this.planLimits.assertCanAdd(tenantId, 'whatsappNumbers');
  }

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

  /** Conta como sai da API: nunca expõe token, App Secret nem token de verificação. */
  toView(account: WhatsappAccount): WhatsappAccountView {
    return {
      id: account.id,
      tenantId: account.tenantId,
      displayName: account.displayName,
      phoneNumber: account.phoneNumber,
      phoneNumberId: account.phoneNumberId,
      wabaId: account.wabaId,
      status: account.status,
      qualityRating: account.qualityRating,
      messagingLimitTier: account.messagingLimitTier,
      lastSyncedAt: account.lastSyncedAt,
      agentId: account.agentId,
      credentialSource: account.credentialSource === 'client' ? 'client' : 'embedded',
      hasAppSecret: Boolean(account.appSecret),
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  }

  /** URL pública do webhook exclusivo deste número (configurada no app Meta do cliente). */
  webhookUrlFor(accountId: string): string {
    const base = (process.env.PUBLIC_API_URL ?? 'http://localhost:3001/api').replace(/\/$/, '');
    return `${base}/v1/webhook/whatsapp/${accountId}`;
  }

  /** Dados que o cliente cola no painel da Meta (Webhook → Callback URL e Verify token). */
  async webhookSetup(tenantId: string, accountId: string): Promise<{ callbackUrl: string; verifyToken: string; fields: string[] }> {
    const account = await this.getAccount(tenantId, accountId);
    if (account.credentialSource !== 'client') {
      throw new BadRequestException('Este número foi conectado pelo app da Walletz; o webhook já é gerenciado pela plataforma.');
    }
    return { callbackUrl: this.webhookUrlFor(account.id), verifyToken: account.verifyToken, fields: ['messages'] };
  }

  /** Mensagem de erro legível de uma resposta da Graph API (axios). */
  private metaError(err: unknown): string {
    const data = (err as { response?: { data?: { error?: { message?: string; code?: number } } } })?.response?.data?.error;
    if (data?.message) return `${data.message}${data.code ? ` (código ${data.code})` : ''}`;
    return err instanceof Error ? err.message : String(err);
  }

  /**
   * Valida as credenciais do app Meta do próprio cliente:
   * - debug_token (App ID|App Secret): token válido, do mesmo app, com permissão de WhatsApp; App Secret correto
   * - o número pertence à conta WhatsApp Business (WABA) informada
   */
  private async validateClientCredentials(input: {
    appId: string;
    appSecret: string;
    accessToken: string;
    wabaId: string;
    phoneNumberId: string;
  }): Promise<{ displayName?: string; phoneNumber?: string; tokenExpiresAt: Date | null }> {
    let debug: { is_valid?: boolean; app_id?: string; scopes?: string[]; expires_at?: number; error?: { message?: string } } | undefined;
    try {
      const resp = await firstValueFrom(
        this.httpService.get(`${META_GRAPH_URL}/debug_token`, {
          params: { input_token: input.accessToken, access_token: `${input.appId}|${input.appSecret}` },
        }),
      );
      debug = (resp.data as { data?: typeof debug }).data;
    } catch (err) {
      throw new BadRequestException(`A Meta recusou o App ID/App Secret: ${this.metaError(err)}`);
    }
    if (!debug?.is_valid) {
      throw new BadRequestException(`Token de acesso inválido ou expirado${debug?.error?.message ? `: ${debug.error.message}` : '.'}`);
    }
    if (debug.app_id && debug.app_id !== input.appId) {
      throw new BadRequestException('O token de acesso pertence a outro app da Meta (App ID diferente).');
    }
    const scopes = debug.scopes ?? [];
    if (!scopes.includes('whatsapp_business_messaging')) {
      throw new BadRequestException('O token não tem a permissão "whatsapp_business_messaging". Gere um token de Usuário do Sistema com essa permissão.');
    }

    let phones: Array<{ id: string; display_phone_number?: string; verified_name?: string }> = [];
    try {
      const resp = await firstValueFrom(
        this.httpService.get(`${META_GRAPH_URL}/${input.wabaId}/phone_numbers`, {
          params: { access_token: input.accessToken, fields: 'id,display_phone_number,verified_name' },
        }),
      );
      phones = (resp.data as { data?: typeof phones }).data ?? [];
    } catch (err) {
      throw new BadRequestException(`Não foi possível ler a conta WhatsApp Business (WABA ID): ${this.metaError(err)}`);
    }
    const phone = phones.find((p) => p.id === input.phoneNumberId);
    if (!phone) {
      throw new BadRequestException('Este Phone Number ID não pertence à conta WhatsApp Business (WABA) informada.');
    }
    return {
      ...(phone.verified_name ? { displayName: phone.verified_name } : {}),
      ...(phone.display_phone_number ? { phoneNumber: phone.display_phone_number } : {}),
      tokenExpiresAt: debug.expires_at ? new Date(debug.expires_at * 1000) : null,
    };
  }

  /** Inscreve o app do cliente para receber os eventos da WABA (sem isso o webhook não recebe mensagens). */
  private async subscribeApp(wabaId: string, accessToken: string): Promise<boolean> {
    try {
      await firstValueFrom(
        this.httpService.post(`${META_GRAPH_URL}/${wabaId}/subscribed_apps`, null, { params: { access_token: accessToken } }),
      );
      return true;
    } catch (err) {
      this.logger.warn(`Falha ao inscrever app na WABA ${wabaId}: ${this.metaError(err)}`);
      return false;
    }
  }

  private async assertAgentOfTenant(tenantId: string, agentId: string | null | undefined): Promise<void> {
    if (!agentId) return;
    const [agent] = await this.db
      .select({ id: agents.id })
      .from(agents)
      .where(and(eq(agents.id, agentId), eq(agents.tenantId, tenantId), isNull(agents.deletedAt)))
      .limit(1);
    if (!agent) throw new NotFoundException('Agente não encontrado');
  }

  /**
   * Conecta um número usando o app Meta do PRÓPRIO cliente (token permanente de
   * Usuário do Sistema + App Secret). Cada número ganha webhook e token de verificação próprios.
   */
  async connectAccount(dto: ConnectWhatsappDto, tenantId: string, userId: string): Promise<WhatsappAccountConnectResult> {
    const phoneNumberId = dto.phoneNumberId.trim();
    const [existing] = await this.db
      .select()
      .from(whatsappAccounts)
      .where(eq(whatsappAccounts.phoneNumberId, phoneNumberId));

    if (existing && existing.tenantId !== tenantId && !existing.deletedAt) {
      throw new ConflictException('Este número já está conectado em outra organização.');
    }
    await this.assertCanConnectNumber(tenantId, phoneNumberId);
    await this.assertAgentOfTenant(tenantId, dto.agentId);

    const accessToken = dto.accessToken.trim();
    const appSecret = dto.appSecret.trim();
    const meta = await this.validateClientCredentials({
      appId: dto.appId.trim(),
      appSecret,
      accessToken,
      wabaId: dto.wabaId.trim(),
      phoneNumberId,
    });

    const accountId = existing && existing.tenantId === tenantId ? existing.id : createId();
    const verifyToken = crypto.randomBytes(24).toString('base64url');
    const values = {
      wabaId: dto.wabaId.trim(),
      accessToken: this.encryptionService.encrypt(accessToken),
      appSecret: this.encryptionService.encrypt(appSecret),
      verifyToken,
      webhookUrl: this.webhookUrlFor(accountId),
      displayName: meta.displayName ?? null,
      phoneNumber: meta.phoneNumber ?? null,
      status: 'connected' as const,
      credentialSource: 'client',
      agentId: dto.agentId ?? null,
      deletedAt: null,
      updatedAt: new Date(),
    };

    const [account] = await this.db
      .insert(whatsappAccounts)
      .values({ id: accountId, tenantId, phoneNumberId, connectedByUserId: userId, ...values })
      .onConflictDoUpdate({ target: whatsappAccounts.phoneNumberId, set: { tenantId, connectedByUserId: userId, ...values } })
      .returning();

    const subscribed = await this.subscribeApp(values.wabaId, accessToken);

    await this.auditService.log({
      action: 'whatsapp.account_connected',
      resourceType: 'whatsapp_account',
      resourceId: account!.id,
      tenantId,
      userId,
      metadata: { phoneNumberId, wabaId: values.wabaId, source: 'client', subscribed, tokenExpiresAt: meta.tokenExpiresAt?.toISOString() ?? 'never' },
    });

    void this.syncTemplates(account!.id, tenantId).catch((e) => this.logger.warn(`Template sync failed: ${e}`));

    return {
      account: this.toView(account!),
      webhook: { callbackUrl: this.webhookUrlFor(account!.id), verifyToken, fields: ['messages'] },
      subscribed,
      tokenExpiresAt: meta.tokenExpiresAt,
    };
  }

  /** Troca o token e/ou o App Secret (validados antes de substituir). */
  async updateCredentials(
    tenantId: string,
    accountId: string,
    dto: { appId: string; accessToken?: string; appSecret?: string },
    userId: string,
  ): Promise<WhatsappAccountView> {
    const account = await this.getAccount(tenantId, accountId);
    const accessToken = dto.accessToken?.trim() || this.decryptToken(account);
    const appSecret = dto.appSecret?.trim() || (account.appSecret ? this.encryptionService.tryDecrypt(account.appSecret) : null);
    if (!appSecret) throw new BadRequestException('Informe o App Secret do app da Meta.');
    const meta = await this.validateClientCredentials({
      appId: dto.appId.trim(),
      appSecret,
      accessToken,
      wabaId: account.wabaId,
      phoneNumberId: account.phoneNumberId,
    });
    const [updated] = await this.db
      .update(whatsappAccounts)
      .set({
        accessToken: this.encryptionService.encrypt(accessToken),
        appSecret: this.encryptionService.encrypt(appSecret),
        credentialSource: 'client',
        status: 'connected',
        ...(meta.displayName ? { displayName: meta.displayName } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(whatsappAccounts.id, accountId), eq(whatsappAccounts.tenantId, tenantId)))
      .returning();
    await this.subscribeApp(account.wabaId, accessToken);
    await this.auditService.log({
      action: 'whatsapp.credentials_updated',
      resourceType: 'whatsapp_account',
      resourceId: accountId,
      tenantId,
      userId,
      metadata: { tokenRotated: Boolean(dto.accessToken), appSecretRotated: Boolean(dto.appSecret) },
    });
    return this.toView(updated!);
  }

  /** Define qual agente responde neste número (null = primeiro agente publicado). */
  async setAccountAgent(tenantId: string, accountId: string, agentId: string | null, userId: string): Promise<WhatsappAccountView> {
    const account = await this.getAccount(tenantId, accountId);
    await this.assertAgentOfTenant(tenantId, agentId);
    const [updated] = await this.db
      .update(whatsappAccounts)
      .set({ agentId, updatedAt: new Date() })
      .where(and(eq(whatsappAccounts.id, accountId), eq(whatsappAccounts.tenantId, tenantId)))
      .returning();
    await this.auditService.log({
      action: 'whatsapp.agent_set',
      resourceType: 'whatsapp_account',
      resourceId: accountId,
      tenantId,
      userId,
      previousState: { agentId: account.agentId },
      newState: { agentId },
    });
    return this.toView(updated!);
  }

  // ─── Embedded Signup ─────────────────────────────────────────────────────────

  async embeddedSignup(dto: EmbeddedSignupDto, tenantId: string, userId: string): Promise<WhatsappAccount> {
    await this.assertCanConnectNumber(tenantId, dto.phoneNumberId);
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
      throw new BadRequestException('Não foi possível concluir a autorização com a Meta. Tente novamente.');
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
        const bizData = wabaResp.data as { data?: Array<{ whatsapp_business_accounts?: { data?: Array<{ id: string }> } }> };
        wabaId = bizData.data?.[0]?.whatsapp_business_accounts?.data?.[0]?.id;
      } catch (err) {
        this.logger.warn(`Could not auto-resolve WABA ID: ${err instanceof Error ? err.message : err}`);
      }
    }

    if (wabaId && !phoneNumberId) {
      try {
        const phoneResp = await firstValueFrom(
          this.httpService.get(`${META_GRAPH_URL}/${wabaId}/phone_numbers`, {
            params: { access_token: accessToken, fields: 'display_phone_number,verified_name,id,status' },
          }),
        );
        const phoneData = phoneResp.data as { data?: Array<{ id: string; display_phone_number?: string; verified_name?: string; status?: string }> };
        const firstPhone = phoneData.data?.[0];
        if (firstPhone) {
          phoneNumberId = firstPhone.id;
          phoneNumber = firstPhone.display_phone_number;
          displayName = firstPhone.verified_name;
        }
      } catch (err) {
        this.logger.warn(`Could not auto-resolve Phone Number ID: ${err instanceof Error ? err.message : err}`);
      }
    }

    if (!phoneNumberId || !wabaId) {
      throw new BadRequestException('Não conseguimos identificar o número de WhatsApp autorizado. Tente novamente.');
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
      } catch { /* use what we have */ }
    }

    // 4. Persist — internal verify token is always generated by us, never exposed to user
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const encryptedAccessToken = this.encryptionService.encrypt(accessToken);

    const [account] = await this.db
      .insert(whatsappAccounts)
      .values({
        tenantId,
        phoneNumberId,
        wabaId,
        accessToken: encryptedAccessToken,
        verifyToken,
        displayName,
        phoneNumber,
        status: 'connected',
        connectedByUserId: userId,
      })
      .onConflictDoUpdate({
        target: whatsappAccounts.phoneNumberId,
        set: {
          accessToken: encryptedAccessToken,
          displayName,
          phoneNumber,
          status: 'connected',
          updatedAt: new Date(),
        },
      })
      .returning();

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

    return account!;
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
  ): Promise<WhatsappAccount> {
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
    const body = (err as { response?: { data?: { error?: { code?: number } } } })
      ?.response?.data?.error;
    const tokenExpiryCodes = [190, 102, 463, 467];
    if (body?.code && tokenExpiryCodes.includes(body.code)) {
      this.logger.warn(`Token expired/invalid for account ${accountId} (code ${body.code}) — marking for reconnection`);
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
        .where(eq(whatsappMessageLogs.id, logId));

      return { messageId: logId, status: 'sent' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await this.db
        .update(whatsappMessageLogs)
        .set({ status: 'failed', errorMessage: msg, failedAt: new Date() })
        .where(eq(whatsappMessageLogs.id, logId));
      // Detect expired/invalid token and mark account for reconnection
      await this.handleApiError(err, account.id, tenantId);
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

  verifyWebhook(mode: string, challenge: string, token: string): string {
    if (mode !== 'subscribe') throw new BadRequestException('Invalid mode');
    const expected = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
    if (!expected || token !== expected) {
      throw new UnauthorizedException('Invalid verify token');
    }
    return challenge;
  }

  /** GET do webhook exclusivo de um número: confere o token de verificação daquele número. */
  async verifyAccountWebhook(accountId: string, mode: string, challenge: string, token: string): Promise<string> {
    if (mode !== 'subscribe') throw new BadRequestException('Invalid mode');
    const [account] = await this.db
      .select({ verifyToken: whatsappAccounts.verifyToken })
      .from(whatsappAccounts)
      .where(and(eq(whatsappAccounts.id, accountId), isNull(whatsappAccounts.deletedAt)))
      .limit(1);
    const expected = account?.verifyToken ?? '';
    if (!account || !token || token.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected))) {
      throw new UnauthorizedException('Invalid verify token');
    }
    return challenge;
  }

  /** POST do webhook exclusivo: assinatura obrigatória com o App Secret do cliente; só aceita eventos do próprio número. */
  async handleAccountWebhook(accountId: string, payload: unknown, signature: string | undefined, rawBody: Buffer): Promise<void> {
    const [account] = await this.db
      .select()
      .from(whatsappAccounts)
      .where(and(eq(whatsappAccounts.id, accountId), isNull(whatsappAccounts.deletedAt)))
      .limit(1);
    const secret = account?.appSecret ? this.encryptionService.tryDecrypt(account.appSecret) : null;
    if (!account || !secret) throw new UnauthorizedException('Webhook desconhecido');
    this.assertSignature(secret, signature, rawBody);
    await this.dispatchWebhookPayload(payload, account.phoneNumberId);
  }

  private assertSignature(appSecret: string, signature: string | undefined, rawBody: Buffer): void {
    if (!signature) throw new UnauthorizedException('Missing webhook signature');
    const expected = `sha256=${this.encryptionService.hmacSha256(appSecret, rawBody)}`;
    if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      this.logger.warn('Webhook signature mismatch — request rejected');
      throw new UnauthorizedException('Invalid webhook signature');
    }
  }

  /** Webhook global (app Meta da Walletz / Embedded Signup). */
  async handleWebhookEvent(
    payload: unknown,
    signature: string | undefined,
    rawBody: Buffer,
  ): Promise<void> {
    const appSecret = process.env.META_APP_SECRET;
    if (appSecret) {
      this.assertSignature(appSecret, signature, rawBody);
    } else if (process.env.NODE_ENV === 'production') {
      // Sem App Secret não há como saber se o evento veio da Meta.
      throw new UnauthorizedException('Webhook global desativado (META_APP_SECRET não configurado)');
    }
    await this.dispatchWebhookPayload(payload);
  }

  private async dispatchWebhookPayload(payload: unknown, onlyPhoneNumberId?: string): Promise<void> {
    const body = payload as WebhookPayload;

    if (body.object !== 'whatsapp_business_account') return;

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== 'messages') continue;
        const value = change.value;

        const phoneNumberId = value.metadata?.phone_number_id;
        if (onlyPhoneNumberId && phoneNumberId !== onlyPhoneNumberId) continue;
        for (const message of value.messages ?? []) {
          await this.processInboundMessage(phoneNumberId, message, value.contacts?.[0]);
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

    if (!account || account.deletedAt) {
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
      void this.webhooks.emit(tenantId, 'conversation.created', { conversationId, channel: 'whatsapp', contactId });
    }

    // ── Insert inbound message into messages table ──
    void this.webhooks.emit(tenantId, 'message.received', {
      conversationId,
      channel: 'whatsapp',
      contactId,
      text: message.type === 'text' ? message.text?.body ?? '' : null,
      messageType: message.type,
    });
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

    // ── Opt-out handling: STOP keywords trigger suppression + confirmation ──
    if (message.type === 'text' && message.text?.body && isOptOutMessage(message.text.body)) {
      await this.handleOptOut(tenantId, account, normalizedPhone, contactId);
      return;
    }

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
    // Agente do número; sem agente definido, o primeiro publicado (depois qualquer não arquivado)
    const candidates = await this.db
      .select({ id: agents.id, status: agents.status })
      .from(agents)
      .where(and(
        eq(agents.tenantId, tenantId),
        isNull(agents.deletedAt),
        ne(agents.status, 'archived'),
      ));
    const agent =
      (account.agentId ? candidates.find((a) => a.id === account.agentId) : undefined) ??
      candidates.find((a) => a.status === 'published') ??
      candidates[0];

    if (!agent) {
      this.logger.log(`No active agent found for tenant ${tenantId}, skipping AI response`);
      return;
    }

    try {
      const result = await this.labService.chat(
        { agentId: agent.id, message: userMessage },
        tenantId,
        undefined,
        { conversationId, contactId },
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

      void this.webhooks.emit(tenantId, 'message.replied', {
        conversationId,
        channel: 'whatsapp',
        agentId: agent.id,
        text: result.reply,
      });
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
