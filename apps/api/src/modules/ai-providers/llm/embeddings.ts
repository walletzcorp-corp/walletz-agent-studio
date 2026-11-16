import type { AiProvider } from '../../../database/schema/ai-providers';
import { LlmProviderError, classifyProviderError, redactSecrets } from './llm.types';
import { extractErrorMessage } from './openai-compatible.adapter';

/** Dimensão da coluna knowledge_chunks.embedding (vector(1536)). */
export const EMBEDDING_DIMENSIONS = 1536;
const TIMEOUT_MS = 60_000;

export type EmbeddingPurpose = 'document' | 'query';

/**
 * Provedores que geram embeddings com a chave do cliente. Anthropic não tem API de
 * embeddings; OpenRouter não é usado aqui. O identificador (provider/modelo) é gravado
 * em cada trecho: só se comparam vetores do mesmo modelo.
 */
export const EMBEDDING_MODELS: Partial<Record<AiProvider, { model: string; batch: number }>> = {
  openai: { model: 'text-embedding-3-small', batch: 96 },
  gemini: { model: 'gemini-embedding-001', batch: 100 },
};

export function embeddingModelId(provider: AiProvider): string | null {
  const cfg = EMBEDDING_MODELS[provider];
  return cfg ? `${provider}/${cfg.model}` : null;
}

async function post(provider: AiProvider, url: string, headers: Record<string, string>, body: unknown): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    throw new LlmProviderError('unavailable', provider, redactSecrets(err instanceof Error ? err.message : String(err)));
  }
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message = redactSecrets(extractErrorMessage(data, res.statusText || `HTTP ${res.status}`));
    throw new LlmProviderError(classifyProviderError(res.status, message), provider, message, res.status);
  }
  return data;
}

function assertDims(provider: AiProvider, vectors: number[][]): number[][] {
  for (const v of vectors) {
    if (!Array.isArray(v) || v.length !== EMBEDDING_DIMENSIONS) {
      throw new LlmProviderError('bad_request', provider, `Embedding com dimensão inesperada (${v?.length ?? 0}).`);
    }
  }
  return vectors;
}

async function embedOpenAi(apiKey: string, texts: string[]): Promise<number[][]> {
  const data = (await post(
    'openai',
    'https://api.openai.com/v1/embeddings',
    { Authorization: `Bearer ${apiKey}` },
    { model: EMBEDDING_MODELS.openai!.model, input: texts, dimensions: EMBEDDING_DIMENSIONS },
  )) as { data?: Array<{ embedding: number[]; index: number }> };
  const rows = [...(data.data ?? [])].sort((a, b) => a.index - b.index);
  return assertDims('openai', rows.map((r) => r.embedding));
}

async function embedGemini(apiKey: string, texts: string[], purpose: EmbeddingPurpose): Promise<number[][]> {
  const model = EMBEDDING_MODELS.gemini!.model;
  const data = (await post(
    'gemini',
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:batchEmbedContents`,
    { 'x-goog-api-key': apiKey },
    {
      requests: texts.map((text) => ({
        model: `models/${model}`,
        content: { parts: [{ text }] },
        taskType: purpose === 'query' ? 'RETRIEVAL_QUERY' : 'RETRIEVAL_DOCUMENT',
        outputDimensionality: EMBEDDING_DIMENSIONS,
      })),
    },
  )) as { embeddings?: Array<{ values: number[] }> };
  return assertDims('gemini', (data.embeddings ?? []).map((e) => e.values));
}

/** Gera embeddings em lotes. Lança LlmProviderError já classificado (auth, billing…). */
export async function generateEmbeddings(
  provider: AiProvider,
  apiKey: string,
  texts: string[],
  purpose: EmbeddingPurpose,
): Promise<number[][]> {
  const cfg = EMBEDDING_MODELS[provider];
  if (!cfg) throw new LlmProviderError('model', provider, 'Este provedor não gera embeddings.');
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += cfg.batch) {
    const slice = texts.slice(i, i + cfg.batch).map((t) => t.slice(0, 8000));
    const vectors = provider === 'openai' ? await embedOpenAi(apiKey, slice) : await embedGemini(apiKey, slice, purpose);
    if (vectors.length !== slice.length) {
      throw new LlmProviderError('bad_request', provider, 'O provedor devolveu menos embeddings que o enviado.');
    }
    out.push(...vectors);
  }
  return out;
}
