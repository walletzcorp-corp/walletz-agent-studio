import type { AiProvider } from '../../../database/schema/ai-providers';

/** Ferramenta oferecida ao modelo, em formato neutro (JSON Schema). */
export interface LlmTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface LlmToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface LlmTurn {
  text: string;
  toolCalls: LlmToolCall[];
  inputTokens: number;
  outputTokens: number;
}

export interface LlmHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LlmSessionInit {
  apiKey: string;
  model: string;
  system: string;
  /** Histórico completo, terminando na mensagem atual do usuário. */
  history: LlmHistoryMessage[];
  tools: LlmTool[];
  maxTokens: number;
  /** Recebe os headers de resposta (ex.: limites de taxa da Anthropic). */
  onResponseHeaders?: (headers: Headers) => void;
}

/**
 * Conversa com estado próprio do provedor: `send()` devolve um turno; se houver
 * chamadas de ferramenta, o chamador executa e devolve com `addToolResults()`.
 */
export interface LlmSession {
  send(): Promise<LlmTurn>;
  addToolResults(results: Array<{ id: string; output: string }>): void;
}

export interface LlmAdapter {
  readonly provider: AiProvider;
  createSession(init: LlmSessionInit): LlmSession;
  /** Modelos de chat disponíveis para a chave (também valida autenticação, exceto OpenRouter). */
  listModels(apiKey: string): Promise<string[]>;
}

export type LlmErrorKind = 'auth' | 'billing' | 'rate_limit' | 'model' | 'unavailable' | 'bad_request';

/** Erro do provedor já classificado. A mensagem nunca contém a chave. */
export class LlmProviderError extends Error {
  constructor(
    readonly kind: LlmErrorKind,
    readonly provider: AiProvider,
    readonly providerMessage: string,
    readonly status?: number,
  ) {
    super(`[${provider}] ${kind}${status ? ` (${status})` : ''}: ${providerMessage}`);
    this.name = 'LlmProviderError';
  }
}

const BILLING_PATTERN =
  /credit balance|insufficient[_ ]quota|insufficient credits|billing|payment required|exceeded your current quota|requires more credits|purchase credits|spend limit|budget/i;
const MODEL_PATTERN = /model/i;
const NOT_FOUND_PATTERN = /not[_ ]found|does not exist|invalid model|not a valid model|unknown model|no endpoints found|not supported/i;

/** Resposta de cota do Google (Gemini): 429 RESOURCE_EXHAUSTED. */
const GOOGLE_QUOTA_PATTERN = /RESOURCE_EXHAUSTED|generativelanguage\.googleapis\.com|ai\.google\.dev/i;
/** Cota zerada para o modelo (ex.: modelo sem nível gratuito): só libera com faturamento ativo. */
const ZERO_QUOTA_PATTERN = /limit:\s*0(?![\d.])|quotaValue["':\s]+0(?![\d.])/i;

/**
 * Classifica uma falha HTTP do provedor (status + mensagem).
 * Passe a mensagem completa (antes de `redactSecrets`, que corta o texto).
 */
export function classifyProviderError(status: number | undefined, message: string): LlmErrorKind {
  if (status === 401 || status === 403) return 'auth';
  if (status === 402) return 'billing';
  // O Google usa a mesma frase do OpenAI ("exceeded your current quota… billing details") para o
  // limite da cota gratuita por minuto/dia. Só é faturamento quando a cota do modelo é zero.
  if (status === 429 && GOOGLE_QUOTA_PATTERN.test(message)) {
    return ZERO_QUOTA_PATTERN.test(message) ? 'billing' : 'rate_limit';
  }
  if (BILLING_PATTERN.test(message)) return 'billing';
  if (status === 429) return 'rate_limit';
  if (status === 404) return MODEL_PATTERN.test(message) || NOT_FOUND_PATTERN.test(message) ? 'model' : 'bad_request';
  if (status === 400 && MODEL_PATTERN.test(message) && NOT_FOUND_PATTERN.test(message)) return 'model';
  if (/api[_ ]?key|authentication|unauthorized|permission/i.test(message) && (status === 400 || status === undefined)) {
    return 'auth';
  }
  if (status === undefined || status >= 500) return 'unavailable';
  return 'bad_request';
}

/** Remove qualquer trecho que pareça uma chave antes de guardar/logar mensagens do provedor. */
export function redactSecrets(text: string): string {
  return text
    .replace(/(sk-[A-Za-z0-9_-]{6})[A-Za-z0-9_-]+/g, '$1…')
    .replace(/(AIza[A-Za-z0-9_-]{4})[A-Za-z0-9_-]+/g, '$1…')
    // Formato novo de chave do Google AI Studio: "AQ.xxxx…"
    .replace(/\b(AQ\.[A-Za-z0-9_-]{4})[A-Za-z0-9_.-]{16,}/g, '$1…')
    .slice(0, 500);
}
