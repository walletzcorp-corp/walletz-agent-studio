-- Migration: persistent lab conversations with per-user, per-tenant isolation.
--
-- lab_conversations: each test session in the Laboratory belongs to one tenant + user + agent.
-- lab_messages: individual turns in a lab conversation (cascading delete with the conversation).

CREATE TABLE IF NOT EXISTS "lab_conversations" (
  "id"              text PRIMARY KEY,
  "tenant_id"       text NOT NULL REFERENCES "tenants"("id"),
  "user_id"         text NOT NULL REFERENCES "users"("id"),
  "agent_id"        text NOT NULL REFERENCES "agents"("id"),
  "title"           text NOT NULL DEFAULT 'Nova conversa',
  "last_message_at" timestamptz,
  "deleted_at"      timestamptz,
  "created_at"      timestamptz NOT NULL DEFAULT now(),
  "updated_at"      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "lab_conversations_tenant_user_idx"
  ON "lab_conversations" ("tenant_id", "user_id");

CREATE INDEX IF NOT EXISTS "lab_conversations_tenant_agent_idx"
  ON "lab_conversations" ("tenant_id", "agent_id");

CREATE TABLE IF NOT EXISTS "lab_messages" (
  "id"              text PRIMARY KEY,
  "conversation_id" text NOT NULL REFERENCES "lab_conversations"("id") ON DELETE CASCADE,
  "tenant_id"       text NOT NULL REFERENCES "tenants"("id"),
  "role"            text NOT NULL CHECK ("role" IN ('user', 'assistant')),
  "content"         text NOT NULL,
  "metadata"        jsonb NOT NULL DEFAULT '{}',
  "created_at"      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "lab_messages_conversation_idx"
  ON "lab_messages" ("conversation_id");

CREATE INDEX IF NOT EXISTS "lab_messages_tenant_idx"
  ON "lab_messages" ("tenant_id");
