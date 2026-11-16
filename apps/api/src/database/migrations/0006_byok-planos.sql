DO $$ BEGIN
 CREATE TYPE "public"."ai_connection_status" AS ENUM('active', 'invalid', 'billing_error', 'revoked');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."ai_provider" AS ENUM('anthropic', 'openai', 'gemini', 'openrouter');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_provider_connections" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"provider" "ai_provider" NOT NULL,
	"label" text,
	"encrypted_api_key" text NOT NULL,
	"key_last4" text NOT NULL,
	"default_model" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"status" "ai_connection_status" DEFAULT 'active' NOT NULL,
	"last_validated_at" timestamp with time zone,
	"last_error" text,
	"last_error_at" timestamp with time zone,
	"rate_limits" jsonb,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "outbound_webhooks" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"url" text NOT NULL,
	"description" text,
	"encrypted_secret" text NOT NULL,
	"events" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_delivery_at" timestamp with time zone,
	"last_delivery_status" integer,
	"last_delivery_error" text,
	"consecutive_failures" integer DEFAULT 0 NOT NULL,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "webchat_widgets" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"agent_id" text NOT NULL,
	"name" text NOT NULL,
	"public_key" text NOT NULL,
	"allowed_origins" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"title" text DEFAULT 'Fale com a gente' NOT NULL,
	"welcome_message" text,
	"primary_color" text DEFAULT '#0f766e' NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN IF NOT EXISTS "ai_connection_id" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_provider_connections" ADD CONSTRAINT "ai_provider_connections_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_provider_connections" ADD CONSTRAINT "ai_provider_connections_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "outbound_webhooks" ADD CONSTRAINT "outbound_webhooks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "outbound_webhooks" ADD CONSTRAINT "outbound_webhooks_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "webchat_widgets" ADD CONSTRAINT "webchat_widgets_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "webchat_widgets" ADD CONSTRAINT "webchat_widgets_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "webchat_widgets" ADD CONSTRAINT "webchat_widgets_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_provider_connections_tenant_idx" ON "ai_provider_connections" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ai_provider_connections_default_idx" ON "ai_provider_connections" USING btree ("tenant_id") WHERE "ai_provider_connections"."is_default" = true AND "ai_provider_connections"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "outbound_webhooks_tenant_idx" ON "outbound_webhooks" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "webchat_widgets_tenant_idx" ON "webchat_widgets" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "webchat_widgets_public_key_idx" ON "webchat_widgets" USING btree ("public_key");--> statement-breakpoint
-- Planos comerciais v4.2 (16/11/2026). Preços em centavos de BRL; nenhum inclui tokens de IA.
-- Os limites efetivos vêm de src/shared/plans/plan-catalog.ts; esta cópia serve a relatórios/billing.
INSERT INTO "plans" ("id", "slug", "name", "description", "is_active", "price_monthly", "currency", "trial_days", "limits", "features") VALUES
 ('starter', 'starter', 'Starter', 'Um profissional ou pequeno negócio: 1 agente publicado no site via webchat.', true, 9900, 'BRL', 14,
  '{"agents":1,"users":1,"aiConnections":1,"whatsappNumbers":0,"calendars":0,"webchatWidgets":1,"outboundWebhooks":0,"subaccounts":0}',
  '{"setupFeeCents":250000,"setupFeeCashCents":200000,"support":"basico","aiIncluded":false}'),
 ('pro', 'pro', 'Pro', 'Atendimento, pré-vendas e agendamentos com até 3 agentes, WhatsApp e agenda.', true, 39900, 'BRL', 14,
  '{"agents":3,"users":5,"aiConnections":2,"whatsappNumbers":1,"calendars":1,"webchatWidgets":3,"outboundWebhooks":1,"subaccounts":0}',
  '{"setupFeeCents":600000,"setupFeeCashCents":500000,"support":"prioritario","aiIncluded":false}'),
 ('business', 'business', 'Business', 'Múltiplos departamentos e agentes, integrações corporativas e governança.', true, 89900, 'BRL', 14,
  '{"agents":8,"users":15,"aiConnections":3,"whatsappNumbers":2,"calendars":3,"webchatWidgets":8,"outboundWebhooks":5,"subaccounts":0}',
  '{"setupFeeCents":800000,"setupFeeCashCents":700000,"support":"empresarial","aiIncluded":false}'),
 ('agency', 'agency', 'Agency / White Label', 'Agências que administram agentes em contas independentes dos clientes.', true, 199000, 'BRL', 14,
  '{"agents":10,"users":25,"aiConnections":2,"whatsappNumbers":5,"calendars":5,"webchatWidgets":10,"outboundWebhooks":5,"subaccounts":5}',
  '{"setupFeeCents":1200000,"setupFeeCashCents":1000000,"support":"parceiro","aiIncluded":false}')
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name", "description" = EXCLUDED."description", "price_monthly" = EXCLUDED."price_monthly",
  "limits" = EXCLUDED."limits", "features" = EXCLUDED."features", "updated_at" = now();
--> statement-breakpoint
-- Planos legados do código antigo → equivalentes da v4.2; sem plano → Starter.
UPDATE "tenants" SET "plan_id" = CASE "plan_id"
  WHEN 'growth' THEN 'pro'
  WHEN 'professional' THEN 'business'
  WHEN 'enterprise' THEN 'agency'
  ELSE 'starter' END
WHERE "plan_id" IS NULL OR "plan_id" NOT IN ('starter', 'pro', 'business', 'agency');
