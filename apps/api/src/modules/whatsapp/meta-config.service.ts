import { Injectable, Inject, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { eq } from 'drizzle-orm';
import { DRIZZLE_TOKEN, type DrizzleDB } from '../../database/database.module';
import { metaConfigurations } from '../../database/schema/meta-config';
import { EncryptionService } from '../../shared/crypto/encryption.service';
import { AuditService } from '../../shared/audit/audit.service';
import { createId } from '../../database/utils/id';
import type { SaveMetaConfigDto } from './dto/meta-config.dto';

const GRAPH_BASE = 'https://graph.facebook.com';

export interface MetaConfigPublic {
  appId: string;
  configId: string;
  hasAppSecret: boolean;
  appSecretTail: string | null;
  hasVerifyToken: boolean;
  graphApiVersion: string;
  webhookStatus: string;
  connectionStatus: string;
  lastTestAt: string | null;
  lastTestResult: Record<string, unknown>;
  webhookUrl: string;
}

export interface TestResult {
  appId: { ok: boolean; message: string };
  appSecret: { ok: boolean; message: string };
  configId: { ok: boolean; message: string };
  graphApi: { ok: boolean; message: string };
  overallOk: boolean;
}

export interface WebhookTestResult {
  reachable: boolean;
  challengeOk: boolean;
  message: string;
}

@Injectable()
export class MetaConfigService {
  private readonly logger = new Logger(MetaConfigService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: DrizzleDB,
    private readonly encryption: EncryptionService,
    private readonly http: HttpService,
    private readonly audit: AuditService,
  ) {}

  private webhookBaseUrl(): string {
    return process.env.WEBHOOK_BASE_URL ?? process.env.API_URL ?? 'https://walletzcorp.com';
  }

  async getConfig(tenantId: string): Promise<MetaConfigPublic> {
    const row = await this.findRow(tenantId);
    return this.toPublic(row, tenantId);
  }

  async saveConfig(dto: SaveMetaConfigDto, tenantId: string, userId: string): Promise<MetaConfigPublic> {
    const existing = await this.findRow(tenantId);

    const encryptedAppSecret = dto.appSecret
      ? this.encryption.encrypt(dto.appSecret)
      : existing?.encryptedAppSecret ?? null;

    const encryptedVerifyToken = dto.verifyToken
      ? this.encryption.encrypt(dto.verifyToken)
      : existing?.encryptedVerifyToken ?? null;

    const values = {
      tenantId,
      appId: dto.appId,
      configId: dto.configId,
      encryptedAppSecret,
      encryptedVerifyToken,
      graphApiVersion: dto.graphApiVersion ?? existing?.graphApiVersion ?? 'v22.0',
      connectionStatus: 'configured',
      updatedAt: new Date(),
    };

    let row: typeof metaConfigurations.$inferSelect;

    if (existing) {
      const [updated] = await this.db
        .update(metaConfigurations)
        .set(values)
        .where(eq(metaConfigurations.tenantId, tenantId))
        .returning();
      row = updated!;
    } else {
      const [inserted] = await this.db
        .insert(metaConfigurations)
        .values({ ...values, id: createId() })
        .returning();
      row = inserted!;
    }

    await this.audit.log({
      action: existing ? 'META_CONFIG_UPDATED' : 'META_CONFIG_CREATED',
      resourceType: 'meta_configuration',
      resourceId: row.id,
      tenantId,
      userId,
      metadata: {
        appId: dto.appId,
        configId: dto.configId,
        hasAppSecret: !!encryptedAppSecret,
        hasVerifyToken: !!encryptedVerifyToken,
      },
    });

    return this.toPublic(row, tenantId);
  }

  async testConnection(tenantId: string, userId: string): Promise<TestResult> {
    const row = await this.findRow(tenantId);
    const result: TestResult = {
      appId: { ok: false, message: 'App ID não informado' },
      appSecret: { ok: false, message: 'App Secret não informado' },
      configId: { ok: false, message: 'Config ID não informado' },
      graphApi: { ok: false, message: 'Não testado' },
      overallOk: false,
    };

    const appId = row?.appId || process.env.META_APP_ID;
    const rawSecret = row?.encryptedAppSecret
      ? this.encryption.tryDecrypt(row.encryptedAppSecret)
      : process.env.META_APP_SECRET ?? null;
    const configId = row?.configId || process.env.NEXT_PUBLIC_META_CONFIG_ID;

    if (!appId) {
      result.appId = { ok: false, message: 'App ID não informado' };
    } else {
      result.appId = { ok: true, message: 'App ID informado' };
    }

    if (!rawSecret) {
      result.appSecret = { ok: false, message: 'App Secret não informado' };
    } else {
      result.appSecret = { ok: true, message: 'App Secret informado' };
    }

    if (!configId) {
      result.configId = { ok: false, message: 'Config ID não informado' };
    } else {
      result.configId = { ok: true, message: 'Config ID informado' };
    }

    // Test Graph API reachability + app credentials
    if (appId && rawSecret) {
      const appToken = `${appId}|${rawSecret}`;
      try {
        const version = row?.graphApiVersion ?? 'v22.0';
        const resp = await firstValueFrom(
          this.http.get(`${GRAPH_BASE}/${version}/${appId}`, {
            params: { fields: 'name,id', access_token: appToken },
            timeout: 10000,
          }),
        );
        const data = resp.data as { id?: string; name?: string; error?: { message: string } };
        if (data.error) {
          result.graphApi = { ok: false, message: data.error.message };
          result.appSecret = { ok: false, message: `App Secret inválido: ${data.error.message}` };
          result.appId = { ok: false, message: 'App ID não reconhecido pela Meta' };
        } else if (data.id) {
          result.graphApi = { ok: true, message: `Graph API acessível (App: ${data.name ?? data.id})` };
          result.appId = { ok: true, message: `App ID válido (${data.name ?? data.id})` };
          result.appSecret = { ok: true, message: 'App Secret válido' };
        }
      } catch (err) {
        const msg = this.extractErrorMessage(err);
        if (msg.includes('Invalid OAuth') || msg.includes('invalid') || msg.includes('190')) {
          result.appId = { ok: false, message: 'O App ID informado não foi reconhecido pela Meta' };
          result.appSecret = { ok: false, message: 'O App Secret não corresponde a este App' };
        }
        result.graphApi = { ok: false, message: `Erro ao contactar a Meta: ${msg}` };
      }
    } else {
      result.graphApi = { ok: false, message: 'App ID ou App Secret não configurados' };
    }

    result.overallOk = result.appId.ok && result.appSecret.ok && result.configId.ok && result.graphApi.ok;

    // Persist test result
    if (row) {
      await this.db
        .update(metaConfigurations)
        .set({
          connectionStatus: result.overallOk ? 'configured' : 'error',
          lastTestAt: new Date(),
          lastTestResult: result as unknown as Record<string, unknown>,
          updatedAt: new Date(),
        })
        .where(eq(metaConfigurations.tenantId, tenantId));
    }

    await this.audit.log({
      action: 'META_CONFIG_TESTED',
      resourceType: 'meta_configuration',
      resourceId: row?.id ?? tenantId,
      tenantId,
      userId,
      metadata: { overallOk: result.overallOk },
    });

    return result;
  }

  async testWebhook(tenantId: string, userId: string): Promise<WebhookTestResult> {
    const webhookUrl = `${this.webhookBaseUrl()}/v1/webhook/whatsapp`;
    const row = await this.findRow(tenantId);
    const verifyToken = row?.encryptedVerifyToken
      ? this.encryption.tryDecrypt(row.encryptedVerifyToken)
      : process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ?? null;

    const result: WebhookTestResult = {
      reachable: false,
      challengeOk: false,
      message: 'Não testado',
    };

    if (!verifyToken) {
      result.message = 'Verify Token não configurado';
      return result;
    }

    const challenge = `walletz-test-${Date.now()}`;
    try {
      const resp = await firstValueFrom(
        this.http.get(webhookUrl, {
          params: {
            'hub.mode': 'subscribe',
            'hub.verify_token': verifyToken,
            'hub.challenge': challenge,
          },
          timeout: 8000,
          validateStatus: () => true,
        }),
      );

      result.reachable = true;
      if (String(resp.data).trim() === challenge) {
        result.challengeOk = true;
        result.message = 'Webhook ativo e respondendo corretamente';
      } else {
        result.message = `Webhook acessível mas challenge incorreto (verify token inválido?)`;
      }
    } catch (err) {
      result.message = `Webhook inacessível: ${this.extractErrorMessage(err)}`;
    }

    if (row) {
      await this.db
        .update(metaConfigurations)
        .set({
          webhookStatus: result.challengeOk ? 'active' : 'error',
          updatedAt: new Date(),
        })
        .where(eq(metaConfigurations.tenantId, tenantId));
    }

    await this.audit.log({
      action: 'WEBHOOK_TESTED',
      resourceType: 'meta_configuration',
      resourceId: row?.id ?? tenantId,
      tenantId,
      userId,
      metadata: { reachable: result.reachable, challengeOk: result.challengeOk },
    });

    return result;
  }

  /** Resolve effective Meta credentials: DB-first, fall back to env. */
  async getEffectiveConfig(tenantId: string): Promise<{ appId: string; appSecret: string } | null> {
    const row = await this.findRow(tenantId);
    const appId = row?.appId || process.env.META_APP_ID;
    const rawSecret = row?.encryptedAppSecret
      ? this.encryption.tryDecrypt(row.encryptedAppSecret)
      : process.env.META_APP_SECRET ?? null;
    if (!appId || !rawSecret) return null;
    return { appId, appSecret: rawSecret };
  }

  async getEffectiveConfigId(tenantId: string): Promise<string | null> {
    const row = await this.findRow(tenantId);
    return row?.configId || process.env.NEXT_PUBLIC_META_CONFIG_ID || null;
  }

  private async findRow(tenantId: string) {
    const [row] = await this.db
      .select()
      .from(metaConfigurations)
      .where(eq(metaConfigurations.tenantId, tenantId))
      .limit(1);
    return row ?? null;
  }

  private toPublic(
    row: typeof metaConfigurations.$inferSelect | null,
    tenantId: string,
  ): MetaConfigPublic {
    const webhookUrl = `${this.webhookBaseUrl()}/v1/webhook/whatsapp`;
    if (!row) {
      return {
        appId: process.env.META_APP_ID ?? '',
        configId: process.env.NEXT_PUBLIC_META_CONFIG_ID ?? '',
        hasAppSecret: !!process.env.META_APP_SECRET,
        appSecretTail: process.env.META_APP_SECRET
          ? `••••${process.env.META_APP_SECRET.slice(-4)}`
          : null,
        hasVerifyToken: !!process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
        graphApiVersion: 'v22.0',
        webhookStatus: 'unknown',
        connectionStatus: 'unconfigured',
        lastTestAt: null,
        lastTestResult: {},
        webhookUrl,
      };
    }

    let appSecretTail: string | null = null;
    if (row.encryptedAppSecret) {
      const plain = this.encryption.tryDecrypt(row.encryptedAppSecret);
      if (plain && plain.length >= 4) {
        appSecretTail = `••••${plain.slice(-4)}`;
      } else if (plain) {
        appSecretTail = '••••';
      }
    }

    return {
      appId: row.appId,
      configId: row.configId,
      hasAppSecret: !!row.encryptedAppSecret,
      appSecretTail,
      hasVerifyToken: !!row.encryptedVerifyToken,
      graphApiVersion: row.graphApiVersion,
      webhookStatus: row.webhookStatus,
      connectionStatus: row.connectionStatus,
      lastTestAt: row.lastTestAt?.toISOString() ?? null,
      lastTestResult: (row.lastTestResult as Record<string, unknown>) ?? {},
      webhookUrl,
    };
  }

  private extractErrorMessage(err: unknown): string {
    const axiosMsg = (err as { response?: { data?: { error?: { message?: string } } } })
      ?.response?.data?.error?.message;
    if (axiosMsg) return axiosMsg;
    if (err instanceof Error) return err.message;
    return String(err);
  }
}
