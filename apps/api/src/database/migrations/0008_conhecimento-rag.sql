-- Base de conhecimento com RAG real (PostgreSQL + pgvector, tudo local).
-- Seguro para rodar numa transação: o enum de status é recriado (não usa ADD VALUE)
-- e os dados existentes são preservados e convertidos.

CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint

-- Status reais do documento: uploaded → processing → indexing → ready | failed
ALTER TABLE "knowledge_sources" ALTER COLUMN "status" DROP DEFAULT;
--> statement-breakpoint
ALTER TYPE "knowledge_source_status" RENAME TO "knowledge_source_status_old";
--> statement-breakpoint
CREATE TYPE "knowledge_source_status" AS ENUM ('uploaded', 'processing', 'indexing', 'ready', 'failed', 'outdated');
--> statement-breakpoint
ALTER TABLE "knowledge_sources"
  ALTER COLUMN "status" TYPE "knowledge_source_status"
  USING (CASE "status"::text
    WHEN 'pending' THEN 'uploaded'
    WHEN 'processed' THEN 'ready'
    ELSE "status"::text
  END)::"knowledge_source_status";
--> statement-breakpoint
ALTER TABLE "knowledge_sources" ALTER COLUMN "status" SET DEFAULT 'uploaded';
--> statement-breakpoint
DROP TYPE "knowledge_source_status_old";
--> statement-breakpoint

-- Metadados de arquivo e de indexação
ALTER TABLE "knowledge_sources" ADD COLUMN IF NOT EXISTS "extension" text;
--> statement-breakpoint
ALTER TABLE "knowledge_sources" ADD COLUMN IF NOT EXISTS "index_status" text DEFAULT 'pending' NOT NULL;
--> statement-breakpoint
ALTER TABLE "knowledge_sources" ADD COLUMN IF NOT EXISTS "index_error" text;
--> statement-breakpoint
ALTER TABLE "knowledge_sources" ADD COLUMN IF NOT EXISTS "indexed_at" timestamp with time zone;
--> statement-breakpoint
-- Documentos já processados ainda não têm embeddings: ficam aguardando indexação.
UPDATE "knowledge_sources" SET "index_status" = 'awaiting_ai' WHERE "status" = 'ready';
--> statement-breakpoint
UPDATE "knowledge_sources"
  SET "extension" = lower(substring("name" from '\.([A-Za-z0-9]{1,8})$'))
  WHERE "extension" IS NULL;
--> statement-breakpoint

-- Embeddings: a coluna nasceu como text; vira vector(1536). Não havia vetores gravados.
ALTER TABLE "knowledge_chunks" ALTER COLUMN "embedding" TYPE vector(1536) USING NULL::vector(1536);
--> statement-breakpoint
ALTER TABLE "knowledge_chunks" ADD COLUMN IF NOT EXISTS "embedding_model" text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "knowledge_chunks_embedding_idx" ON "knowledge_chunks" USING hnsw ("embedding" vector_cosine_ops);
--> statement-breakpoint
-- Busca textual (fallback quando não há embeddings): full-text em português, não ILIKE.
CREATE INDEX IF NOT EXISTS "knowledge_chunks_content_fts_idx" ON "knowledge_chunks" USING gin (to_tsvector('portuguese', "content"));
