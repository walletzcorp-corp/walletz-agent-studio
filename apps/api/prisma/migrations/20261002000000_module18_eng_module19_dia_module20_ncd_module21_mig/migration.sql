-- M18 ENG — Engajamento, Referência e Reputação
-- M19 DIA — Laboratório e Diagnóstico por Imagem
-- M20 NCD — Studio No-code e Automação
-- M21 MIG — Migração, Onboarding e Suporte

-- ─── M18 ENG ──────────────────────────────────────────────────────────────────

CREATE TYPE "EngReferralStatus" AS ENUM (
  'ENVIADO',
  'ACEITO',
  'EM_ATENDIMENTO',
  'CONCLUIDO',
  'REJEITADO',
  'CANCELADO'
);

CREATE TYPE "EngReferralPriority" AS ENUM (
  'ELETIVA',
  'URGENTE',
  'EMERGENCIA'
);

CREATE TYPE "EngReviewStatus" AS ENUM (
  'PENDENTE',
  'PUBLICADO',
  'REJEITADO',
  'ARQUIVADO'
);

CREATE TYPE "EngCampaignType" AS ENUM (
  'EDUCATIVO',
  'ASSISTENCIAL',
  'COMERCIAL'
);

CREATE TYPE "EngSurveyStage" AS ENUM (
  'POS_AGENDAMENTO',
  'POS_ATENDIMENTO',
  'POS_ALTA',
  'POS_EXAME',
  'CUSTOMIZADO'
);

CREATE TABLE "eng_public_profiles" (
  "id"              TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "organization_id" TEXT NOT NULL,
  "slug"            TEXT NOT NULL,
  "display_name"    TEXT NOT NULL,
  "description"     TEXT,
  "active"          BOOLEAN NOT NULL DEFAULT true,
  "config"          JSONB NOT NULL DEFAULT '{}',
  "created_by"      TEXT NOT NULL,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "eng_public_profiles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "eng_public_profiles_org_slug_key" UNIQUE ("organization_id", "slug")
);
CREATE INDEX "eng_public_profiles_org_idx" ON "eng_public_profiles"("organization_id");

