-- Lab conversations: conversas do Laboratório de IA por agente/usuário/tenant
-- Isoladas das conversas de produção (WhatsApp, e-mail, webchat)

CREATE TABLE IF NOT EXISTS "lab_conversations" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "agent_id" TEXT NOT NULL,
  "agent_version" TEXT,
  "title" TEXT NOT NULL DEFAULT 'Nova conversa',
  "last_message_at" TIMESTAMPTZ,
  "deleted_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "lab_messages" (
  "id" TEXT PRIMARY KEY,
  "conversation_id" TEXT NOT NULL REFERENCES "lab_conversations"("id"),
  "tenant_id" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "provider" TEXT,
  "model" TEXT,
  "input_tokens" INTEGER,
  "output_tokens" INTEGER,
  "trace_id" TEXT,
  "retrieved_chunks" JSONB,
  "tool_calls_executed" JSONB,
  "error_message" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "lab_conv_tenant_agent_idx" ON "lab_conversations" ("tenant_id", "agent_id");
CREATE INDEX IF NOT EXISTS "lab_conv_tenant_user_idx" ON "lab_conversations" ("tenant_id", "user_id");
CREATE INDEX IF NOT EXISTS "lab_conv_last_message_idx" ON "lab_conversations" ("last_message_at");
CREATE INDEX IF NOT EXISTS "lab_msg_conversation_idx" ON "lab_messages" ("conversation_id");
CREATE INDEX IF NOT EXISTS "lab_msg_tenant_idx" ON "lab_messages" ("tenant_id");
