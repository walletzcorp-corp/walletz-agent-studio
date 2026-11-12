ALTER TABLE "tenants" ADD COLUMN "llm_monthly_token_limit" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_platform_admin" boolean DEFAULT false NOT NULL;