CREATE TABLE "eng_referrals" (
  "id"               TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "organization_id"  TEXT NOT NULL,
  "patient_id"       TEXT NOT NULL,
  "origin_prof_id"   TEXT NOT NULL,
  "dest_org_id"      TEXT,
  "dest_prof_id"     TEXT,
  "dest_partner_id"  TEXT,
  "reason"           TEXT NOT NULL,
  "priority"         "EngReferralPriority" NOT NULL DEFAULT 'ELETIVA',
  "status"           "EngReferralStatus" NOT NULL DEFAULT 'ENVIADO',
  "accepted_at"      TIMESTAMPTZ,
  "attended_at"      TIMESTAMPTZ,
  "closed_at"        TIMESTAMPTZ,
  "notes"            TEXT,
  "created_by"       TEXT NOT NULL,
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "eng_referrals_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "eng_referrals_org_patient_idx" ON "eng_referrals"("organization_id", "patient_id");
CREATE INDEX "eng_referrals_org_status_idx" ON "eng_referrals"("organization_id", "status");

CREATE TABLE "eng_reviews" (
  "id"               TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "organization_id"  TEXT NOT NULL,
  "patient_id"       TEXT NOT NULL,
  "appointment_id"   TEXT,
  "rating"           INTEGER NOT NULL,
  "comment"          TEXT,
  "status"           "EngReviewStatus" NOT NULL DEFAULT 'PENDENTE',
  "response_text"    TEXT,
  "responded_by"     TEXT,
  "responded_at"     TIMESTAMPTZ,
  "approved_by"      TEXT,
  "approved_at"      TIMESTAMPTZ,
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "eng_reviews_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "eng_reviews_org_status_idx" ON "eng_reviews"("organization_id", "status");
CREATE INDEX "eng_reviews_org_patient_idx" ON "eng_reviews"("organization_id", "patient_id");

CREATE TABLE "eng_partners" (
  "id"               TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "organization_id"  TEXT NOT NULL,
  "partner_name"     TEXT NOT NULL,
  "partner_type"     TEXT NOT NULL,
  "specialty"        TEXT,
  "contact"          JSONB NOT NULL DEFAULT '{}',
  "verified"         BOOLEAN NOT NULL DEFAULT false,
  "verified_by"      TEXT,
  "verified_at"      TIMESTAMPTZ,
  "active"           BOOLEAN NOT NULL DEFAULT true,
  "created_by"       TEXT NOT NULL,
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "eng_partners_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "eng_partners_org_active_idx" ON "eng_partners"("organization_id", "active");

CREATE TABLE "eng_campaigns" (
  "id"               TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "organization_id"  TEXT NOT NULL,
  "title"            TEXT NOT NULL,
  "campaign_type"    "EngCampaignType" NOT NULL,
  "content"          TEXT NOT NULL,
  "scheduled_at"     TIMESTAMPTZ,
  "sent_at"          TIMESTAMPTZ,
  "target_count"     INTEGER NOT NULL DEFAULT 0,
  "sent_count"       INTEGER NOT NULL DEFAULT 0,
  "active"           BOOLEAN NOT NULL DEFAULT true,
  "created_by"       TEXT NOT NULL,
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "eng_campaigns_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "eng_campaigns_org_type_idx" ON "eng_campaigns"("organization_id", "campaign_type");

CREATE TABLE "eng_surveys" (
  "id"               TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "organization_id"  TEXT NOT NULL,
  "patient_id"       TEXT NOT NULL,
  "appointment_id"   TEXT,
  "stage"            "EngSurveyStage" NOT NULL,
  "questions"        JSONB NOT NULL DEFAULT '[]',
  "answers"          JSONB DEFAULT '[]',
  "completed_at"     TIMESTAMPTZ,
  "nps_score"        INTEGER,
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "eng_surveys_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "eng_surveys_org_stage_idx" ON "eng_surveys"("organization_id", "stage");
CREATE INDEX "eng_surveys_org_patient_idx" ON "eng_surveys"("organization_id", "patient_id");

-- ─── M19 DIA ──────────────────────────────────────────────────────────────────

CREATE TYPE "DiaOrderStatus" AS ENUM (
  'SOLICITADO',
  'AGUARDANDO_AUTORIZACAO',
  'AUTORIZADO',
  'AGENDADO',
  'COLETADO',
  'EM_PROCESSAMENTO',
  'RESULTADO_DISPONIVEL',
  'ENTREGUE',
  'CANCELADO'
);

CREATE TYPE "DiaSampleStatus" AS ENUM (
  'RECEBIDA',
  'EM_PROCESSAMENTO',
  'PROCESSADA',
  'REJEITADA',
  'RECOLETADA'
);

CREATE TYPE "DiaResultStatus" AS ENUM (
  'RASCUNHO',
  'REVISAO',
  'LIBERADO',
  'RETIFICADO'
);

CREATE TABLE "dia_orders" (
  "id"                TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "organization_id"   TEXT NOT NULL,
  "patient_id"        TEXT NOT NULL,
  "appointment_id"    TEXT,
  "requested_by"      TEXT NOT NULL,
  "exam_code"         TEXT NOT NULL,
  "exam_name"         TEXT NOT NULL,
  "exam_type"         TEXT NOT NULL,
  "prep_instructions" TEXT,
  "authorization_id"  TEXT,
  "status"            "DiaOrderStatus" NOT NULL DEFAULT 'SOLICITADO',
  "scheduled_at"      TIMESTAMPTZ,
  "notes"             TEXT,
  "created_by"        TEXT NOT NULL,
  "created_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "dia_orders_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "dia_orders_org_patient_idx" ON "dia_orders"("organization_id", "patient_id");
CREATE INDEX "dia_orders_org_status_idx" ON "dia_orders"("organization_id", "status");

CREATE TABLE "dia_samples" (
  "id"                TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "organization_id"   TEXT NOT NULL,
  "order_id"          TEXT NOT NULL,
  "barcode"           TEXT NOT NULL,
  "sample_type"       TEXT NOT NULL,
  "collected_at"      TIMESTAMPTZ,
  "collected_by"      TEXT,
  "status"            "DiaSampleStatus" NOT NULL DEFAULT 'RECEBIDA',
  "rejection_reason"  TEXT,
  "rejected_by"       TEXT,
  "rejected_at"       TIMESTAMPTZ,
  "parent_sample_id"  TEXT,
  "created_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "dia_samples_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "dia_samples_org_barcode_key" UNIQUE ("organization_id", "barcode"),
  CONSTRAINT "dia_samples_order_fk" FOREIGN KEY ("order_id") REFERENCES "dia_orders"("id")
);
CREATE INDEX "dia_samples_order_idx" ON "dia_samples"("order_id");

CREATE TABLE "dia_results" (
  "id"                  TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "organization_id"     TEXT NOT NULL,
  "order_id"            TEXT NOT NULL,
  "version"             INTEGER NOT NULL DEFAULT 1,
  "status"              "DiaResultStatus" NOT NULL DEFAULT 'RASCUNHO',
  "result_data"         JSONB NOT NULL,
  "is_critical"         BOOLEAN NOT NULL DEFAULT false,
  "critical_acked_by"   TEXT,
  "critical_acked_at"   TIMESTAMPTZ,
  "released_by"         TEXT,
  "released_at"         TIMESTAMPTZ,
  "rectified_by"        TEXT,
  "rectified_at"        TIMESTAMPTZ,
  "rectification_note"  TEXT,
  "delivered_at"        TIMESTAMPTZ,
  "created_by"          TEXT NOT NULL,
  "created_at"          TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "dia_results_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "dia_results_order_fk" FOREIGN KEY ("order_id") REFERENCES "dia_orders"("id")
);
CREATE INDEX "dia_results_order_idx" ON "dia_results"("order_id");
CREATE INDEX "dia_results_org_critical_idx" ON "dia_results"("organization_id", "is_critical");

CREATE TABLE "dia_work_items" (
  "id"               TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "organization_id"  TEXT NOT NULL,
  "order_id"         TEXT NOT NULL,
  "assigned_to"      TEXT,
  "equipment_id"     TEXT,
  "priority"         TEXT NOT NULL DEFAULT 'NORMAL',
  "scheduled_at"     TIMESTAMPTZ,
  "started_at"       TIMESTAMPTZ,
  "completed_at"     TIMESTAMPTZ,
  "notes"            TEXT,
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "dia_work_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "dia_work_items_org_assigned_idx" ON "dia_work_items"("organization_id", "assigned_to");

-- ─── M20 NCD ──────────────────────────────────────────────────────────────────

CREATE TYPE "NcdTemplateType" AS ENUM (
  'FORMULARIO',
  'PROTOCOLO',
  'CHECKLIST',
  'JORNADA'
);

CREATE TYPE "NcdVersionStatus" AS ENUM (
  'RASCUNHO',
  'AGUARDANDO_APROVACAO',
  'PUBLICADO',
  'RETIRADO'
);

CREATE TYPE "NcdAutomationStatus" AS ENUM (
  'ATIVO',
  'INATIVO',
  'ERRO',
  'PAUSADO'
);

CREATE TABLE "ncd_templates" (
  "id"                  TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "organization_id"     TEXT NOT NULL,
  "name"                TEXT NOT NULL,
  "template_type"       "NcdTemplateType" NOT NULL,
  "specialty"           TEXT,
  "description"         TEXT,
  "is_library_model"    BOOLEAN NOT NULL DEFAULT false,
  "current_version_id"  TEXT,
  "created_by"          TEXT NOT NULL,
  "created_at"          TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "ncd_templates_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ncd_templates_org_type_idx" ON "ncd_templates"("organization_id", "template_type");

CREATE TABLE "ncd_versions" (
  "id"              TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "organization_id" TEXT NOT NULL,
  "template_id"     TEXT NOT NULL,
  "version_number"  INTEGER NOT NULL,
  "status"          "NcdVersionStatus" NOT NULL DEFAULT 'RASCUNHO',
  "schema"          JSONB NOT NULL,
  "rules"           JSONB NOT NULL DEFAULT '[]',
  "allowed_roles"   JSONB NOT NULL DEFAULT '[]',
  "approved_by"     TEXT,
  "approved_at"     TIMESTAMPTZ,
  "published_at"    TIMESTAMPTZ,
  "retired_at"      TIMESTAMPTZ,
  "retired_by"      TEXT,
  "change_notes"    TEXT,
  "created_by"      TEXT NOT NULL,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "ncd_versions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ncd_versions_template_ver_key" UNIQUE ("template_id", "version_number"),
  CONSTRAINT "ncd_versions_template_fk" FOREIGN KEY ("template_id") REFERENCES "ncd_templates"("id")
);
CREATE INDEX "ncd_versions_org_status_idx" ON "ncd_versions"("organization_id", "status");

CREATE TABLE "ncd_automations" (
  "id"               TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "organization_id"  TEXT NOT NULL,
  "template_id"      TEXT,
  "name"             TEXT NOT NULL,
  "trigger_event"    TEXT NOT NULL,
  "conditions"       JSONB NOT NULL DEFAULT '[]',
  "actions"          JSONB NOT NULL DEFAULT '[]',
  "status"           "NcdAutomationStatus" NOT NULL DEFAULT 'ATIVO',
  "max_executions"   INTEGER,
  "execution_count"  INTEGER NOT NULL DEFAULT 0,
  "last_error"       TEXT,
  "last_run_at"      TIMESTAMPTZ,
  "created_by"       TEXT NOT NULL,
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "ncd_automations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ncd_automations_template_fk" FOREIGN KEY ("template_id") REFERENCES "ncd_templates"("id")
);
CREATE INDEX "ncd_automations_org_status_idx" ON "ncd_automations"("organization_id", "status");

CREATE TABLE "ncd_simulations" (
  "id"               TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "organization_id"  TEXT NOT NULL,
  "version_id"       TEXT NOT NULL,
  "input_data"       JSONB NOT NULL,
  "output_data"      JSONB,
  "passed"           BOOLEAN NOT NULL DEFAULT false,
  "run_by"           TEXT NOT NULL,
  "run_at"           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "ncd_simulations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ncd_simulations_org_ver_idx" ON "ncd_simulations"("organization_id", "version_id");

-- ─── M21 MIG ──────────────────────────────────────────────────────────────────

CREATE TYPE "MigJobStatus" AS ENUM (
  'RASCUNHO',
  'VALIDANDO',
  'VALIDADO',
  'PILOTO',
  'APROVADO',
  'EXECUTANDO',
  'CONCLUIDO',
  'REVERTIDO',
  'CANCELADO'
);

CREATE TYPE "MigTicketStatus" AS ENUM (
  'ABERTO',
  'EM_ATENDIMENTO',
  'AGUARDANDO_CLIENTE',
  'RESOLVIDO',
  'FECHADO'
);

CREATE TYPE "MigTicketPriority" AS ENUM (
  'BAIXA',
  'MEDIA',
  'ALTA',
  'CRITICA'
);

CREATE TABLE "mig_jobs" (
  "id"                  TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "organization_id"     TEXT NOT NULL,
  "name"                TEXT NOT NULL,
  "source_format"       TEXT NOT NULL,
  "target_module"       TEXT NOT NULL,
  "mapping"             JSONB NOT NULL DEFAULT '{}',
  "status"              "MigJobStatus" NOT NULL DEFAULT 'RASCUNHO',
  "total_rows"          INTEGER NOT NULL DEFAULT 0,
  "valid_rows"          INTEGER NOT NULL DEFAULT 0,
  "rejected_rows"       INTEGER NOT NULL DEFAULT 0,
  "duplicate_rows"      INTEGER NOT NULL DEFAULT 0,
  "input_hash"          TEXT,
  "rejection_report"    JSONB,
  "approved_by"         TEXT,
  "approved_at"         TIMESTAMPTZ,
  "formal_accepted_at"  TIMESTAMPTZ,
  "rollback_available"  BOOLEAN NOT NULL DEFAULT false,
  "notes"               TEXT,
  "created_by"          TEXT NOT NULL,
  "created_at"          TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "mig_jobs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "mig_jobs_org_status_idx" ON "mig_jobs"("organization_id", "status");

CREATE TABLE "mig_health_scores" (
  "id"                  TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "organization_id"     TEXT NOT NULL,
  "score_date"          DATE NOT NULL,
  "implantation_score"  INTEGER NOT NULL DEFAULT 0,
  "adoption_score"      INTEGER NOT NULL DEFAULT 0,
  "security_score"      INTEGER NOT NULL DEFAULT 0,
  "operation_score"     INTEGER NOT NULL DEFAULT 0,
  "overall_score"       INTEGER NOT NULL DEFAULT 0,
  "criteria"            JSONB NOT NULL DEFAULT '{}',
  "calculated_by"       TEXT NOT NULL,
  "created_at"          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "mig_health_scores_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "mig_health_scores_org_date_key" UNIQUE ("organization_id", "score_date")
);
CREATE INDEX "mig_health_scores_org_idx" ON "mig_health_scores"("organization_id");

CREATE TABLE "mig_tickets" (
  "id"               TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "organization_id"  TEXT NOT NULL,
  "title"            TEXT NOT NULL,
  "description"      TEXT NOT NULL,
  "priority"         "MigTicketPriority" NOT NULL DEFAULT 'MEDIA',
  "status"           "MigTicketStatus" NOT NULL DEFAULT 'ABERTO',
  "category"         TEXT,
  "assigned_to"      TEXT,
  "resolved_at"      TIMESTAMPTZ,
  "closed_at"        TIMESTAMPTZ,
  "sla_deadline"     TIMESTAMPTZ,
  "resolution_note"  TEXT,
  "created_by"       TEXT NOT NULL,
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "mig_tickets_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "mig_tickets_org_status_idx" ON "mig_tickets"("organization_id", "status");
CREATE INDEX "mig_tickets_org_priority_idx" ON "mig_tickets"("organization_id", "priority");

CREATE TABLE "mig_access_grants" (
  "id"               TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "organization_id"  TEXT NOT NULL,
  "granted_to"       TEXT NOT NULL,
  "scope"            TEXT NOT NULL,
  "reason"           TEXT NOT NULL,
  "expires_at"       TIMESTAMPTZ NOT NULL,
  "revoked_at"       TIMESTAMPTZ,
  "revoked_by"       TEXT,
  "masking_enabled"  BOOLEAN NOT NULL DEFAULT true,
  "approved_by"      TEXT NOT NULL,
  "audit_log"        JSONB NOT NULL DEFAULT '[]',
  "created_by"       TEXT NOT NULL,
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "mig_access_grants_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "mig_access_grants_org_user_idx" ON "mig_access_grants"("organization_id", "granted_to");
CREATE INDEX "mig_access_grants_org_expires_idx" ON "mig_access_grants"("organization_id", "expires_at");

CREATE TABLE "mig_onboarding_configs" (
  "id"                TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "organization_id"   TEXT NOT NULL,
  "org_size"          TEXT,
  "specialty"         TEXT,
  "checklist_items"   JSONB NOT NULL DEFAULT '[]',
  "completed_items"   JSONB NOT NULL DEFAULT '[]',
  "academy_progress"  JSONB NOT NULL DEFAULT '{}',
  "created_by"        TEXT NOT NULL,
  "created_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "mig_onboarding_configs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "mig_onboarding_configs_org_key" UNIQUE ("organization_id")
);
