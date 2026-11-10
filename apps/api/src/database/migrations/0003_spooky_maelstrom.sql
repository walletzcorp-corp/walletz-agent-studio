DO $$ BEGIN
 CREATE TYPE "public"."calendar_provider" AS ENUM('google', 'microsoft');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."calendar_sync_status" AS ENUM('synced', 'pending', 'error', 'disconnected', 'reauth_required');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."meeting_origin" AS ENUM('agent', 'manual');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."meeting_platform" AS ENUM('google_meet', 'teams', 'presencial', 'phone');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."meeting_status" AS ENUM('confirmed', 'pending', 'cancelled', 'rescheduled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TYPE "agent_template" ADD VALUE IF NOT EXISTS 'radar_editais';--> statement-breakpoint
ALTER TYPE "agent_template" ADD VALUE IF NOT EXISTS 'reception';--> statement-breakpoint
ALTER TYPE "agent_template" ADD VALUE IF NOT EXISTS 'sdr_inbound';--> statement-breakpoint
ALTER TYPE "agent_template" ADD VALUE IF NOT EXISTS 'sdr_outbound';--> statement-breakpoint
ALTER TYPE "agent_template" ADD VALUE IF NOT EXISTS 'pre_qualifier';--> statement-breakpoint
ALTER TYPE "agent_template" ADD VALUE IF NOT EXISTS 'commercial_consultant';--> statement-breakpoint
ALTER TYPE "agent_template" ADD VALUE IF NOT EXISTS 'followup_commercial';--> statement-breakpoint
ALTER TYPE "agent_template" ADD VALUE IF NOT EXISTS 'executive_assistant';--> statement-breakpoint
ALTER TYPE "agent_template" ADD VALUE IF NOT EXISTS 'agenda_ai';--> statement-breakpoint
ALTER TYPE "agent_template" ADD VALUE IF NOT EXISTS 'customer_success_cs';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_calendar_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"agent_id" text NOT NULL,
	"connection_id" text,
	"can_schedule" boolean DEFAULT false NOT NULL,
	"default_duration_minutes" integer DEFAULT 30 NOT NULL,
	"buffer_minutes" integer DEFAULT 15 NOT NULL,
	"max_meetings_per_day" integer DEFAULT 8 NOT NULL,
	"min_lead_time_minutes" integer DEFAULT 120 NOT NULL,
	"default_platform" "meeting_platform" DEFAULT 'google_meet' NOT NULL,
	"available_hours" jsonb DEFAULT '{"mon":{"start":"09:00","end":"18:00","enabled":true},"tue":{"start":"09:00","end":"18:00","enabled":true},"wed":{"start":"09:00","end":"18:00","enabled":true},"thu":{"start":"09:00","end":"18:00","enabled":true},"fri":{"start":"09:00","end":"18:00","enabled":true},"sat":{"start":null,"end":null,"enabled":false},"sun":{"start":null,"end":null,"enabled":false}}'::jsonb,
	"time_zone" text DEFAULT 'America/Sao_Paulo' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "calendar_connections" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"connected_by_user_id" text,
	"provider" "calendar_provider" NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"external_account_id" text,
	"encrypted_access_token" text NOT NULL,
	"encrypted_refresh_token" text,
	"token_expires_at" timestamp with time zone,
	"scopes" text[],
	"sync_status" "calendar_sync_status" DEFAULT 'pending' NOT NULL,
	"last_sync_at" timestamp with time zone,
	"sync_error" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "calendar_meetings" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"connection_id" text,
	"agent_id" text,
	"conversation_id" text,
	"contact_id" text,
	"external_event_id" text,
	"external_meet_url" text,
	"title" text NOT NULL,
	"description" text,
	"contact_name" text,
	"contact_email" text,
	"status" "meeting_status" DEFAULT 'pending' NOT NULL,
	"platform" "meeting_platform" DEFAULT 'google_meet' NOT NULL,
	"origin" "meeting_origin" DEFAULT 'manual' NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"duration_minutes" integer DEFAULT 30 NOT NULL,
	"time_zone" text DEFAULT 'America/Sao_Paulo' NOT NULL,
	"attendees" jsonb DEFAULT '[]'::jsonb,
	"cancellation_reason" text,
	"rescheduled_from_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pc_commands" (
	"id" text PRIMARY KEY NOT NULL,
	"device_id" text NOT NULL,
	"tenant_id" text NOT NULL,
	"agent_id" text,
	"tool_name" text NOT NULL,
	"params" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"result" jsonb,
	"error" text,
	"risk_level" text DEFAULT 'low' NOT NULL,
	"requires_approval" boolean DEFAULT false NOT NULL,
	"approved_at" timestamp with time zone,
	"approved_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pc_devices" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"device_name" text NOT NULL,
	"platform" text DEFAULT 'windows' NOT NULL,
	"pairing_token" text,
	"pairing_expires_at" timestamp with time zone,
	"paired_at" timestamp with time zone,
	"last_seen_at" timestamp with time zone,
	"capabilities" jsonb DEFAULT '{"files":{"read":true,"create":true,"rename":false,"move":false,"delete":false},"apps":{"open":false,"close":false},"browser":{"openUrl":true},"system":{"info":true}}'::jsonb NOT NULL,
	"authorized_agent_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"authorized_paths" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"authorized_apps" jsonb DEFAULT '["notepad.exe","calc.exe","msedge.exe"]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agent_calendar_settings" ADD CONSTRAINT "agent_calendar_settings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agent_calendar_settings" ADD CONSTRAINT "agent_calendar_settings_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agent_calendar_settings" ADD CONSTRAINT "agent_calendar_settings_connection_id_calendar_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."calendar_connections"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "calendar_connections" ADD CONSTRAINT "calendar_connections_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "calendar_connections" ADD CONSTRAINT "calendar_connections_connected_by_user_id_users_id_fk" FOREIGN KEY ("connected_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "calendar_meetings" ADD CONSTRAINT "calendar_meetings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "calendar_meetings" ADD CONSTRAINT "calendar_meetings_connection_id_calendar_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."calendar_connections"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "calendar_meetings" ADD CONSTRAINT "calendar_meetings_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pc_commands" ADD CONSTRAINT "pc_commands_device_id_pc_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."pc_devices"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pc_devices" ADD CONSTRAINT "pc_devices_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_cal_settings_tenant_idx" ON "agent_calendar_settings" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "agent_cal_settings_agent_idx" ON "agent_calendar_settings" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cal_connections_tenant_idx" ON "calendar_connections" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "cal_connections_provider_email_idx" ON "calendar_connections" USING btree ("tenant_id","provider","email") WHERE "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cal_meetings_tenant_idx" ON "calendar_meetings" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cal_meetings_start_at_idx" ON "calendar_meetings" USING btree ("tenant_id","start_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cal_meetings_external_event_idx" ON "calendar_meetings" USING btree ("external_event_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cal_meetings_conversation_idx" ON "calendar_meetings" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cal_meetings_contact_idx" ON "calendar_meetings" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pc_devices_tenant_idx" ON "pc_devices" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pc_commands_device_status_idx" ON "pc_commands" USING btree ("device_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pc_commands_created_at_idx" ON "pc_commands" USING btree ("created_at");
