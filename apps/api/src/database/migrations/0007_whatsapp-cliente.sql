ALTER TABLE "whatsapp_accounts" ADD COLUMN IF NOT EXISTS "agent_id" text;--> statement-breakpoint
ALTER TABLE "whatsapp_accounts" ADD COLUMN IF NOT EXISTS "credential_source" text DEFAULT 'embedded' NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "whatsapp_accounts" ADD CONSTRAINT "whatsapp_accounts_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
