import type { AiProvider } from '../../../database/schema/ai-providers';
import {
  LlmProviderError,
  classifyProviderError,
  redactSecrets,
  type LlmAdapter,
  type LlmSession,
  type LlmSessionInit,
  type LlmTurn,
} from './llm.types';

const TIMEOUT_MS = 60_000;

export interface OpenAiCompatibleConfig {
  provider: Exclude<AiProvider, 'anthropic'>;
  baseUrl: string;
  /** OpenAI exige `max_completion_tokens` nos modelos atuais; os demais aceitam `max_tokens`. */
  maxTokensField: 'max_tokens' | 'max_completion_tokens';
  extraHeaders?: Record<string, string>;
  /** Filtra a lista de modelos para os de chat. */
  modelFilter?: (id: string) => boolean;
}

type ChatMessage =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: OpenAiToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string };

interface OpenAiToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

interface ChatCompletionResponse {
  choices?: Array<{
    finish_reason?: string;
    message?: { content?: string | null; tool_calls?: OpenAiToolCall[] };
  }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

/** Nomes de ferramenta aceitos pela API: ^[a-zA-Z0-9_-]{1,64}$ (ex.: "pc.readFile" → "pc__readFile"). */
export function toWireToolName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '__').slice(0, 64);
}

/** Extrai a mensagem de erro dos formatos OpenAI, Gemini (lista) e OpenRouter. */
export function extractErrorMessage(body: unknown, fallback: string): string {
  const candidate = Array.isArray(body) ? body[0] : body;
  if (candidate && typeof candidate === 'object') {
    const err = (candidate as { error?: unknown }).error;
    if (err && typeof err === 'object') {
      const e = err as { message?: unknown; code?: unknown; status?: unknown };
      const parts = [e.message, e.code, e.status].filter((p) => typeof p === 'string' && p.length > 0);
      if (parts.length > 0) return parts.join(' — ');
    }
    if (typeof err === 'string') return err;
  }
  return fallback;
}

async function request<T>(
  config: OpenAiCompatibleConfig,
  apiKey: string,
  path: string,
  init: { method: 'GET' | 'POST'; body?: unknown },
): Promise<{ data: T; headers: Headers }> {
  let res: Response;
  try {
    res = await fetch(`${config.baseUrl}${path}`, {
      method: init.method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...config.extraHeaders,
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    const message = redactSecrets(err instanceof Error ? err.message : String(err));
    throw new LlmProviderError('unavailable', config.provider, message);
  }
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message = redactSecrets(extractErrorMessage(body, res.statusText || `HTTP ${res.status}`));
    throw new LlmProviderError(classifyProviderError(res.status, message), config.provider, message, res.status);
  }
  // OpenRouter pode responder 200 com { error } quando o provedor final falha.
  if (body && typeof body === 'object' && 'error' in body && !('choices' in body) && !('data' in body)) {
    const message = redactSecrets(extractErrorMessage(body, 'erro do provedor'));
    const code = (body as { error?: { code?: unknown } }).error?.code;
    const status = typeof code === 'number' ? code : undefined;
    throw new LlmProviderError(classifyProviderError(status, message), config.provider, message, status);
  }
  return { data: body as T, headers: res.headers };
}

class OpenAiCompatibleSession implements LlmSession {
  private readonly messages: ChatMessage[];
  private readonly wireToOriginal = new Map<string, string>();

  constructor(
    private readonly config: OpenAiCompatibleConfig,
    private readonly init: LlmSessionInit,
  ) {
    this.messages = [
      { role: 'system', content: init.system },
      ...init.history.map((m) => ({ role: m.role, content: m.content }) as ChatMessage),
    ];
    for (const tool of init.tools) this.wireToOriginal.set(toWireToolName(tool.name), tool.name);
  }

  async send(): Promise<LlmTurn> {
    const tools = this.init.tools.map((t) => ({
      type: 'function' as const,
      function: {
        name: toWireToolName(t.name),
        description: t.description,
        parameters: { type: 'object', ...t.inputSchema },
      },
    }));
    const { data, headers } = await request<ChatCompletionResponse>(this.config, this.init.apiKey, '/chat/completions', {
      method: 'POST',
      body: {
        model: this.init.model,
        messages: this.messages,
        [this.config.maxTokensField]: this.init.maxTokens,
        ...(tools.length > 0 ? { tools } : {}),
      },
    });
    this.init.onResponseHeaders?.(headers);

    const choice = data.choices?.[0];
    const message = choice?.message ?? {};
    const rawCalls = message.tool_calls ?? [];
    const calls = rawCalls.map((c, i) => ({ ...c, id: c.id || `call_${Date.now()}_${i}` }));

    if (calls.length > 0) {
      this.messages.push({ role: 'assistant', content: message.content ?? null, tool_calls: calls });
    }

    return {
      text: message.content ?? '',
      toolCalls: calls.map((c) => ({
        id: c.id,
        name: this.wireToOriginal.get(c.function.name) ?? c.function.name,
        input: safeParse(c.function.arguments),
      })),
      inputTokens: data.usage?.prompt_tokens ?? 0,
      outputTokens: data.usage?.completion_tokens ?? 0,
    };
  }

  addToolResults(results: Array<{ id: string; output: string }>): void {
    for (const r of results) this.messages.push({ role: 'tool', tool_call_id: r.id, content: r.output });
  }
}

function safeParse(raw: string | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export class OpenAiCompatibleAdapter implements LlmAdapter {
  readonly provider: Exclude<AiProvider, 'anthropic'>;

  constructor(private readonly config: OpenAiCompatibleConfig) {
    this.provider = config.provider;
  }

  createSession(init: LlmSessionInit): LlmSession {
    return new OpenAiCompatibleSession(this.config, init);
  }

  async listModels(apiKey: string): Promise<string[]> {
    const { data } = await request<{ data?: Array<{ id: string }> }>(this.config, apiKey, '/models', { method: 'GET' });
    const ids = (data.data ?? []).map((m) => m.id.replace(/^models\//, ''));
    return this.config.modelFilter ? ids.filter(this.config.modelFilter) : ids;
  }
}
