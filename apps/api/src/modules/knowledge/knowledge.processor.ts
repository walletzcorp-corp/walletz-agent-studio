import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { KnowledgeRepository } from './knowledge.repository';
import { StorageService } from '../../shared/storage/storage.service';
import { EmbeddingService } from './embedding.service';
import { parseByMimeType } from './parsers/file-parser';
import { AuditService } from '../../shared/audit/audit.service';

export const KNOWLEDGE_QUEUE = 'knowledge-processing';

export interface KnowledgeJobData {
  sourceId: string;
  tenantId: string;
  storageKey: string;
  mimeType: string;
  originalName: string;
}

@Processor(KNOWLEDGE_QUEUE)
export class KnowledgeProcessor extends WorkerHost {
  private readonly logger = new Logger(KnowledgeProcessor.name);

  constructor(
    private readonly repo: KnowledgeRepository,
    private readonly storage: StorageService,
    private readonly embeddingService: EmbeddingService,
    private readonly auditService: AuditService,
  ) {
    super();
  }

  async process(job: Job<KnowledgeJobData>): Promise<void> {
    const { sourceId, tenantId, storageKey, mimeType, originalName } = job.data;

    this.logger.log(`Processing knowledge source ${sourceId} (${originalName})`);

    await this.repo.updateSourceStatus(sourceId, tenantId, 'processing');

    try {
      const buffer = await this.storage.readBuffer(storageKey);
      if (!buffer) {
        throw new Error(`File not found in storage: ${storageKey}`);
      }

      const chunks = await parseByMimeType(buffer, mimeType, originalName);

      // Remove old chunks before inserting new ones (idempotent reprocessing)
      await this.repo.deleteChunksBySource(sourceId, tenantId);

      const savedChunks = await this.repo.createChunks(
        chunks.map((c) => ({
          tenantId,
          sourceId,
          content: c.content,
          chunkIndex: c.chunkIndex,
          tokenCount: c.tokenCount,
          metadata: c.metadata,
        })),
      );

      // Generate and persist embeddings when service is configured
      if (this.embeddingService.isEnabled && savedChunks.length > 0) {
        this.logger.log(`Generating embeddings for ${savedChunks.length} chunks (source ${sourceId})`);
        const embeddings = await this.embeddingService.embedBatch(chunks.map((c) => c.content));

        for (let i = 0; i < savedChunks.length; i++) {
          const vec = embeddings[i];
          const chunk = savedChunks[i];
          if (vec && chunk) {
            try {
              await this.repo.updateChunkEmbedding(chunk.id, tenantId, vec);
            } catch (embErr) {
              // pgvector may not be installed — log and continue
              this.logger.warn(
                `Could not store embedding for chunk ${chunk.id}: ${embErr instanceof Error ? embErr.message : String(embErr)}`,
              );
              break; // skip remaining chunks if column doesn't exist
            }
          }
        }
      }

      await this.repo.updateSourceStatus(sourceId, tenantId, 'processed', {
        processedAt: new Date(),
      });

      await this.auditService.log({
        action: 'knowledge_source.processed',
        resourceType: 'knowledge_source',
        resourceId: sourceId,
        tenantId,
        metadata: { chunks: chunks.length, mimeType, embeddingsGenerated: this.embeddingService.isEnabled },
      });

      this.logger.log(`Done: ${sourceId} — ${chunks.length} chunks`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to process ${sourceId}: ${message}`);

      await this.repo.updateSourceStatus(sourceId, tenantId, 'failed', {
        processingError: message,
      });
    }
  }
}
