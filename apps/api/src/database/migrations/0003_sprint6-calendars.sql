-- Sprint 6: Calendar integration tables
-- calendar_connections, calendar_meetings, agent_calendar_settings

DO $$ BEGIN
  CREATE TYPE "calendar_provider" AS ENUM ('google', 'microsoft');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "calendar_sync_status" AS ENUM ('synced', 'pending', 'error', 'disconnected', 'reauth_required');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "meeting_status" AS ENUM ('confirmed', 'pending', 'cancelled', 'rescheduled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "meeting_platform" AS ENUM ('google_meet', 'teams', 'presencial', 'phone');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "meeting_origin" AS ENUM ('agent', 'manual');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Calendar connections ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "calendar_connections" (
  "id"                      text PRIMARY KEY,
  "tenant_id"               text NOT NULL REFERENCES "tenants"("id"),
  "connected_by_user_id"    text REFERENCES "users"("id"),
  "provider"                "calendar_provider" NOT NULL,
  "email"                   text NOT NULL,
  "display_name"            text,
  "external_account_id"     text,
  "encrypted_access_token"  text NOT NULL,
  "encrypted_refresh_token" text,
  "token_expires_at"        timestamp with time zone,
  "scopes"                  text[],
  "sync_status"             "calendar_sync_status" NOT NULL DEFAULT 'pending',
  "last_sync_at"            timestamp with time zone,
  "sync_error"              text,
  "metadata"                jsonb DEFAULT '{}',
  "created_at"              timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"              timestamp with time zone NOT NULL DEFAULT now(),
  "deleted_at"              timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "cal_connections_tenant_idx"
  ON "calendar_connections" ("tenant_id");

CREATE UNIQUE INDEX IF NOT EXISTS "cal_connections_provider_email_idx"
  ON "calendar_connections" ("tenant_id", "provider", "email")
  WHERE "deleted_at" IS NULL;

-- ── Calendar meetings ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "calendar_meetings" (
  "id"                  text PRIMARY KEY,
  "tenant_id"           text NOT NULL REFERENCES "tenants"("id"),
  "connection_id"       text REFERENCES "calendar_connections"("id"),
  "agent_id"            text REFERENCES "agents"("id"),
  "external_event_id"   text,
  "external_meet_url"   text,
  "title"               text NOT NULL,
  "description"         text,
  "contact_name"        text,
  "contact_email"       text,
  "status"              "meeting_status" NOT NULL DEFAULT 'pending',
  "platform"            "meeting_platform" NOT NULL DEFAULT 'google_meet',
  "origin"              "meeting_origin" NOT NULL DEFAULT 'manual',
  "start_at"            timestamp with time zone NOT NULL,
  "end_at"              timestamp with time zone NOT NULL,
  "duration_minutes"    integer NOT NULL DEFAULT 30,
  "time_zone"           text NOT NULL DEFAULT 'America/Sao_Paulo',
  "attendees"           jsonb DEFAULT '[]',
  "cancellation_reason" text,
  "rescheduled_from_id" text,
  "metadata"            jsonb DEFAULT '{}',
  "created_at"          timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"          timestamp with time zone NOT NULL DEFAULT now(),
  "deleted_at"          timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "cal_meetings_tenant_idx"
  ON "calendar_meetings" ("tenant_id");

CREATE INDEX IF NOT EXISTS "cal_meetings_start_at_idx"
  ON "calendar_meetings" ("tenant_id", "start_at");

CREATE INDEX IF NOT EXISTS "cal_meetings_external_event_idx"
  ON "calendar_meetings" ("external_event_id");

-- ── Agent calendar settings ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "agent_calendar_settings" (
  "id"                       text PRIMARY KEY,
  "tenant_id"                text NOT NULL REFERENCES "tenants"("id"),
  "agent_id"                 text NOT NULL REFERENCES "agents"("id"),
  "connection_id"            text REFERENCES "calendar_connections"("id"),
  "can_schedule"             boolean NOT NULL DEFAULT false,
  "default_duration_minutes" integer NOT NULL DEFAULT 30,
  "buffer_minutes"           integer NOT NULL DEFAULT 15,
  "max_meetings_per_day"     integer NOT NULL DEFAULT 8,
  "min_lead_time_minutes"    integer NOT NULL DEFAULT 120,
  "default_platform"         "meeting_platform" NOT NULL DEFAULT 'google_meet',
  "available_hours"          jsonb DEFAULT '{"mon":{"start":"09:00","end":"18:00","enabled":true},"tue":{"start":"09:00","end":"18:00","enabled":true},"wed":{"start":"09:00","end":"18:00","enabled":true},"thu":{"start":"09:00","end":"18:00","enabled":true},"fri":{"start":"09:00","end":"18:00","enabled":true},"sat":{"start":null,"end":null,"enabled":false},"sun":{"start":null,"end":null,"enabled":false}}',
  "time_zone"                text NOT NULL DEFAULT 'America/Sao_Paulo',
  "created_at"               timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"               timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "agent_cal_settings_tenant_idx"
  ON "agent_calendar_settings" ("tenant_id");

CREATE UNIQUE INDEX IF NOT EXISTS "agent_cal_settings_agent_idx"
  ON "agent_calendar_settings" ("agent_id");
