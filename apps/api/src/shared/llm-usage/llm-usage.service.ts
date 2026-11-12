import { HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { and, eq, gte, inArray, isNull, sql } from 'drizzle-orm';
import type Redis from 'ioredis';
import { DRIZZLE_TOKEN, type DrizzleDB } from '../../database/database.module';
import { usageEvents } from '../../database/schema/billing';
import { tenants } from '../../database/schema/tenants';
import { REDIS_TOKEN } from '../redis/redis.module';

export const LLM_INPUT_METRIC = 'llm.input_tokens';
export const LLM_OUTPUT_METRIC = 'llm.output_tokens';
export const LLM_METRICS = [LLM_INPUT_METRIC, LLM_OUTPUT_METRIC] as const;

const RATE_LIMIT_KEY = 'llm:anthropic:ratelimit';
const RATE_LIMIT_PREFIX = 'anthropic-ratelimit-';

export interface LlmUsageRecord {
  tenantId: string;
  agentId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  source: 'lab' | 'conversation';
  traceId: string;
}

/** Um limite da conta Anthropic, lido dos headers `anthropic-ratelimit-*`. */
export interface RateLimitEntry {
  limit: number | null;
  remaining: number | null;
  reset: string | null;
}

export interface RateLimitSnapshot {
  capturedAt: string;
  /** Chaves: requests, tokens, input-tokens, output-tokens (as que a API enviar). */
  limits: Record<string, RateLimitEntry>;
}

/** Estrutura mínima dos headers de resposta do SDK (fetch Headers). */
export interface HeaderBag {
  forEach(callback: (value: string, key: string) => void): void;
}

export function startOfCurrentMonthUtc(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/** Extrai os limites de taxa da Anthropic dos headers de uma resposta. */
export function parseRateLimitHeaders(headers: HeaderBag, now: Date = new Date()): RateLimitSnapshot | null {
  const limits: Record<string, RateLimitEntry> = {};
  headers.forEach((value, rawKey) => {
    const key = rawKey.toLowerCase();
    if (!key.startsWith(RATE_LIMIT_PREFIX)) return;
    // ex.: anthropic-ratelimit-input-tokens-remaining → kind=input-tokens, field=remaining
    const rest = key.slice(RATE_LIMIT_PREFIX.length);
    const match = /^(.*)-(limit|remaining|reset)$/.exec(rest);
    if (!match) return;
    const kind = match[1]!;
    const field = match[2] as 'limit' | 'remaining' | 'reset';
    const entry = (limits[kind] ??= { limit: null, remaining: null, reset: null });
    if (field === 'reset') {
      entry.reset = value;
    } else {
      const n = Number(value);
      entry[field] = Number.isFinite(n) ? n : null;
    }
  });
  if (Object.keys(limits).length === 0) return null;
  return { capturedAt: now.toISOString(), limits };
}

/**
 * Consumo de LLM por tenant (usage_events) + limites da conta Anthropic.
 * Falhas ao registrar consumo nunca derrubam a conversa do agente.
 */
@Injectable()
export class LlmUsageService {
  private readonly logger = new Logger(LlmUsageService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: DrizzleDB,
    @Inject(REDIS_TOKEN) private readonly redis: Redis,
  ) {}

  async recordUsage(record: LlmUsageRecord): Promise<void> {
    const metadata = { model: record.model, source: record.source, traceId: record.traceId };
    try {
      await this.db.insert(usageEvents).values([
        {
          tenantId: record.tenantId,
          metric: LLM_INPUT_METRIC,
          quantity: record.inputTokens,
          resourceType: 'agent',
          resourceId: record.agentId,
          metadata,
        },
        {
          tenantId: record.tenantId,
          metric: LLM_OUTPUT_METRIC,
          quantity: record.outputTokens,
          resourceType: 'agent',
          resourceId: record.agentId,
          metadata,
        },
      ]);
    } catch (err) {
      this.logger.error(`Falha ao registrar consumo de LLM (trace ${record.traceId}): ${String(err)}`);
    }
  }

  async recordRateLimits(headers: HeaderBag): Promise<void> {
    const snapshot = parseRateLimitHeaders(headers);
    if (!snapshot) return;
    try {
      await this.redis.set(RATE_LIMIT_KEY, JSON.stringify(snapshot));
    } catch (err) {
      this.logger.warn(`Falha ao salvar limites da Anthropic: ${String(err)}`);
    }
  }

  async getRateLimits(): Promise<RateLimitSnapshot | null> {
    try {
      const raw = await this.redis.get(RATE_LIMIT_KEY);
      return raw ? (JSON.parse(raw) as RateLimitSnapshot) : null;
    } catch {
      return null;
    }
  }

  /** Tokens (entrada + saída) consumidos pelo tenant no mês corrente (UTC). */
  async getMonthTokens(tenantId: string): Promise<number> {
    const [row] = await this.db
      .select({ total: sql<string | null>`coalesce(sum(${usageEvents.quantity}), 0)` })
      .from(usageEvents)
      .where(
        and(
          eq(usageEvents.tenantId, tenantId),
          inArray(usageEvents.metric, [...LLM_METRICS]),
          gte(usageEvents.recordedAt, startOfCurrentMonthUtc()),
        ),
      );
    return Number(row?.total ?? 0);
  }

  /** Bloqueia novas chamadas ao LLM quando o tenant atingiu o limite mensal. */
  async assertWithinMonthlyLimit(tenantId: string): Promise<void> {
    const [tenant] = await this.db
      .select({ limit: tenants.llmMonthlyTokenLimit })
      .from(tenants)
      .where(and(eq(tenants.id, tenantId), isNull(tenants.deletedAt)))
      .limit(1);
    const limit = tenant?.limit;
    if (limit === null || limit === undefined) return;

    const used = await this.getMonthTokens(tenantId);
    if (used >= limit) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'LLM_MONTHLY_LIMIT_REACHED',
          message: `Limite mensal de IA atingido (${used.toLocaleString('pt-BR')} de ${limit.toLocaleString('pt-BR')} tokens). Fale com o suporte Walletz para ampliar.`,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
