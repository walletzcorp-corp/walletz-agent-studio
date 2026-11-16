import { Injectable, Inject } from '@nestjs/common';
import { eq, and, isNull, desc, count, sql, inArray, lt } from 'drizzle-orm';
import { DRIZZLE_TOKEN, type DrizzleDB } from '../../database/database.module';
import {
  knowledgeSources,
  knowledgeChunks,
  type KnowledgeIndexStatus,
  type KnowledgeSource,
  type NewKnowledgeSource,
} from '../../database/schema/knowledge';

export type KnowledgeSourceStatus = KnowledgeSource['status'];

export interface RetrievedChunk {
  content: string;
  sourceId: string;
  sourceName: string;
  score: number;
  method: 'vector' | 'fulltext';
}

/** Todas as consultas filtram por tenant_id: nenhum dado cruza organizações. */
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
      .where(and(eq(knowledgeSources.id, id), eq(knowledgeSources.tenantId, tenantId), isNull(knowledgeSources.deletedAt)));
    return row ?? null;
  }

  async findSourceByChecksum(tenantId: string, checksum: string) {
    const [row] = await this.db
      .select()
      .from(knowledgeSources)
      .where(
        and(eq(knowledgeSources.tenantId, tenantId), eq(knowledgeSources.checksum, checksum), isNull(knowledgeSources.deletedAt)),
      )
      .limit(1);
    return row ?? null;
  }

  async findSourcesByTenant(tenantId: string, agentId?: string) {
    const conditions = [eq(knowledgeSources.tenantId, tenantId), isNull(knowledgeSources.deletedAt)];
    if (agentId) conditions.push(eq(knowledgeSources.agentId, agentId));
    return this.db
      .select()
      .from(knowledgeSources)
      .where(and(...conditions))
      .orderBy(desc(knowledgeSources.createdAt));
  }

  /** Documentos parados (fila perdida num restart) para reenfileirar. */
  async findStaleSources(olderThan: Date) {
    return this.db
      .select()
      .from(knowledgeSources)
      .where(
        and(
          isNull(knowledgeSources.deletedAt),
          inArray(knowledgeSources.status, ['uploaded', 'processing', 'indexing']),
          lt(knowledgeSources.updatedAt, olderThan),
        ),
      )
      .limit(200);
  }

  async updateSource(
    id: string,
    tenantId: string,
    patch: Partial<{
      status: KnowledgeSourceStatus;
      processingError: string | null;
      processedAt: Date | null;
      indexStatus: KnowledgeIndexStatus;
      indexError: string | null;
      indexedAt: Date | null;
      agentId: string | null;
    }>,
  ) {
    const [row] = await this.db
      .update(knowledgeSources)
      .set({ ...patch, updatedAt: new Date() })
      .where(and(eq(knowledgeSources.id, id), eq(knowledgeSources.tenantId, tenantId)))
      .returning();
    return row ?? null;
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
    return this.db
      .insert(knowledgeChunks)
      .values(chunks)
      .returning({ id: knowledgeChunks.id, content: knowledgeChunks.content });
  }

  async setChunkEmbedding(chunkId: string, tenantId: string, embedding: number[], modelId: string) {
    await this.db.execute(sql`
      UPDATE knowledge_chunks
         SET embedding = ${`[${embedding.join(',')}]`}::vector, embedding_model = ${modelId}
       WHERE id = ${chunkId} AND tenant_id = ${tenantId}`);
  }

  async deleteChunksBySource(sourceId: string, tenantId: string) {
    await this.db
      .delete(knowledgeChunks)
      .where(and(eq(knowledgeChunks.sourceId, sourceId), eq(knowledgeChunks.tenantId, tenantId)));
  }

  async chunkStats(sourceId: string, tenantId: string) {
    const [row] = await this.db
      .select({
        total: count(),
        embedded: sql<number>`count(${knowledgeChunks.embedding})::int`,
        characters: sql<number>`coalesce(sum(length(${knowledgeChunks.content})), 0)::int`,
      })
      .from(knowledgeChunks)
      .where(and(eq(knowledgeChunks.sourceId, sourceId), eq(knowledgeChunks.tenantId, tenantId)));
    return { total: Number(row?.total ?? 0), embedded: Number(row?.embedded ?? 0), characters: Number(row?.characters ?? 0) };
  }

  async previewChunks(sourceId: string, tenantId: string, limit = 3) {
    return this.db
      .select({ chunkIndex: knowledgeChunks.chunkIndex, content: knowledgeChunks.content })
      .from(knowledgeChunks)
      .where(and(eq(knowledgeChunks.sourceId, sourceId), eq(knowledgeChunks.tenantId, tenantId)))
      .orderBy(knowledgeChunks.chunkIndex)
      .limit(limit);
  }

  /** Busca vetorial (pgvector, distância de cosseno) restrita ao tenant, ao agente e ao modelo. */
  async searchByVector(tenantId: string, agentId: string, embedding: number[], modelId: string, limit: number): Promise<RetrievedChunk[]> {
    const vec = `[${embedding.join(',')}]`;
    const result = await this.db.execute(sql`
      SELECT c.content, s.id AS source_id, s.name AS source_name, 1 - (c.embedding <=> ${vec}::vector) AS score
        FROM knowledge_chunks c
        JOIN knowledge_sources s ON s.id = c.source_id AND s.tenant_id = c.tenant_id
       WHERE c.tenant_id = ${tenantId}
         AND s.deleted_at IS NULL
         AND s.status = 'ready'
         AND (s.agent_id = ${agentId} OR s.agent_id IS NULL)
         AND c.embedding IS NOT NULL
         AND c.embedding_model = ${modelId}
       ORDER BY c.embedding <=> ${vec}::vector
       LIMIT ${limit}`);
    return (result.rows as Array<Record<string, unknown>>).map((r) => ({
      content: String(r['content']),
      sourceId: String(r['source_id']),
      sourceName: String(r['source_name']),
      score: Number(r['score']),
      method: 'vector' as const,
    }));
  }

  /**
   * Busca textual em português (to_tsvector + índice GIN), com termos em OU e ranking.
   * Usada quando não há embeddings e para complementar a busca vetorial.
   */
  async searchByText(tenantId: string, agentId: string, query: string, limit: number): Promise<RetrievedChunk[]> {
    const q = query.slice(0, 1000);
    const result = await this.db.execute(sql`
      WITH q AS (
        SELECT NULLIF(replace(plainto_tsquery('portuguese', ${q})::text, '&', '|'), '')::tsquery AS query
      )
      SELECT c.content, s.id AS source_id, s.name AS source_name,
             ts_rank_cd(to_tsvector('portuguese', c.content), q.query) AS score
        FROM knowledge_chunks c
        JOIN knowledge_sources s ON s.id = c.source_id AND s.tenant_id = c.tenant_id
        CROSS JOIN q
       WHERE q.query IS NOT NULL
         AND c.tenant_id = ${tenantId}
         AND s.deleted_at IS NULL
         AND s.status = 'ready'
         AND (s.agent_id = ${agentId} OR s.agent_id IS NULL)
         AND to_tsvector('portuguese', c.content) @@ q.query
       ORDER BY score DESC
       LIMIT ${limit}`);
    return (result.rows as Array<Record<string, unknown>>).map((r) => ({
      content: String(r['content']),
      sourceId: String(r['source_id']),
      sourceName: String(r['source_name']),
      score: Number(r['score']),
      method: 'fulltext' as const,
    }));
  }

  /** O tenant tem trechos indexados com este modelo? (evita gastar a chave à toa) */
  async hasEmbeddings(tenantId: string, modelId: string): Promise<boolean> {
    const result = await this.db.execute(sql`
      SELECT 1 FROM knowledge_chunks WHERE tenant_id = ${tenantId} AND embedding_model = ${modelId} LIMIT 1`);
    return result.rows.length > 0;
  }
}
