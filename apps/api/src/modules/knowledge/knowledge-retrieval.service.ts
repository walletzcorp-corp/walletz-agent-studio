import { Injectable, Logger } from '@nestjs/common';
import { AiProvidersService } from '../ai-providers/ai-providers.service';
import { KnowledgeRepository, type RetrievedChunk } from './knowledge.repository';

/**
 * Recuperação para o RAG do agente:
 *  1. busca vetorial (pgvector) quando o tenant tem chave OpenAI/Gemini e trechos indexados;
 *  2. busca textual em português (full-text + índice GIN) complementa ou substitui.
 * Sempre restrita ao tenant e aos documentos do agente (ou compartilhados).
 */
@Injectable()
export class KnowledgeRetrievalService {
  private readonly logger = new Logger(KnowledgeRetrievalService.name);

  constructor(
    private readonly repo: KnowledgeRepository,
    private readonly aiProviders: AiProvidersService,
  ) {}

  async search(tenantId: string, agentId: string, query: string, limit = 5): Promise<RetrievedChunk[]> {
    const text = query.trim();
    if (!text) return [];

    let vectorHits: RetrievedChunk[] = [];
    try {
      const embedder = await this.aiProviders.resolveEmbedder(tenantId);
      if (embedder && (await this.repo.hasEmbeddings(tenantId, embedder.modelId))) {
        const [vector] = await embedder.embed([text], 'query');
        if (vector) vectorHits = await this.repo.searchByVector(tenantId, agentId, vector, embedder.modelId, limit);
      }
    } catch (err) {
      // Sem crédito, chave recusada etc.: segue só com a busca textual.
      this.logger.warn(`Busca vetorial indisponível (tenant ${tenantId}): ${err instanceof Error ? err.message : String(err)}`);
    }

    const textHits = await this.repo.searchByText(tenantId, agentId, text, limit);
    const seen = new Set<string>();
    const merged: RetrievedChunk[] = [];
    for (const hit of [...vectorHits, ...textHits]) {
      const key = `${hit.sourceId}:${hit.content.slice(0, 80)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(hit);
      if (merged.length >= limit + 1) break;
    }
    return merged;
  }
}
