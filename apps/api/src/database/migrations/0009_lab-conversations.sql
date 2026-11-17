-- Laboratório: conversas e mensagens persistidas por agente/usuário/tenant
-- Isoladas das conversas de produção (WhatsApp, e-mail, webchat)

CREATE TABLE IF NOT EXISTS "lab_conversations" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id"),
  "user_id" text NOT NULL REFERENCES "users"("id"),
  "agent_id" text NOT NULL REFERENCES "agents"("id"),
  "agent_version" text,
  "title" text NOT NULL DEFAULT 'Nova conversa',
  "last_message_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "lab_messages" (
  "id" text PRIMARY KEY NOT NULL,
  "conversation_id" text NOT NULL REFERENCES "lab_conversations"("id"),
  "tenant_id" text NOT NULL REFERENCES "tenants"("id"),
  "role" text NOT NULL,
  "content" text NOT NULL,
  "provider" text,
  "model" text,
  "input_tokens" integer,
  "output_tokens" integer,
  "trace_id" text,
  "retrieved_chunks" jsonb,
  "tool_calls_executed" jsonb,
  "error_message" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "lab_conv_tenant_agent_idx" ON "lab_conversations" ("tenant_id", "agent_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lab_conv_tenant_user_idx" ON "lab_conversations" ("tenant_id", "user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lab_conv_last_message_idx" ON "lab_conversations" ("last_message_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lab_msg_conversation_idx" ON "lab_messages" ("conversation_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lab_msg_tenant_idx" ON "lab_messages" ("tenant_id");
