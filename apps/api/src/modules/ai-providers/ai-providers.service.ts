import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, isNull, ne } from 'drizzle-orm';
import { DRIZZLE_TOKEN, type DrizzleDB } from '../../database/database.module';
import {
  aiProviderConnections,
  type AiConnectionStatus,
  type AiProvider,
  type AiProviderConnection,
} from '../../database/schema/ai-providers';
import { agents } from '../../database/schema/agents';
import { EncryptionService } from '../../shared/crypto/encryption.service';
import { AuditService } from '../../shared/audit/audit.service';
import { PlanLimitsService } from '../../shared/plans/plan-limits.service';
import { parseRateLimitHeaders } from '../../shared/llm-usage/llm-usage.service';
import { getAdapter, modelCandidates, PROVIDER_CATALOG, type ProviderInfo } from './llm/provider-catalog';
import { LlmProviderError, type LlmAdapter } from './llm/llm.types';
import { embeddingModelId, generateEmbeddings, type EmbeddingPurpose } from './llm/embeddings';
import type { CreateAiConnectionDto, UpdateAiConnectionDto } from './dto/ai-connection.dto';

/** Conexão como sai da API: a chave nunca é exposta, só a máscara. */
export interface AiConnectionView {
  id: string;
  provider: AiProvider;
  providerName: string;
  label: string | null;
  maskedKey: string;
  defaultModel: string;
  isDefault: boolean;
  status: AiConnectionStatus;
  lastValidatedAt: Date | null;
  lastError: string | null;
  lastErrorAt: Date | null;
  createdAt: Date;
}

export interface ResolvedLlm {
  connectionId: string;
  provider: AiProvider;
  model: string;
  apiKey: string;
  adapter: LlmAdapter;
}

export interface TestResult {
  ok: boolean;
  status: AiConnectionStatus;
  model: string;
  message: string;
}

const TEST_SYSTEM = 'Você está sendo testado pela plataforma Walletz. Responda apenas: OK';
const TEST_MAX_TOKENS = 256;
const MAX_MODEL_ATTEMPTS = 3;

/** Resposta original do provedor (já sem chaves), para o cliente conferir o motivo exato. */
function providerDetail(err: LlmProviderError): string {
  const text = err.providerMessage.replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return ` Resposta do provedor: "${text.length > 240 ? `${text.slice(0, 239)}…` : text}"`;
}

export function maskKey(last4: string): string {
  return `••••••••${last4}`;
}

/**
 * Chaves de IA do próprio cliente (BYOK — Proposta Comercial v4.2).
 * A Walletz não fornece tokens: toda chamada de IA usa a conexão do tenant.
 */
@Injectable()
export class AiProvidersService {
  private readonly logger = new Logger(AiProvidersService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: DrizzleDB,
    private readonly encryption: EncryptionService,
    private readonly audit: AuditService,
    private readonly planLimits: PlanLimitsService,
  ) {}

  providers(): ProviderInfo[] {
    return Object.values(PROVIDER_CATALOG);
  }

  toView(row: AiProviderConnection): AiConnectionView {
    return {
      id: row.id,
      provider: row.provider,
      providerName: PROVIDER_CATALOG[row.provider].name,
      label: row.label,
      maskedKey: maskKey(row.keyLast4),
      defaultModel: row.defaultModel,
      isDefault: row.isDefault,
      status: row.status,
      lastValidatedAt: row.lastValidatedAt,
      lastError: row.lastError,
      lastErrorAt: row.lastErrorAt,
      createdAt: row.createdAt,
    };
  }

  async list(tenantId: string): Promise<AiConnectionView[]> {
    const rows = await this.db
      .select()
      .from(aiProviderConnections)
      .where(and(eq(aiProviderConnections.tenantId, tenantId), isNull(aiProviderConnections.deletedAt)))
      .orderBy(asc(aiProviderConnections.createdAt));
    return rows.map((r) => this.toView(r));
  }

  private async getRow(tenantId: string, id: string): Promise<AiProviderConnection> {
    const [row] = await this.db
      .select()
      .from(aiProviderConnections)
      .where(
        and(
          eq(aiProviderConnections.id, id),
          eq(aiProviderConnections.tenantId, tenantId),
          isNull(aiProviderConnections.deletedAt),
        ),
      )
      .limit(1);
    if (!row) throw new NotFoundException('Conexão de IA não encontrada');
    return row;
  }

