-- Migration: M14 MED + M15 QUA + M16 ATI + M17 EQP
-- Date: 2026-10-01

-- ============================================================
-- M14 MED — Segurança de Medicamentos e Procedimentos
-- ============================================================

CREATE TYPE "MedRecordStatus" AS ENUM (
  'RESERVADO',
  'PREPARADO',
  'ADMINISTRADO',
  'DEVOLVIDO',
  'DESCARTADO',
  'BAIXADO',
  'CANCELADO'
);

CREATE TYPE "MedRouteType" AS ENUM (
  'ORAL',
  'EV',
  'IM',
  'SC',
  'TOPICO',
  'INALATORIO',
  'SL',
  'RETAL',
  'TRANSDERMICO',
  'NASAL',
  'OCULAR',
  'OTOLOGICO',
  'OUTRO'
);

CREATE TYPE "MedAdverseReactionSeverity" AS ENUM (
  'LEVE',
  'MODERADA',
  'GRAVE',
  'FATAL'
);

CREATE TYPE "MedLotAlertType" AS ENUM (
  'VENCIMENTO',
  'RECOLHIMENTO',
  'FORA_CONDICAO',
  'SUSPEITA_QUALIDADE'
);

CREATE TABLE "med_protocols" (
  "id"                  TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "organization_id"     TEXT NOT NULL,
  "name"                TEXT NOT NULL,
  "code"                TEXT,
  "description"         TEXT,
  "version"             TEXT NOT NULL DEFAULT '1.0',
  "active"              BOOLEAN NOT NULL DEFAULT TRUE,
  "approved_by"         TEXT,
  "approved_at"         TIMESTAMP(3),
  "requires_dual_check" BOOLEAN NOT NULL DEFAULT FALSE,
  "routes"              JSONB,
  "created_by"          TEXT NOT NULL,
  "created_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "med_protocols_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "med_protocols_organization_id_code_key"
  ON "med_protocols"("organization_id", "code") WHERE "code" IS NOT NULL;
CREATE INDEX "med_protocols_organization_id_active_idx"
  ON "med_protocols"("organization_id", "active");

CREATE TABLE "med_administration_records" (
  "id"                    TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "organization_id"       TEXT NOT NULL,
  "patient_id"            TEXT NOT NULL,
  "prescription_ref"      TEXT,
  "protocol_id"           TEXT,
  "appointment_id"        TEXT,
  "room_booking_id"       TEXT,
  "medication_name"       TEXT NOT NULL,
  "medication_code"       TEXT,
  "dose"                  NUMERIC(15,4) NOT NULL,
  "dose_unit"             TEXT NOT NULL,
  "route"                 "MedRouteType" NOT NULL,
  "lot_number"            TEXT,
  "expiry_date"           TIMESTAMP(3),
  "scheduled_at"          TIMESTAMP(3) NOT NULL,
  "prepared_at"           TIMESTAMP(3),
  "administered_at"       TIMESTAMP(3),
  "status"                "MedRecordStatus" NOT NULL DEFAULT 'RESERVADO',
  "patient_1st_id"        TEXT,
  "patient_2nd_id"        TEXT,
  "identified_by"         TEXT,
  "prepared_by"           TEXT,
  "administered_by"       TEXT,
  "returned_by"           TEXT,
  "returned_at"           TIMESTAMP(3),
  "waste_reason"          TEXT,
  "notes"                 TEXT,
  "infusion_rate_ml"      NUMERIC(15,4),
  "infusion_duration_min" INTEGER,
  "is_controlled"         BOOLEAN NOT NULL DEFAULT FALSE,
  "is_high_alert"         BOOLEAN NOT NULL DEFAULT FALSE,
  "created_by"            TEXT NOT NULL,
  "created_at"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "med_administration_records_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "med_administration_records_protocol_id_fkey"
    FOREIGN KEY ("protocol_id") REFERENCES "med_protocols"("id")
);

CREATE INDEX "mar_org_patient_idx"
  ON "med_administration_records"("organization_id", "patient_id");
CREATE INDEX "mar_org_status_idx"
  ON "med_administration_records"("organization_id", "status");
CREATE INDEX "mar_org_scheduled_idx"
  ON "med_administration_records"("organization_id", "scheduled_at");
CREATE INDEX "mar_lot_number_idx"
  ON "med_administration_records"("lot_number") WHERE "lot_number" IS NOT NULL;

CREATE TABLE "med_verifications" (
  "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "record_id"   TEXT NOT NULL,
  "verified_by" TEXT NOT NULL,
  "verified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "role"        TEXT NOT NULL DEFAULT 'VERIFICADOR_1',
  "check_items" JSONB,
  "notes"       TEXT,
  CONSTRAINT "med_verifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "med_verifications_record_id_fkey"
    FOREIGN KEY ("record_id") REFERENCES "med_administration_records"("id"),
  CONSTRAINT "med_verifications_record_id_role_key" UNIQUE ("record_id", "role")
);

CREATE INDEX "med_verifications_record_id_idx"
  ON "med_verifications"("record_id");

CREATE TABLE "med_adverse_reactions" (
  "id"               TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "organization_id"  TEXT NOT NULL,
  "record_id"        TEXT,
  "patient_id"       TEXT NOT NULL,
  "medication_name"  TEXT NOT NULL,
  "reaction_desc"    TEXT NOT NULL,
  "severity"         "MedAdverseReactionSeverity" NOT NULL DEFAULT 'LEVE',
  "onset_at"         TIMESTAMP(3) NOT NULL,
  "resolved_at"      TIMESTAMP(3),
  "treatment"        TEXT,
  "reported_by"      TEXT NOT NULL,
  "reported_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "notified_quality" BOOLEAN NOT NULL DEFAULT FALSE,
  "notes"            TEXT,
  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "med_adverse_reactions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "med_adverse_reactions_record_id_fkey"
    FOREIGN KEY ("record_id") REFERENCES "med_administration_records"("id")
);

CREATE INDEX "med_ar_org_patient_idx"
  ON "med_adverse_reactions"("organization_id", "patient_id");
CREATE INDEX "med_ar_org_severity_idx"
  ON "med_adverse_reactions"("organization_id", "severity");

CREATE TABLE "med_lot_alerts" (
  "id"               TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "organization_id"  TEXT NOT NULL,
  "lot_number"       TEXT NOT NULL,
  "medication_name"  TEXT NOT NULL,
  "medication_code"  TEXT,
  "alert_type"       "MedLotAlertType" NOT NULL,
  "reason"           TEXT NOT NULL,
  "blocked_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "blocked_by"       TEXT NOT NULL,
  "resolved_at"      TIMESTAMP(3),
  "resolved_by"      TEXT,
  "resolution_notes" TEXT,
  "active"           BOOLEAN NOT NULL DEFAULT TRUE,
  "affected_records" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "med_lot_alerts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "med_lot_alerts_org_active_idx"
  ON "med_lot_alerts"("organization_id", "active");
CREATE INDEX "med_lot_alerts_lot_number_idx"
  ON "med_lot_alerts"("lot_number");

CREATE TABLE "med_record_audits" (
  "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "record_id"   TEXT NOT NULL,
  "action"      TEXT NOT NULL,
  "field_name"  TEXT,
  "old_value"   TEXT,
  "new_value"   TEXT,
  "reason"      TEXT,
  "changed_by"  TEXT NOT NULL,
  "changed_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "med_record_audits_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "med_record_audits_record_id_fkey"
    FOREIGN KEY ("record_id") REFERENCES "med_administration_records"("id")
);

CREATE INDEX "med_record_audits_record_id_changed_at_idx"
  ON "med_record_audits"("record_id", "changed_at");

-- ============================================================
-- M15 QUA — Qualidade e Segurança do Paciente
-- ============================================================

CREATE TYPE "QualityIncidentStatus" AS ENUM (
  'ABERTO',
  'EM_ANALISE',
  'EM_ACAO',
  'ENCERRADO',
  'CANCELADO'
);

CREATE TYPE "QualityIncidentType" AS ENUM (
  'QUASE_FALHA',
  'INCIDENTE_SEM_DANO',
  'INCIDENTE_COM_DANO',
  'EVENTO_SENTINELA'
);

CREATE TYPE "QualityActionStatus" AS ENUM (
  'PENDENTE',
  'EM_ANDAMENTO',
  'CONCLUIDA',
  'VERIFICADA',
  'CANCELADA'
);

CREATE TYPE "QualityProtocolStatus" AS ENUM (
  'RASCUNHO',
  'VIGENTE',
  'ARQUIVADO'
);

CREATE TABLE "quality_incidents" (
  "id"                     TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "organization_id"        TEXT NOT NULL,
  "unit_id"                TEXT,
  "incident_type"          "QualityIncidentType" NOT NULL,
  "status"                 "QualityIncidentStatus" NOT NULL DEFAULT 'ABERTO',
  "title"                  TEXT NOT NULL,
  "description"            TEXT NOT NULL,
  "occurred_at"            TIMESTAMP(3) NOT NULL,
  "location"               TEXT,
  "patient_id"             TEXT,
  "is_anonymous"           BOOLEAN NOT NULL DEFAULT FALSE,
  "reported_by"            TEXT,
  "reported_at"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "risk_classification"    TEXT,
  "root_cause"             TEXT,
  "contributing_factors"   JSONB,
  "immediate_actions"      TEXT,
  "analysis_by"            TEXT,
  "analysis_at"            TIMESTAMP(3),
  "closed_by"              TEXT,
  "closed_at"              TIMESTAMP(3),
  "notify_regulatory"      BOOLEAN NOT NULL DEFAULT FALSE,
  "regulatory_notified_at" TIMESTAMP(3),
  "regulatory_notified_by" TEXT,
  "notes"                  TEXT,
  "created_at"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "quality_incidents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "quality_incidents_org_status_idx"
  ON "quality_incidents"("organization_id", "status");
CREATE INDEX "quality_incidents_org_type_idx"
  ON "quality_incidents"("organization_id", "incident_type");
CREATE INDEX "quality_incidents_org_occurred_idx"
  ON "quality_incidents"("organization_id", "occurred_at");

CREATE TABLE "quality_incident_addenda" (
  "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "incident_id" TEXT NOT NULL,
  "content"     TEXT NOT NULL,
  "added_by"    TEXT NOT NULL,
  "added_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "quality_incident_addenda_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "quality_incident_addenda_incident_id_fkey"
    FOREIGN KEY ("incident_id") REFERENCES "quality_incidents"("id")
);

CREATE INDEX "quality_incident_addenda_incident_id_idx"
  ON "quality_incident_addenda"("incident_id");

CREATE TABLE "quality_action_plans" (
  "id"               TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "organization_id"  TEXT NOT NULL,
  "incident_id"      TEXT,
  "title"            TEXT NOT NULL,
  "description"      TEXT NOT NULL,
  "action_type"      TEXT NOT NULL DEFAULT 'CORRETIVA',
  "status"           "QualityActionStatus" NOT NULL DEFAULT 'PENDENTE',
  "responsible_id"   TEXT NOT NULL,
  "due_date"         TIMESTAMP(3) NOT NULL,
  "started_at"       TIMESTAMP(3),
  "completed_at"     TIMESTAMP(3),
  "evidence"         TEXT,
  "verified_by"      TEXT,
  "verified_at"      TIMESTAMP(3),
  "verification_note" TEXT,
  "created_by"       TEXT NOT NULL,
  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "quality_action_plans_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "quality_action_plans_incident_id_fkey"
    FOREIGN KEY ("incident_id") REFERENCES "quality_incidents"("id")
);

CREATE INDEX "quality_action_plans_org_status_idx"
  ON "quality_action_plans"("organization_id", "status");
CREATE INDEX "quality_action_plans_incident_id_idx"
  ON "quality_action_plans"("incident_id");

CREATE TABLE "quality_protocols" (
  "id"               TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "organization_id"  TEXT NOT NULL,
  "code"             TEXT,
  "title"            TEXT NOT NULL,
  "category"         TEXT,
  "version"          TEXT NOT NULL DEFAULT '1.0',
  "status"           "QualityProtocolStatus" NOT NULL DEFAULT 'RASCUNHO',
  "content"          TEXT NOT NULL,
  "approved_by"      TEXT,
  "approved_at"      TIMESTAMP(3),
  "effective_from"   TIMESTAMP(3),
  "effective_to"     TIMESTAMP(3),
  "policy_owner"     TEXT,
  "next_review_date" TIMESTAMP(3),
  "created_by"       TEXT NOT NULL,
  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "quality_protocols_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "quality_protocols_org_status_idx"
  ON "quality_protocols"("organization_id", "status");
CREATE INDEX "quality_protocols_org_category_idx"
  ON "quality_protocols"("organization_id", "category");

CREATE TABLE "quality_indicators" (
  "id"               TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "organization_id"  TEXT NOT NULL,
  "name"             TEXT NOT NULL,
  "code"             TEXT,
  "formula"          TEXT,
  "unit"             TEXT,
  "target_value"     NUMERIC(15,4),
  "active"           BOOLEAN NOT NULL DEFAULT TRUE,
  "created_by"       TEXT NOT NULL,
  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "quality_indicators_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "quality_indicators_org_active_idx"
  ON "quality_indicators"("organization_id", "active");

CREATE TABLE "quality_indicator_measurements" (
  "id"            TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "indicator_id"  TEXT NOT NULL,
  "period_start"  TIMESTAMP(3) NOT NULL,
  "period_end"    TIMESTAMP(3) NOT NULL,
  "value"         NUMERIC(15,4) NOT NULL,
  "notes"         TEXT,
  "recorded_by"   TEXT NOT NULL,
  "recorded_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "quality_indicator_measurements_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "quality_indicator_measurements_indicator_id_fkey"
    FOREIGN KEY ("indicator_id") REFERENCES "quality_indicators"("id")
);

CREATE INDEX "quality_indicator_measurements_indicator_period_idx"
  ON "quality_indicator_measurements"("indicator_id", "period_start");

-- ============================================================
-- M16 ATI — Ativos, Manutenção, Esterilização e Cadeia do Frio
-- ============================================================

CREATE TYPE "AssetStatus" AS ENUM (
  'DISPONIVEL',
  'EM_USO',
  'EM_MANUTENCAO',
  'BLOQUEADO',
  'DESCARTADO',
  'CEDIDO'
);

CREATE TYPE "AssetMaintenanceStatus" AS ENUM (
  'SOLICITADA',
  'APROVADA',
  'EM_EXECUCAO',
  'CONCLUIDA',
  'CANCELADA'
);

CREATE TYPE "AssetMaintenanceType" AS ENUM (
  'PREVENTIVA',
  'CORRETIVA',
  'CALIBRACAO',
  'INSPECAO',
  'LIMPEZA'
);

CREATE TABLE "assets" (
  "id"                     TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "organization_id"        TEXT NOT NULL,
  "unit_id"                TEXT,
  "tag"                    TEXT,
  "name"                   TEXT NOT NULL,
  "category"               TEXT,
  "manufacturer"           TEXT,
  "model"                  TEXT,
  "serial_number"          TEXT,
  "acquisition_date"       TIMESTAMP(3),
  "acquisition_value"      NUMERIC(15,2),
  "status"                 "AssetStatus" NOT NULL DEFAULT 'DISPONIVEL',
  "location"               TEXT,
  "requires_calibration"   BOOLEAN NOT NULL DEFAULT FALSE,
  "calibration_period_days" INTEGER,
  "last_calibrated_at"     TIMESTAMP(3),
  "next_calibration_at"    TIMESTAMP(3),
  "requires_sterilization" BOOLEAN NOT NULL DEFAULT FALSE,
  "requires_cold_chain"    BOOLEAN NOT NULL DEFAULT FALSE,
  "min_temp_c"             NUMERIC(5,2),
  "max_temp_c"             NUMERIC(5,2),
  "notes"                  TEXT,
  "blocked_reason"         TEXT,
  "blocked_at"             TIMESTAMP(3),
  "blocked_by"             TEXT,
  "active"                 BOOLEAN NOT NULL DEFAULT TRUE,
  "created_by"             TEXT NOT NULL,
  "created_at"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "assets_organization_id_tag_key"
  ON "assets"("organization_id", "tag") WHERE "tag" IS NOT NULL;
CREATE INDEX "assets_org_status_idx"
  ON "assets"("organization_id", "status");
CREATE INDEX "assets_org_category_idx"
  ON "assets"("organization_id", "category");

CREATE TABLE "asset_maintenance_orders" (
  "id"               TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "organization_id"  TEXT NOT NULL,
  "asset_id"         TEXT NOT NULL,
  "maintenance_type" "AssetMaintenanceType" NOT NULL,
  "status"           "AssetMaintenanceStatus" NOT NULL DEFAULT 'SOLICITADA',
  "title"            TEXT NOT NULL,
  "description"      TEXT,
  "requested_by"     TEXT NOT NULL,
  "requested_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approved_by"      TEXT,
  "approved_at"      TIMESTAMP(3),
  "scheduled_at"     TIMESTAMP(3),
  "started_at"       TIMESTAMP(3),
  "completed_at"     TIMESTAMP(3),
  "executed_by"      TEXT,
  "cost"             NUMERIC(15,2),
  "findings"         TEXT,
  "next_due_at"      TIMESTAMP(3),
  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "asset_maintenance_orders_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "asset_maintenance_orders_asset_id_fkey"
    FOREIGN KEY ("asset_id") REFERENCES "assets"("id")
);

CREATE INDEX "asset_maintenance_orders_org_asset_idx"
  ON "asset_maintenance_orders"("organization_id", "asset_id");
CREATE INDEX "asset_maintenance_orders_org_status_idx"
  ON "asset_maintenance_orders"("organization_id", "status");

CREATE TABLE "asset_sterilization_cycles" (
  "id"               TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "organization_id"  TEXT NOT NULL,
  "asset_id"         TEXT NOT NULL,
  "cycle_number"     TEXT,
  "method"           TEXT NOT NULL,
  "process_start"    TIMESTAMP(3) NOT NULL,
  "process_end"      TIMESTAMP(3),
  "temperature"      NUMERIC(5,2),
  "pressure"         NUMERIC(8,3),
  "passed"           BOOLEAN,
  "batch_items"      JSONB,
  "operator_id"      TEXT NOT NULL,
  "validated_by"     TEXT,
  "validated_at"     TIMESTAMP(3),
  "notes"            TEXT,
  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "asset_sterilization_cycles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "asset_sterilization_cycles_asset_id_fkey"
    FOREIGN KEY ("asset_id") REFERENCES "assets"("id")
);

CREATE INDEX "asset_sterilization_cycles_org_asset_idx"
  ON "asset_sterilization_cycles"("organization_id", "asset_id");
CREATE INDEX "asset_sterilization_cycles_org_process_start_idx"
  ON "asset_sterilization_cycles"("organization_id", "process_start");

CREATE TABLE "asset_cold_chain_logs" (
  "id"               TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "organization_id"  TEXT NOT NULL,
  "asset_id"         TEXT NOT NULL,
  "reading_at"       TIMESTAMP(3) NOT NULL,
  "temperature_c"    NUMERIC(5,2) NOT NULL,
  "humidity_pct"     NUMERIC(5,2),
  "source"           TEXT NOT NULL DEFAULT 'MANUAL',
  "recorded_by"      TEXT,
  "is_excursion"     BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT "asset_cold_chain_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "asset_cold_chain_logs_asset_id_fkey"
    FOREIGN KEY ("asset_id") REFERENCES "assets"("id")
);

CREATE INDEX "asset_cold_chain_logs_org_asset_reading_idx"
  ON "asset_cold_chain_logs"("organization_id", "asset_id", "reading_at");

CREATE TABLE "asset_cold_chain_excursions" (
  "id"               TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "organization_id"  TEXT NOT NULL,
  "asset_id"         TEXT NOT NULL,
  "started_at"       TIMESTAMP(3) NOT NULL,
  "ended_at"         TIMESTAMP(3),
  "min_temp_c"       NUMERIC(5,2),
  "max_temp_c"       NUMERIC(5,2),
  "affected_items"   JSONB,
  "assessment"       TEXT,
  "decision"         TEXT,
  "decided_by"       TEXT,
  "decided_at"       TIMESTAMP(3),
  "notified_quality" BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "asset_cold_chain_excursions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "asset_cold_chain_excursions_org_asset_idx"
  ON "asset_cold_chain_excursions"("organization_id", "asset_id");
CREATE INDEX "asset_cold_chain_excursions_org_started_idx"
  ON "asset_cold_chain_excursions"("organization_id", "started_at");

-- ============================================================
-- M17 EQP — Equipe, Escalas e Credenciais
-- ============================================================

CREATE TYPE "CredentialStatus" AS ENUM (
  'ATIVA',
  'VENCIDA',
  'SUSPENSA',
  'CANCELADA'
);

CREATE TYPE "WorkShiftStatus" AS ENUM (
  'AGENDADO',
  'EM_ANDAMENTO',
  'CONCLUIDO',
  'CANCELADO',
  'FALTA',
  'SUBSTITUIDO'
);

CREATE TABLE "eqp_credentials" (
  "id"               TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "organization_id"  TEXT NOT NULL,
  "professional_id"  TEXT NOT NULL,
  "credential_type"  TEXT NOT NULL,
  "number"           TEXT,
  "issuing_body"     TEXT,
  "issued_at"        TIMESTAMP(3),
  "expires_at"       TIMESTAMP(3),
  "status"           "CredentialStatus" NOT NULL DEFAULT 'ATIVA',
  "scope"            TEXT,
  "document_url"     TEXT,
  "verified_by"      TEXT,
  "verified_at"      TIMESTAMP(3),
  "notes"            TEXT,
  "created_by"       TEXT NOT NULL,
  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "eqp_credentials_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "eqp_credentials_org_prof_idx"
  ON "eqp_credentials"("organization_id", "professional_id");
CREATE INDEX "eqp_credentials_org_type_status_idx"
  ON "eqp_credentials"("organization_id", "credential_type", "status");

CREATE TABLE "work_schedules" (
  "id"               TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "organization_id"  TEXT NOT NULL,
  "unit_id"          TEXT,
  "name"             TEXT NOT NULL,
  "description"      TEXT,
  "start_date"       TIMESTAMP(3) NOT NULL,
  "end_date"         TIMESTAMP(3),
  "active"           BOOLEAN NOT NULL DEFAULT TRUE,
  "created_by"       TEXT NOT NULL,
  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "work_schedules_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "work_schedules_org_active_idx"
  ON "work_schedules"("organization_id", "active");

CREATE TABLE "work_shifts" (
  "id"               TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "schedule_id"      TEXT NOT NULL,
  "organization_id"  TEXT NOT NULL,
  "professional_id"  TEXT NOT NULL,
  "role"             TEXT,
  "shift_start"      TIMESTAMP(3) NOT NULL,
  "shift_end"        TIMESTAMP(3) NOT NULL,
  "break_minutes"    INTEGER NOT NULL DEFAULT 0,
  "status"           "WorkShiftStatus" NOT NULL DEFAULT 'AGENDADO',
  "actual_start"     TIMESTAMP(3),
  "actual_end"       TIMESTAMP(3),
  "substitute_id"    TEXT,
  "cancel_reason"    TEXT,
  "notified"         BOOLEAN NOT NULL DEFAULT FALSE,
  "created_by"       TEXT NOT NULL,
  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "work_shifts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "work_shifts_schedule_id_fkey"
    FOREIGN KEY ("schedule_id") REFERENCES "work_schedules"("id")
);

CREATE INDEX "work_shifts_schedule_professional_idx"
  ON "work_shifts"("schedule_id", "professional_id");
CREATE INDEX "work_shifts_org_shift_start_idx"
  ON "work_shifts"("organization_id", "shift_start");
CREATE INDEX "work_shifts_org_professional_shift_start_idx"
  ON "work_shifts"("organization_id", "professional_id", "shift_start");

CREATE TABLE "work_shift_audits" (
  "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "shift_id"    TEXT NOT NULL,
  "action"      TEXT NOT NULL,
  "old_status"  TEXT,
  "new_status"  TEXT,
  "changed_by"  TEXT NOT NULL,
  "reason"      TEXT,
  "changed_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "work_shift_audits_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "work_shift_audits_shift_id_fkey"
    FOREIGN KEY ("shift_id") REFERENCES "work_shifts"("id")
);

CREATE INDEX "work_shift_audits_shift_id_idx"
  ON "work_shift_audits"("shift_id");

CREATE TABLE "team_competencies" (
  "id"               TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "organization_id"  TEXT NOT NULL,
  "professional_id"  TEXT NOT NULL,
  "competency_name"  TEXT NOT NULL,
  "competency_code"  TEXT,
  "level"            TEXT,
  "certified_at"     TIMESTAMP(3),
  "certified_by"     TEXT,
  "expires_at"       TIMESTAMP(3),
  "active"           BOOLEAN NOT NULL DEFAULT TRUE,
  "created_by"       TEXT NOT NULL,
  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "team_competencies_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "team_competencies_org_professional_idx"
  ON "team_competencies"("organization_id", "professional_id");
CREATE INDEX "team_competencies_org_name_idx"
  ON "team_competencies"("organization_id", "competency_name");
