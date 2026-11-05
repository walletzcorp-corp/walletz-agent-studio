import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_TOKEN, type DrizzleDB } from '../../database/database.module';
import { knowledgeSources, knowledgeChunks } from '../../database/schema/knowledge';
import { eq, and, isNull, desc } from 'drizzle-orm';
import type { NewKnowledgeSource } from '../../database/schema/knowledge';

@Injectable()
export class KnowledgeRepository {
  constructor(@Inject(DRIZZLE_TOKEN) private readonly db: DrizzleDB) {}

  async createSource(data: NewKnowledgeSource) {
    const [row] = await this.db.insert(knowledgeSources).values(data).returning();
    return row!;
  }

  async findSourceById(id: string, tenantId: string) {
    const [row] = await this.db
      .select()
      .from(knowledgeSources)
      .where(
        and(
          eq(knowledgeSources.id, id),
          eq(knowledgeSources.tenantId, tenantId),
          isNull(knowledgeSources.deletedAt),
        ),
      );
    return row ?? null;
  }

  async findSourcesByTenant(tenantId: string, agentId?: string) {
    const conditions = [
      eq(knowledgeSources.tenantId, tenantId),
      isNull(knowledgeSources.deletedAt),
    ];
    if (agentId) {
      conditions.push(eq(knowledgeSources.agentId, agentId));
    }
    return this.db
      .select()
      .from(knowledgeSources)
      .where(and(...conditions))
      .orderBy(desc(knowledgeSources.createdAt));
  }

  async updateSourceStatus(
    id: string,
    tenantId: string,
    status: 'pending' | 'processing' | 'processed' | 'failed' | 'outdated',
    extra?: { processingError?: string; processedAt?: Date },
  ) {
    await this.db
      .update(knowledgeSources)
      .set({ status, ...extra, updatedAt: new Date() })
      .where(and(eq(knowledgeSources.id, id), eq(knowledgeSources.tenantId, tenantId)));
  }

  async softDeleteSource(id: string, tenantId: string) {
    await this.db
      .update(knowledgeSources)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(knowledgeSources.id, id), eq(knowledgeSources.tenantId, tenantId)));
  }

  async createChunks(
    chunks: Array<{
      tenantId: string;
      sourceId: string;
      content: string;
      chunkIndex: number;
      tokenCount?: number;
      metadata?: Record<string, unknown>;
    }>,
  ) {
    if (chunks.length === 0) return [];
    return this.db.insert(knowledgeChunks).values(chunks).returning();
  }

  async deleteChunksBySource(sourceId: string, tenantId: string) {
    await this.db
      .delete(knowledgeChunks)
      .where(and(eq(knowledgeChunks.sourceId, sourceId), eq(knowledgeChunks.tenantId, tenantId)));
  }

  async countChunksBySource(sourceId: string, tenantId: string): Promise<number> {
    const rows = await this.db
      .select({ id: knowledgeChunks.id })
      .from(knowledgeChunks)
      .where(and(eq(knowledgeChunks.sourceId, sourceId), eq(knowledgeChunks.tenantId, tenantId)));
    return rows.length;
  }
}