  /** Lista modelos e faz uma chamada mínima de teste com a chave. Lança HttpException clara. */
  private async verifyKey(
    provider: AiProvider,
    apiKey: string,
    requestedModel?: string,
  ): Promise<{ model: string; models: string[] }> {
    const adapter = getAdapter(provider);
    try {
      const models = await adapter.listModels(apiKey);
      if (requestedModel && models.length > 0 && !models.includes(requestedModel)) {
        throw new HttpException(
          {
            statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
            error: 'AI_PROVIDER_MODEL',
            message: `O modelo "${requestedModel}" não está disponível nesta conta ${PROVIDER_CATALOG[provider].name}.`,
          },
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }
      // Modelo escolhido pelo cliente: só ele. Sem escolha: tenta os candidatos enquanto o
      // provedor disser que o modelo não existe mais (ex.: Gemini 2.x retirado para contas novas).
      const candidates = requestedModel ? [requestedModel] : modelCandidates(provider, models).slice(0, MAX_MODEL_ATTEMPTS);
      if (candidates.length === 0) {
        throw new HttpException(
          {
            statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
            error: 'AI_PROVIDER_MODEL',
            message: 'Nenhum modelo de chat disponível nesta conta. Informe o modelo manualmente.',
          },
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }
      let lastModelError: LlmProviderError | null = null;
      for (const model of candidates) {
        try {
          await adapter
            .createSession({
              apiKey,
              model,
              system: TEST_SYSTEM,
              history: [{ role: 'user', content: 'Teste de conexão' }],
              tools: [],
              // Folga para modelos que "pensam" antes de responder (com 32 alguns não respondem).
              maxTokens: TEST_MAX_TOKENS,
            })
            .send();
          return { model, models };
        } catch (err) {
          if (!(err instanceof LlmProviderError) || err.kind !== 'model' || requestedModel) throw err;
          this.logger.warn(`Modelo indisponível no teste (${provider}/${model}), tentando o próximo: ${err.providerMessage}`);
          lastModelError = err;
        }
      }
      throw lastModelError!;
    } catch (err) {
      if (err instanceof LlmProviderError) {
        // Sem a chave (providerMessage já passa por redactSecrets): ajuda a diagnosticar recusas.
        this.logger.warn(`Validação de chave recusada: ${err.provider} ${err.kind} (${err.status ?? '-'}): ${err.providerMessage}`);
        throw this.toHttpError(err, requestedModel);
      }
      throw err;
    }
  }

  async create(tenantId: string, dto: CreateAiConnectionDto, userId: string): Promise<AiConnectionView> {
    await this.planLimits.assertCanAdd(tenantId, 'aiConnections');
    const apiKey = dto.apiKey.trim();
    const { model } = await this.verifyKey(dto.provider, apiKey, dto.model?.trim() || undefined);

    const existing = await this.list(tenantId);
    const makeDefault = dto.makeDefault === true || existing.length === 0;

    // Reserva a vaga com trava: duas conexões simultâneas não passam do limite do plano.
    const row = await this.planLimits.withSlot(tenantId, 'aiConnections', async (tx) => {
      if (makeDefault) {
        await tx
          .update(aiProviderConnections)
          .set({ isDefault: false, updatedAt: new Date() })
          .where(and(eq(aiProviderConnections.tenantId, tenantId), isNull(aiProviderConnections.deletedAt)));
      }
      const [inserted] = await tx
        .insert(aiProviderConnections)
        .values({
          tenantId,
          provider: dto.provider,
          label: dto.label?.trim() || null,
          encryptedApiKey: this.encryption.encrypt(apiKey),
          keyLast4: apiKey.slice(-4),
          defaultModel: model,
          isDefault: makeDefault,
          status: 'active',
          lastValidatedAt: new Date(),
          createdByUserId: userId,
        })
        .returning();
      return inserted!;
    });

    await this.audit.log({
      tenantId,
      userId,
      action: 'ai_connection.created',
      resourceType: 'ai_provider_connection',
      resourceId: row.id,
      newState: { provider: row.provider, model: row.defaultModel, isDefault: row.isDefault, key: maskKey(row.keyLast4) },
    });
    return this.toView(row);
  }

  async update(tenantId: string, id: string, dto: UpdateAiConnectionDto, userId: string): Promise<AiConnectionView> {
    const row = await this.getRow(tenantId, id);
    const rotating = typeof dto.apiKey === 'string' && dto.apiKey.trim().length > 0;
    const apiKey = rotating ? dto.apiKey!.trim() : this.decryptKey(row);
    const modelChanged = dto.model !== undefined && dto.model.trim() !== row.defaultModel;

    const patch: Partial<AiProviderConnection> = { updatedAt: new Date() };
    if (rotating || modelChanged) {
      const { model } = await this.verifyKey(row.provider, apiKey, dto.model?.trim() || row.defaultModel);
      patch.defaultModel = model;
      patch.status = 'active';
      patch.lastValidatedAt = new Date();
      patch.lastError = null;
      patch.lastErrorAt = null;
    }
    if (rotating) {
      patch.encryptedApiKey = this.encryption.encrypt(apiKey);
      patch.keyLast4 = apiKey.slice(-4);
    }
    if (dto.label !== undefined) patch.label = dto.label.trim() || null;

    const [updated] = await this.db
      .update(aiProviderConnections)
      .set(patch)
      .where(and(eq(aiProviderConnections.id, id), eq(aiProviderConnections.tenantId, tenantId)))
      .returning();

    await this.audit.log({
      tenantId,
      userId,
      action: rotating ? 'ai_connection.key_rotated' : 'ai_connection.updated',
      resourceType: 'ai_provider_connection',
      resourceId: id,
      previousState: { model: row.defaultModel, label: row.label, key: maskKey(row.keyLast4) },
      newState: { model: updated!.defaultModel, label: updated!.label, key: maskKey(updated!.keyLast4) },
    });
    return this.toView(updated!);
  }

  /** Testa a chave salva; reativa a conexão se o problema (ex.: faturamento) foi resolvido. */
  async test(tenantId: string, id: string, userId: string): Promise<TestResult> {
    const row = await this.getRow(tenantId, id);
    const apiKey = this.decryptKey(row);
    try {
      await this.verifyKey(row.provider, apiKey, row.defaultModel);
      await this.setStatus(row, 'active', null);
      await this.audit.log({
        tenantId,
        userId,
        action: 'ai_connection.tested',
        resourceType: 'ai_provider_connection',
        resourceId: id,
        metadata: { ok: true },
      });
      return { ok: true, status: 'active', model: row.defaultModel, message: 'Conexão validada com sucesso.' };
    } catch (err) {
      if (!(err instanceof HttpException)) throw err;
      const body = err.getResponse() as { error?: string; message?: string };
      const status: AiConnectionStatus =
        body.error === 'AI_PROVIDER_INVALID_KEY'
          ? 'invalid'
          : body.error === 'AI_PROVIDER_BILLING'
            ? 'billing_error'
            : row.status;
      await this.setStatus(row, status, body.message ?? null);
      await this.audit.log({
        tenantId,
        userId,
        action: 'ai_connection.tested',
        resourceType: 'ai_provider_connection',
        resourceId: id,
        metadata: { ok: false, error: body.error },
      });
      return { ok: false, status, model: row.defaultModel, message: body.message ?? 'Falha ao validar a conexão.' };
    }
  }

  async listModels(tenantId: string, id: string): Promise<string[]> {
    const row = await this.getRow(tenantId, id);
    try {
      return await getAdapter(row.provider).listModels(this.decryptKey(row));
    } catch (err) {
      if (err instanceof LlmProviderError) throw this.toHttpError(err);
      throw err;
    }
  }

  async setDefault(tenantId: string, id: string, userId: string): Promise<AiConnectionView> {
    await this.getRow(tenantId, id);
    const updated = await this.db.transaction(async (tx) => {
      await tx
        .update(aiProviderConnections)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(and(eq(aiProviderConnections.tenantId, tenantId), isNull(aiProviderConnections.deletedAt)));
      const [row] = await tx
        .update(aiProviderConnections)
        .set({ isDefault: true, updatedAt: new Date() })
        .where(and(eq(aiProviderConnections.id, id), eq(aiProviderConnections.tenantId, tenantId)))
        .returning();
      return row!;
    });
    await this.audit.log({
      tenantId,
      userId,
      action: 'ai_connection.default_set',
      resourceType: 'ai_provider_connection',
      resourceId: id,
    });
    return this.toView(updated);
  }

  /** Revoga: apaga a chave cifrada (não fica guardada) e desvincula os agentes. */
  async remove(tenantId: string, id: string, userId: string): Promise<void> {
    const row = await this.getRow(tenantId, id);
    await this.db.transaction(async (tx) => {
      await tx
        .update(aiProviderConnections)
        .set({
          status: 'revoked',
          isDefault: false,
          encryptedApiKey: '',
          deletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(aiProviderConnections.id, id), eq(aiProviderConnections.tenantId, tenantId)));
      await tx
        .update(agents)
        .set({ aiConnectionId: null, updatedAt: new Date() })
        .where(and(eq(agents.tenantId, tenantId), eq(agents.aiConnectionId, id)));
      if (row.isDefault) {
        const [next] = await tx
          .select({ id: aiProviderConnections.id })
          .from(aiProviderConnections)
          .where(
            and(
              eq(aiProviderConnections.tenantId, tenantId),
              isNull(aiProviderConnections.deletedAt),
              ne(aiProviderConnections.id, id),
            ),
          )
          .orderBy(asc(aiProviderConnections.createdAt))
          .limit(1);
        if (next) {
          await tx
            .update(aiProviderConnections)
            .set({ isDefault: true, updatedAt: new Date() })
            .where(eq(aiProviderConnections.id, next.id));
        }
      }
    });
    await this.audit.log({
      tenantId,
      userId,
      action: 'ai_connection.revoked',
      resourceType: 'ai_provider_connection',
      resourceId: id,
      previousState: { provider: row.provider, key: maskKey(row.keyLast4) },
    });
  }

  async setAgentConnection(
    tenantId: string,
    agentId: string,
    connectionId: string | null,
    userId: string,
  ): Promise<{ agentId: string; aiConnectionId: string | null }> {
    const [agent] = await this.db
      .select({ id: agents.id, aiConnectionId: agents.aiConnectionId })
      .from(agents)
      .where(and(eq(agents.id, agentId), eq(agents.tenantId, tenantId), isNull(agents.deletedAt)))
      .limit(1);
    if (!agent) throw new NotFoundException('Agente não encontrado');
    if (connectionId) await this.getRow(tenantId, connectionId);

    await this.db
      .update(agents)
      .set({ aiConnectionId: connectionId, updatedAt: new Date() })
      .where(and(eq(agents.id, agentId), eq(agents.tenantId, tenantId)));
    await this.audit.log({
      tenantId,
      userId,
      action: 'agent.ai_connection_set',
      resourceType: 'agent',
      resourceId: agentId,
      previousState: { aiConnectionId: agent.aiConnectionId },
      newState: { aiConnectionId: connectionId },
    });
    return { agentId, aiConnectionId: connectionId };
  }

  /**
   * Conexão que o agente deve usar: a do agente, senão a padrão, senão a única.
   * Bloqueia (sem chamar o provedor) quando a chave está inválida ou sem faturamento.
   */
  async resolveForAgent(tenantId: string, agentConnectionId: string | null): Promise<ResolvedLlm> {
    const allRows = await this.db
      .select()
      .from(aiProviderConnections)
      .where(and(eq(aiProviderConnections.tenantId, tenantId), isNull(aiProviderConnections.deletedAt)))
      .orderBy(asc(aiProviderConnections.createdAt));
    // Só as conexões dentro do limite do plano podem ser usadas (as mais novas acima dele ficam paradas).
    const allowed = await this.planLimits.allowedIds(tenantId, 'aiConnections');
    if (agentConnectionId && allRows.some((r) => r.id === agentConnectionId) && !allowed.has(agentConnectionId)) {
      await this.planLimits.assertWithinPlan(tenantId, 'aiConnections', agentConnectionId);
    }
    const rows = allRows.filter((r) => allowed.has(r.id));

    const row =
      (agentConnectionId ? rows.find((r) => r.id === agentConnectionId) : undefined) ??
      rows.find((r) => r.isDefault) ??
      rows[0];

    if (!row) {
      throw new HttpException(
        {
          statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          error: 'AI_PROVIDER_NOT_CONFIGURED',
          message:
            'Nenhum provedor de IA conectado. Em Config. IA, conecte a chave de API da sua conta (Claude, OpenAI, Gemini ou OpenRouter). O consumo é pago diretamente ao provedor.',
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    const name = PROVIDER_CATALOG[row.provider].name;
    if (row.status === 'billing_error') {
      throw new HttpException(
        {
          statusCode: HttpStatus.PAYMENT_REQUIRED,
          error: 'AI_PROVIDER_BILLING',
          message: `Provedor de IA indisponível por faturamento (${name}). Regularize créditos ou faturamento diretamente na sua conta do provedor e clique em "Testar novamente" em Config. IA.`,
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
    if (row.status === 'invalid') {
      throw new HttpException(
        {
          statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          error: 'AI_PROVIDER_INVALID_KEY',
          message: `A chave de API do ${name} foi recusada (inválida ou revogada). Gere uma nova chave no provedor e atualize em Config. IA.`,
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    const apiKey = this.decryptKey(row);
    return { connectionId: row.id, provider: row.provider, model: row.defaultModel, apiKey, adapter: getAdapter(row.provider) };
  }

  /**
   * Conexão do cliente capaz de gerar embeddings (OpenAI ou Gemini), preferindo a padrão.
   * null = nenhuma — os documentos ficam com indexação "aguardando configuração de IA"
   * (a busca textual continua funcionando).
   */
  async resolveEmbedder(tenantId: string): Promise<{
    connectionId: string;
    provider: AiProvider;
    modelId: string;
    embed: (texts: string[], purpose: EmbeddingPurpose) => Promise<number[][]>;
  } | null> {
    const rows = await this.db
      .select()
      .from(aiProviderConnections)
      .where(
        and(
          eq(aiProviderConnections.tenantId, tenantId),
          isNull(aiProviderConnections.deletedAt),
          eq(aiProviderConnections.status, 'active'),
        ),
      )
      .orderBy(asc(aiProviderConnections.createdAt));
    const allowed = await this.planLimits.allowedIds(tenantId, 'aiConnections');
    const capable = rows.filter((r) => allowed.has(r.id) && embeddingModelId(r.provider));
    const row = capable.find((r) => r.isDefault) ?? capable.find((r) => r.provider === 'openai') ?? capable[0];
    if (!row) return null;
    const apiKey = this.decryptKey(row);
    const modelId = embeddingModelId(row.provider)!;
    return {
      connectionId: row.id,
      provider: row.provider,
      modelId,
      embed: async (texts, purpose) => {
        try {
          return await generateEmbeddings(row.provider, apiKey, texts, purpose);
        } catch (err) {
          if (err instanceof LlmProviderError) throw await this.handleProviderFailure(tenantId, row.id, err);
          throw err;
        }
      },
    };
  }

  /**
   * Registra a falha de uma chamada real: chave recusada → "invalid";
   * sem crédito/quota → "billing_error" (bloqueia novas chamadas até novo teste).
   */
  async handleProviderFailure(tenantId: string, connectionId: string, err: LlmProviderError, model?: string): Promise<HttpException> {
    const status: AiConnectionStatus | null =
      err.kind === 'auth' ? 'invalid' : err.kind === 'billing' ? 'billing_error' : null;
    const httpError = this.toHttpError(err, model);
    if (status) {
      const [row] = await this.db
        .select()
        .from(aiProviderConnections)
        .where(and(eq(aiProviderConnections.id, connectionId), eq(aiProviderConnections.tenantId, tenantId)))
        .limit(1);
      if (row) {
        const message = (httpError.getResponse() as { message?: string }).message ?? err.providerMessage;
        await this.setStatus(row, status, message);
        await this.audit.log({
          tenantId,
          action: 'ai_connection.failed',
          resourceType: 'ai_provider_connection',
          resourceId: connectionId,
          metadata: { kind: err.kind, status: err.status ?? null },
        });
      }
    }
    return httpError;
  }

  /** Guarda os limites de taxa informados pela Anthropic (headers), por conexão. */
  recordResponseHeaders(connectionId: string, headers: Headers): void {
    const snapshot = parseRateLimitHeaders(headers);
    if (!snapshot) return;
    void this.db
      .update(aiProviderConnections)
      .set({ rateLimits: snapshot })
      .where(eq(aiProviderConnections.id, connectionId))
      .catch((e: unknown) => this.logger.warn(`Falha ao salvar limites de taxa: ${String(e)}`));
  }

  private async setStatus(row: AiProviderConnection, status: AiConnectionStatus, error: string | null): Promise<void> {
    const now = new Date();
    await this.db
      .update(aiProviderConnections)
      .set({
        status,
        updatedAt: now,
        ...(status === 'active'
          ? { lastValidatedAt: now, lastError: null, lastErrorAt: null }
          : { lastError: error, lastErrorAt: now }),
      })
      .where(and(eq(aiProviderConnections.id, row.id), eq(aiProviderConnections.tenantId, row.tenantId)));
  }

  private decryptKey(row: AiProviderConnection): string {
    const key = row.encryptedApiKey ? this.encryption.tryDecrypt(row.encryptedApiKey) : null;
    if (!key) {
      throw new BadRequestException(
        'Não foi possível ler a chave salva desta conexão. Atualize a chave em Config. IA.',
      );
    }
    return key;
  }

  toHttpError(err: LlmProviderError, model?: string): HttpException {
    const name = PROVIDER_CATALOG[err.provider].name;
    const make = (status: HttpStatus, error: string, message: string) =>
      new HttpException({ statusCode: status, error, message }, status);
    switch (err.kind) {
      case 'auth':
        return make(
          HttpStatus.UNPROCESSABLE_ENTITY,
          'AI_PROVIDER_INVALID_KEY',
          `A chave de API do ${name} foi recusada (inválida, revogada ou sem permissão). Gere uma nova chave no provedor e atualize em Config. IA.`,
        );
      case 'billing':
        return make(
          HttpStatus.PAYMENT_REQUIRED,
          'AI_PROVIDER_BILLING',
          err.provider === 'gemini'
            ? `Provedor de IA indisponível por faturamento (${name}): este modelo não tem cota gratuita na sua conta. Ative o faturamento do projeto no Google AI Studio ou escolha um modelo Flash-Lite (ex.: gemini-3.1-flash-lite). A Walletz não vende créditos de IA.${providerDetail(err)}`
            : `Provedor de IA indisponível por faturamento (${name}): a conta recusou a cobrança (sem créditos ou quota). Regularize diretamente no provedor; a Walletz não vende créditos de IA.${providerDetail(err)}`,
        );
      case 'rate_limit':
        return make(
          HttpStatus.TOO_MANY_REQUESTS,
          'AI_PROVIDER_RATE_LIMIT',
          err.provider === 'gemini'
            ? `O ${name} atingiu o limite da cota da sua conta (no nível gratuito, poucas chamadas por minuto e por dia). Aguarde e tente de novo, ou ative o faturamento no Google AI Studio para limites maiores.${providerDetail(err)}`
            : `O ${name} limitou a taxa de chamadas da sua conta. Aguarde alguns instantes ou amplie os limites no provedor.${providerDetail(err)}`,
        );
      case 'model':
        return make(
          HttpStatus.UNPROCESSABLE_ENTITY,
          'AI_PROVIDER_MODEL',
          `O modelo${model ? ` "${model}"` : ''} não está disponível na sua conta ${name}. Escolha outro modelo em Config. IA.${providerDetail(err)}`,
        );
      case 'unavailable':
        return make(
          HttpStatus.SERVICE_UNAVAILABLE,
          'AI_PROVIDER_UNAVAILABLE',
          `O ${name} não respondeu. Tente novamente em instantes.`,
        );
      default:
        return make(HttpStatus.BAD_GATEWAY, 'AI_PROVIDER_ERROR', `O ${name} recusou a solicitação: ${err.providerMessage}`);
    }
  }
}
