import { Processor, WorkerHost } from '@nestjs/bullmq';
import { HttpException, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { KnowledgeRepository } from './knowledge.repository';
import { StorageService } from '../../shared/storage/storage.service';
import { AuditService } from '../../shared/audit/audit.service';
import { AiProvidersService } from '../ai-providers/ai-providers.service';
import { ExtractionError, formatFromLegacyMime, parseKnowledgeFile } from './parsers/file-parser';
import type { KnowledgeFormat } from './parsers/file-type';

export const KNOWLEDGE_QUEUE = 'knowledge-processing';

export interface KnowledgeJobData {
  sourceId: string;
  tenantId: string;
}

const KNOWN_FORMATS = new Set<KnowledgeFormat>(['pdf', 'docx', 'txt', 'md', 'csv', 'html']);

/**
 * Pipeline: arquivo salvo → EXTRAIR → NORMALIZAR → CHUNK → EMBEDDING → INDEXAR → READY.
 * Erros de conteúdo viram status "failed" com mensagem clara; falha de embeddings não
 * derruba o documento (a busca textual continua) e fica registrada em index_status.
 */
@Processor(KNOWLEDGE_QUEUE)
export class KnowledgeProcessor extends WorkerHost {
  private readonly logger = new Logger(KnowledgeProcessor.name);

  constructor(
    private readonly repo: KnowledgeRepository,
    private readonly storage: StorageService,
    private readonly auditService: AuditService,
    private readonly aiProviders: AiProvidersService,
  ) {
    super();
  }

  async process(job: Job<KnowledgeJobData>): Promise<void> {
    const { sourceId, tenantId } = job.data;
    const source = await this.repo.findSourceById(sourceId, tenantId);
    if (!source || !source.storageKey) return; // excluído enquanto estava na fila

    await this.repo.updateSource(sourceId, tenantId, { status: 'processing', processingError: null });

    let chunkRows: Array<{ id: string; content: string }>;
    try {
      const buffer = await this.storage.readBuffer(source.storageKey);
      if (!buffer) throw new ExtractionError('O arquivo original não foi encontrado no armazenamento.');
      const format = source.extension && KNOWN_FORMATS.has(source.extension as KnowledgeFormat)
        ? (source.extension as KnowledgeFormat)
        : formatFromLegacyMime(source.mimeType, source.name);

      const chunks = await parseKnowledgeFile(buffer, format, source.name);
      await this.repo.deleteChunksBySource(sourceId, tenantId); // reprocessamento idempotente
      chunkRows = await this.repo.createChunks(
        chunks.map((c) => ({
          tenantId,
          sourceId,
          content: c.content,
          chunkIndex: c.chunkIndex,
          tokenCount: c.tokenCount,
          metadata: c.metadata,
        })),
      );
    } catch (error) {
      const message =
        error instanceof ExtractionError
          ? error.message
          : `Falha no processamento: ${error instanceof Error ? error.message : String(error)}`;
      this.logger.error(`Documento ${sourceId} falhou: ${message}`);
      await this.repo.updateSource(sourceId, tenantId, { status: 'failed', processingError: message.slice(0, 1000) });
      return;
    }

    await this.repo.updateSource(sourceId, tenantId, { status: 'indexing' });
    const index = await this.indexChunks(tenantId, chunkRows);
    await this.repo.updateSource(sourceId, tenantId, {
      status: 'ready',
      processedAt: new Date(),
      indexStatus: index.status,
      indexError: index.error,
      indexedAt: index.status === 'indexed' ? new Date() : null,
    });

    await this.auditService.log({
      action: 'knowledge_source.processed',
      resourceType: 'knowledge_source',
      resourceId: sourceId,
      tenantId,
      metadata: { chunks: chunkRows.length, indexStatus: index.status, model: index.model ?? null },
    });
    this.logger.log(`Documento ${sourceId} pronto — ${chunkRows.length} trechos, indexação: ${index.status}`);
  }

  /** Gera embeddings com a chave de IA do próprio cliente (OpenAI ou Gemini). */
  private async indexChunks(
    tenantId: string,
    chunks: Array<{ id: string; content: string }>,
  ): Promise<{ status: 'indexed' | 'awaiting_ai' | 'failed'; error: string | null; model?: string }> {
    let embedder: Awaited<ReturnType<AiProvidersService['resolveEmbedder']>>;
    try {
      embedder = await this.aiProviders.resolveEmbedder(tenantId);
    } catch (err) {
      return { status: 'failed', error: this.errorText(err) };
    }
    if (!embedder) {
      return {
        status: 'awaiting_ai',
        error: 'Aguardando configuração de IA: conecte uma chave OpenAI ou Gemini em Config. IA para a busca semântica. A busca por texto já funciona.',
      };
    }
    try {
      const vectors = await embedder.embed(chunks.map((c) => c.content), 'document');
      for (let i = 0; i < chunks.length; i++) {
        await this.repo.setChunkEmbedding(chunks[i]!.id, tenantId, vectors[i]!, embedder.modelId);
      }
      return { status: 'indexed', error: null, model: embedder.modelId };
    } catch (err) {
      return { status: 'failed', error: `Falha ao gerar embeddings: ${this.errorText(err)}`, model: embedder.modelId };
    }
  }

  private errorText(err: unknown): string {
    if (err instanceof HttpException) {
      const body = err.getResponse();
      if (body && typeof body === 'object' && 'message' in body) return String((body as { message: unknown }).message);
    }
    return err instanceof Error ? err.message : String(err);
  }
}
