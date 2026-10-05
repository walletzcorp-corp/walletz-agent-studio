import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  real,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
  customType,
} from 'drizzle-orm/pg-core';
import { createId } from '../utils/id';
import { tenants } from './tenants';
import { users } from './users';
import { agents } from './agents';

// pgvector type for embeddings
const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(1536)';
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`;
  },
  fromDriver(value: string): number[] {
    return JSON.parse(value) as number[];
  },
});

export const knowledgeSourceTypeEnum = pgEnum('knowledge_source_type', [
  'pdf',
  'docx',
  'xlsx',
  'csv',
  'txt',
  'html',
  'url',
  'faq',
  'typed',
]);

export const knowledgeSourceStatusEnum = pgEnum('knowledge_source_status', [
  'pending',
  'processing',
  'processed',
  'failed',
  'outdated',
]);

export const knowledgeItemTypeEnum = pgEnum('knowledge_item_type', [
  'fact',
  'guidance',
  'procedure',
  'permission',
  'example',
]);

export const knowledgeSources = pgTable(
  'knowledge_sources',
  {
    id: text('id').primaryKey().$defaultFn(createId),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    agentId: text('agent_id').references(() => agents.id),
    name: text('name').notNull(),
    type: knowledgeSourceTypeEnum('type').notNull(),
    status: knowledgeSourceStatusEnum('status').notNull().default('pending'),
    storageKey: text('storage_key'),
    url: text('url'),
    checksum: text('checksum'),
    mimeType: text('mime_type'),
    fileSizeBytes: integer('file_size_bytes'),
    tags: jsonb('tags').notNull().default([]),
    language: text('language').default('pt-BR'),
    priority: integer('priority').notNull().default(0),
    validUntil: timestamp('valid_until', { withTimezone: true }),
    processingError: text('processing_error'),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    uploadedByUserId: text('uploaded_by_user_id').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    tenantIdx: index('knowledge_sources_tenant_idx').on(table.tenantId),
    tenantAgentIdx: index('knowledge_sources_tenant_agent_idx').on(table.tenantId, table.agentId),
    statusIdx: index('knowledge_sources_status_idx').on(table.status),
  }),
);

export const knowledgeChunks = pgTable(
  'knowledge_chunks',
  {
    id: text('id').primaryKey().$defaultFn(createId),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    sourceId: text('source_id')
      .notNull()
      .references(() => knowledgeSources.id),
    content: text('content').notNull(),
    embedding: vector('embedding'),
    metadata: jsonb('metadata').notNull().default({}),
    chunkIndex: integer('chunk_index').notNull(),
    tokenCount: integer('token_count'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantSourceIdx: index('knowledge_chunks_tenant_source_idx').on(table.tenantId, table.sourceId),
    embeddingIdx: index('knowledge_chunks_embedding_idx').using(
      'hnsw',
      table.embedding.op('vector_cosine_ops'),
    ),
  }),
);

export const knowledgeItems = pgTable(
  'knowledge_items',
  {
    id: text('id').primaryKey().$defaultFn(createId),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    agentId: text('agent_id').references(() => agents.id),
    type: knowledgeItemTypeEnum('type').notNull(),
    content: text('content').notNull(),
    context: text('context'),
    confidence: real('confidence').notNull().default(1.0),
    sourceId: text('source_id').references(() => knowledgeSources.id),
    tags: jsonb('tags').notNull().default([]),
    validUntil: timestamp('valid_until', { withTimezone: true }),
    approvedByUserId: text('approved_by_user_id').references(() => users.id),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    tenantIdx: index('knowledge_items_tenant_idx').on(table.tenantId),
    tenantAgentIdx: index('knowledge_items_tenant_agent_idx').on(table.tenantId, table.agentId),
    typeIdx: index('knowledge_items_type_idx').on(table.type),
  }),
);

export type KnowledgeSource = typeof knowledgeSources.$inferSelect;
export type NewKnowledgeSource = typeof knowledgeSources.$inferInsert;
export type KnowledgeChunk = typeof knowledgeChunks.$inferSelect;
export type NewKnowledgeChunk = typeof knowledgeChunks.$inferInsert;
export type KnowledgeItem = typeof knowledgeItems.$inferSelect;
export type NewKnowledgeItem = typeof knowledgeItems.$inferInsert;
