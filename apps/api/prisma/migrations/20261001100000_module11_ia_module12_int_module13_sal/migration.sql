-- Migration: M11 IA + M12 INT + M13 SAL
-- Generated: 2026-10-01

-- ============================================================
-- M11 IA — Inteligência Artificial
-- ============================================================

CREATE TYPE "AiRiskLevel" AS ENUM ('BAIXO', 'MEDIO', 'ALTO', 'INACEITAVEL');
CREATE TYPE "AiDraftStatus" AS ENUM ('PENDENTE', 'ACEITO', 'REJEITADO', 'EXPIRADO');

CREATE TABLE "ai_configs" (
    "id"                   TEXT NOT NULL,
    "organization_id"      TEXT NOT NULL,
    "use_case"             TEXT NOT NULL,
    "enabled"              BOOLEAN NOT NULL DEFAULT false,
    "provider"             TEXT NOT NULL DEFAULT 'simulated',
    "model_id"             TEXT,
    "model_version"        TEXT,
    "prompt_version"       TEXT,
    "risk_level"           "AiRiskLevel" NOT NULL DEFAULT 'MEDIO',
    "risk_classification"  TEXT NOT NULL,
    "purpose"              TEXT NOT NULL,
    "limitations"          TEXT,
    "validated_population" TEXT,
    "scientific_ref"       TEXT,
    "requires_consent"     BOOLEAN NOT NULL DEFAULT true,
    "allowed_specialties"  JSONB,
    "updated_by"           TEXT NOT NULL,
    "approved_by"          TEXT,
    "approved_at"          TIMESTAMPTZ,
    "active"               BOOLEAN NOT NULL DEFAULT true,
    "created_at"           TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at"           TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "ai_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ai_configs_organization_id_use_case_key" ON "ai_configs"("organization_id", "use_case");
CREATE INDEX "ai_configs_organization_id_idx" ON "ai_configs"("organization_id");

CREATE TABLE "ai_drafts" (
    "id"             TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "patient_id"     TEXT,
    "entry_id"       TEXT,
    "use_case"       TEXT NOT NULL,
    "status"         "AiDraftStatus" NOT NULL DEFAULT 'PENDENTE',
    "input_summary"  TEXT NOT NULL,
    "output"         JSONB NOT NULL,
    "sources"        JSONB,
    "model_id"       TEXT,
    "model_version"  TEXT,
    "prompt_version" TEXT,
    "reviewed_by"    TEXT,
    "reviewed_at"    TIMESTAMPTZ,
    "review_notes"   TEXT,
    "expires_at"     TIMESTAMPTZ,
    "created_by"     TEXT NOT NULL,
    "created_at"     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "ai_drafts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_drafts_org_patient_status_idx" ON "ai_drafts"("organization_id", "patient_id", "status");
CREATE INDEX "ai_drafts_status_expires_idx" ON "ai_drafts"("status", "expires_at");

CREATE TABLE "ai_usage_logs" (
    "id"              TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id"         TEXT NOT NULL,
    "use_case"        TEXT NOT NULL,
    "draft_id"        TEXT,
    "action"          TEXT NOT NULL,
    "model_id"        TEXT,
    "latency_ms"      INTEGER,
    "token_count"     INTEGER,
    "error_type"      TEXT,
    "occurred_at"     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "ai_usage_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_usage_logs_org_usecase_idx" ON "ai_usage_logs"("organization_id", "use_case", "occurred_at");

ALTER TABLE "ai_usage_logs" ADD CONSTRAINT "ai_usage_logs_draft_id_fkey"
    FOREIGN KEY ("draft_id") REFERENCES "ai_drafts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ai_quality_metrics" (
    "id"               TEXT NOT NULL,
    "organization_id"  TEXT NOT NULL,
    "use_case"         TEXT NOT NULL,
    "model_id"         TEXT NOT NULL,
    "period_start"     DATE NOT NULL,
    "period_end"       DATE NOT NULL,
    "total_requests"   INTEGER NOT NULL DEFAULT 0,
    "accepted_count"   INTEGER NOT NULL DEFAULT 0,
    "rejected_count"   INTEGER NOT NULL DEFAULT 0,
    "avg_latency_ms"   DOUBLE PRECISION,
    "error_count"      INTEGER NOT NULL DEFAULT 0,
    "drift_detected"   BOOLEAN NOT NULL DEFAULT false,
    "incident_count"   INTEGER NOT NULL DEFAULT 0,
    "notes"            TEXT,
    "recorded_by"      TEXT NOT NULL,
    "created_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "ai_quality_metrics_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_quality_metrics_org_usecase_period_idx" ON "ai_quality_metrics"("organization_id", "use_case", "period_start");

-- ============================================================
-- M12 INT — Integrações e Portal do Paciente
-- ============================================================

CREATE TYPE "WebhookStatus" AS ENUM ('ATIVO', 'INATIVO');
CREATE TYPE "WebhookEventStatus" AS ENUM ('PENDENTE', 'ENTREGUE', 'FALHOU', 'REPROCESSANDO', 'DEAD_LETTER');
CREATE TYPE "ConnectorStatus" AS ENUM ('ATIVO', 'INATIVO', 'NAO_CONFIGURADO');

CREATE TABLE "webhook_endpoints" (
    "id"              TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name"            TEXT NOT NULL,
    "url"             TEXT NOT NULL,
    "secret_hash"     TEXT NOT NULL,
    "events"          JSONB NOT NULL,
    "status"          "WebhookStatus" NOT NULL DEFAULT 'ATIVO',
    "headers"         JSONB,
    "created_by"      TEXT NOT NULL,
    "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "webhook_endpoints_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "webhook_endpoints_org_status_idx" ON "webhook_endpoints"("organization_id", "status");

CREATE TABLE "webhook_event_deliveries" (
    "id"               TEXT NOT NULL,
    "endpoint_id"      TEXT NOT NULL,
    "event_type"       TEXT NOT NULL,
    "idempotency_key"  TEXT NOT NULL,
    "payload"          JSONB NOT NULL,
    "status"           "WebhookEventStatus" NOT NULL DEFAULT 'PENDENTE',
    "attempts"         INTEGER NOT NULL DEFAULT 0,
    "last_attempt_at"  TIMESTAMPTZ,
    "next_retry_at"    TIMESTAMPTZ,
    "response_status"  INTEGER,
    "response_body"    TEXT,
    "error_message"    TEXT,
    "created_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "webhook_event_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "webhook_event_deliveries_idempotency_key_key" ON "webhook_event_deliveries"("idempotency_key");
CREATE INDEX "webhook_event_deliveries_endpoint_status_idx" ON "webhook_event_deliveries"("endpoint_id", "status");

ALTER TABLE "webhook_event_deliveries" ADD CONSTRAINT "webhook_event_deliveries_endpoint_id_fkey"
    FOREIGN KEY ("endpoint_id") REFERENCES "webhook_endpoints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "integration_connectors" (
    "id"              TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "connector_type"  TEXT NOT NULL,
    "name"            TEXT NOT NULL,
    "status"          "ConnectorStatus" NOT NULL DEFAULT 'NAO_CONFIGURADO',
    "scopes"          JSONB,
    "config_json"     JSONB,
    "mapping_version" TEXT,
    "last_sync_at"    TIMESTAMPTZ,
    "last_sync_status" TEXT,
    "notes"           TEXT,
    "created_by"      TEXT NOT NULL,
    "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "integration_connectors_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "integration_connectors_org_type_key" ON "integration_connectors"("organization_id", "connector_type");
CREATE INDEX "integration_connectors_org_idx" ON "integration_connectors"("organization_id");

CREATE TABLE "patient_portal_sessions" (
    "id"          TEXT NOT NULL,
    "patient_id"  TEXT NOT NULL,
    "token"       TEXT NOT NULL,
    "expires_at"  TIMESTAMPTZ NOT NULL,
    "ip_address"  TEXT,
    "user_agent"  TEXT,
    "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
    "revoked_at"  TIMESTAMPTZ,
    CONSTRAINT "patient_portal_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "patient_portal_sessions_token_key" ON "patient_portal_sessions"("token");
CREATE INDEX "patient_portal_sessions_patient_idx" ON "patient_portal_sessions"("patient_id");

CREATE TABLE "fhir_resources" (
    "id"              TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "resource_type"   TEXT NOT NULL,
    "resource_id"     TEXT NOT NULL,
    "version"         TEXT NOT NULL DEFAULT 'R4',
    "payload"         JSONB NOT NULL,
    "generated_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
    "generated_by"    TEXT NOT NULL,
    CONSTRAINT "fhir_resources_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "fhir_resources_org_type_id_idx" ON "fhir_resources"("organization_id", "resource_type", "resource_id");

CREATE TABLE "integration_consent_grants" (
    "id"              TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "patient_id"      TEXT NOT NULL,
    "connector_type"  TEXT NOT NULL,
    "scopes"          JSONB NOT NULL,
    "granted_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
    "expires_at"      TIMESTAMPTZ,
    "revoked_at"      TIMESTAMPTZ,
    "granted_by"      TEXT NOT NULL,
    CONSTRAINT "integration_consent_grants_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "integration_consent_grants_patient_type_idx" ON "integration_consent_grants"("patient_id", "connector_type");

-- ============================================================
-- M13 SAL — Salas, Poltronas e Fluxo Físico
-- ============================================================

CREATE TYPE "RoomStatus" AS ENUM ('LIVRE', 'RESERVADA', 'PREPARADA', 'OCUPADA', 'HIGIENIZACAO', 'BLOQUEADA', 'INATIVA');
CREATE TYPE "RoomType" AS ENUM ('CONSULTORIO', 'PROCEDIMENTO', 'CIRURGIA', 'RECUPERACAO', 'TRIAGEM', 'EXAME', 'INFUSAO', 'EMERGENCIA', 'OUTRO');
CREATE TYPE "PositionStatus" AS ENUM ('LIVRE', 'OCUPADA', 'RESERVADA', 'HIGIENIZACAO', 'BLOQUEADA');
CREATE TYPE "RoomBookingStatus" AS ENUM ('RESERVADA', 'CONFIRMADA', 'OCUPADA', 'CONCLUIDA', 'CANCELADA');
CREATE TYPE "ChecklistType" AS ENUM ('PREPARO', 'HIGIENIZACAO', 'LIBERACAO');
CREATE TYPE "ChecklistItemStatus" AS ENUM ('PENDENTE', 'CONCLUIDO', 'DISPENSADO');

CREATE TABLE "rooms" (
    "id"               TEXT NOT NULL,
    "organization_id"  TEXT NOT NULL,
    "unit_id"          TEXT,
    "name"             TEXT NOT NULL,
    "code"             TEXT,
    "type"             "RoomType" NOT NULL DEFAULT 'CONSULTORIO',
    "capacity"         INTEGER NOT NULL DEFAULT 1,
    "floor"            TEXT,
    "building"         TEXT,
    "location"         TEXT,
    "status"           "RoomStatus" NOT NULL DEFAULT 'LIVRE',
    "resources_list"   JSONB,
    "restrictions"     JSONB,
    "allows_companion" BOOLEAN NOT NULL DEFAULT false,
    "is_isolation"     BOOLEAN NOT NULL DEFAULT false,
    "is_accessible"    BOOLEAN NOT NULL DEFAULT true,
    "active"           BOOLEAN NOT NULL DEFAULT true,
    "notes"            TEXT,
    "created_by"       TEXT NOT NULL,
    "created_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "rooms_org_code_key" ON "rooms"("organization_id", "code") WHERE "code" IS NOT NULL;
CREATE INDEX "rooms_org_status_idx" ON "rooms"("organization_id", "status");

CREATE TABLE "room_positions" (
    "id"            TEXT NOT NULL,
    "room_id"       TEXT NOT NULL,
    "name"          TEXT NOT NULL,
    "position_type" TEXT NOT NULL DEFAULT 'POLTRONA',
    "status"        "PositionStatus" NOT NULL DEFAULT 'LIVRE',
    "notes"         TEXT,
    "active"        BOOLEAN NOT NULL DEFAULT true,
    "created_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "room_positions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "room_positions_room_id_idx" ON "room_positions"("room_id");

ALTER TABLE "room_positions" ADD CONSTRAINT "room_positions_room_id_fkey"
    FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "room_state_logs" (
    "id"          TEXT NOT NULL,
    "room_id"     TEXT NOT NULL,
    "from_status" TEXT NOT NULL,
    "to_status"   TEXT NOT NULL,
    "changed_by"  TEXT NOT NULL,
    "reason"      TEXT,
    "booking_id"  TEXT,
    "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "room_state_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "room_state_logs_room_occurred_idx" ON "room_state_logs"("room_id", "occurred_at");

ALTER TABLE "room_state_logs" ADD CONSTRAINT "room_state_logs_room_id_fkey"
    FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "room_checklist_templates" (
    "id"              TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "room_type"       TEXT NOT NULL,
    "checklist_type"  "ChecklistType" NOT NULL,
    "name"            TEXT NOT NULL,
    "active"          BOOLEAN NOT NULL DEFAULT true,
    "created_by"      TEXT NOT NULL,
    "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "room_checklist_templates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "room_checklist_templates_org_type_idx" ON "room_checklist_templates"("organization_id", "room_type", "checklist_type");

CREATE TABLE "room_checklist_template_items" (
    "id"          TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "is_critical"  BOOLEAN NOT NULL DEFAULT false,
    "position"    INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "room_checklist_template_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "room_checklist_template_items_template_idx" ON "room_checklist_template_items"("template_id");

ALTER TABLE "room_checklist_template_items" ADD CONSTRAINT "room_checklist_template_items_template_id_fkey"
    FOREIGN KEY ("template_id") REFERENCES "room_checklist_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "room_checklist_executions" (
    "id"             TEXT NOT NULL,
    "room_id"        TEXT NOT NULL,
    "template_id"    TEXT NOT NULL,
    "checklist_type" "ChecklistType" NOT NULL,
    "status"         TEXT NOT NULL DEFAULT 'EM_ANDAMENTO',
    "started_by"     TEXT NOT NULL,
    "completed_by"   TEXT,
    "completed_at"   TIMESTAMPTZ,
    "booking_id"     TEXT,
    "created_at"     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "room_checklist_executions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "room_checklist_executions_room_type_idx" ON "room_checklist_executions"("room_id", "checklist_type");

ALTER TABLE "room_checklist_executions" ADD CONSTRAINT "room_checklist_executions_room_id_fkey"
    FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "room_checklist_executions" ADD CONSTRAINT "room_checklist_executions_template_id_fkey"
    FOREIGN KEY ("template_id") REFERENCES "room_checklist_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "room_checklist_execution_items" (
    "id"            TEXT NOT NULL,
    "execution_id"  TEXT NOT NULL,
    "description"   TEXT NOT NULL,
    "is_critical"    BOOLEAN NOT NULL DEFAULT false,
    "status"        "ChecklistItemStatus" NOT NULL DEFAULT 'PENDENTE',
    "completed_by"  TEXT,
    "completed_at"  TIMESTAMPTZ,
    "notes"         TEXT,
    CONSTRAINT "room_checklist_execution_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "room_checklist_execution_items_exec_idx" ON "room_checklist_execution_items"("execution_id");

ALTER TABLE "room_checklist_execution_items" ADD CONSTRAINT "room_checklist_execution_items_execution_id_fkey"
    FOREIGN KEY ("execution_id") REFERENCES "room_checklist_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "room_bookings" (
    "id"               TEXT NOT NULL,
    "organization_id"  TEXT NOT NULL,
    "room_id"          TEXT NOT NULL,
    "position_id"      TEXT,
    "appointment_id"   TEXT,
    "patient_id"       TEXT,
    "professional_id"  TEXT,
    "service_id"       TEXT,
    "status"           "RoomBookingStatus" NOT NULL DEFAULT 'RESERVADA',
    "scheduled_start"  TIMESTAMPTZ NOT NULL,
    "scheduled_end"    TIMESTAMPTZ NOT NULL,
    "actual_start"     TIMESTAMPTZ,
    "actual_end"       TIMESTAMPTZ,
    "setup_minutes"    INTEGER NOT NULL DEFAULT 0,
    "cleaning_minutes" INTEGER NOT NULL DEFAULT 15,
    "has_companion"    BOOLEAN NOT NULL DEFAULT false,
    "notes"            TEXT,
    "created_by"       TEXT NOT NULL,
    "created_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "room_bookings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "room_bookings_org_room_start_idx" ON "room_bookings"("organization_id", "room_id", "scheduled_start");
CREATE INDEX "room_bookings_org_status_idx" ON "room_bookings"("organization_id", "status");

ALTER TABLE "room_bookings" ADD CONSTRAINT "room_bookings_room_id_fkey"
    FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "room_bookings" ADD CONSTRAINT "room_bookings_position_id_fkey"
    FOREIGN KEY ("position_id") REFERENCES "room_positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "room_patient_flow_events" (
    "id"             TEXT NOT NULL,
    "booking_id"     TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "patient_id"     TEXT,
    "event_type"     TEXT NOT NULL,
    "occurred_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
    "recorded_by"    TEXT NOT NULL,
    "notes"          TEXT,
    CONSTRAINT "room_patient_flow_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "room_patient_flow_events_booking_idx" ON "room_patient_flow_events"("booking_id");
CREATE INDEX "room_patient_flow_events_org_patient_idx" ON "room_patient_flow_events"("organization_id", "patient_id");

ALTER TABLE "room_patient_flow_events" ADD CONSTRAINT "room_patient_flow_events_booking_id_fkey"
    FOREIGN KEY ("booking_id") REFERENCES "room_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "room_incidents" (
    "id"              TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "room_id"         TEXT NOT NULL,
    "incident_type"   TEXT NOT NULL,
    "description"     TEXT NOT NULL,
    "severity"        TEXT NOT NULL DEFAULT 'MEDIA',
    "status"          TEXT NOT NULL DEFAULT 'ABERTO',
    "reported_by"     TEXT NOT NULL,
    "reported_at"     TIMESTAMPTZ NOT NULL DEFAULT now(),
    "resolved_by"     TEXT,
    "resolved_at"     TIMESTAMPTZ,
    "resolution_notes" TEXT,
    CONSTRAINT "room_incidents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "room_incidents_org_room_idx" ON "room_incidents"("organization_id", "room_id");
CREATE INDEX "room_incidents_org_status_idx" ON "room_incidents"("organization_id", "status");

ALTER TABLE "room_incidents" ADD CONSTRAINT "room_incidents_room_id_fkey"
    FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
