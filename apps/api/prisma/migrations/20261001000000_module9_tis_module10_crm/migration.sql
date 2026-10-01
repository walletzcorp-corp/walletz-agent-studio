-- Módulo 9 (TIS): Convênios, TISS e Glosas
-- Módulo 10 (CRM): CRM e Comunicação
-- IDs: TEXT; valores monetários: NUMERIC

-- ─── M9: TIS ENUMS ───────────────────────────────────────────────────────────
CREATE TYPE "GuideType" AS ENUM ('CONSULTA','SP_SADT','INTERNACAO','HONORARIOS');
CREATE TYPE "GuideStatus" AS ENUM (
  'RASCUNHO','PENDENTE_AUTORIZACAO','AUTORIZADO','NEGADO',
  'ENVIADO','PAGO','GLOSADO','PARCIALMENTE_PAGO','RECURSO','CANCELADO'
);
CREATE TYPE "LotStatus" AS ENUM ('ABERTO','FECHADO','ENVIADO','RETORNADO','PAGO','CANCELADO');
CREATE TYPE "ClaimStatus" AS ENUM ('ABERTA','APRESENTADA','ACEITA','NEGADA','RECURSO');

-- ─── M10: CRM ENUMS ──────────────────────────────────────────────────────────
CREATE TYPE "LeadStatus" AS ENUM ('NOVO','QUALIFICADO','EM_CONTATO','NEGOCIACAO','CONVERTIDO','PERDIDO');
CREATE TYPE "OpportunityStatus" AS ENUM ('ABERTA','GANHA','PERDIDA','PAUSADA');
CREATE TYPE "ActivityType" AS ENUM ('LIGACAO','EMAIL','WHATSAPP','REUNIAO','TAREFA','NOTA');
CREATE TYPE "CrmTicketStatus" AS ENUM ('ABERTO','EM_ANDAMENTO','AGUARDANDO_CLIENTE','RESOLVIDO','FECHADO');
CREATE TYPE "CrmTicketPriority" AS ENUM ('BAIXA','MEDIA','ALTA','CRITICA');

-- ─── TIS: Operadoras ─────────────────────────────────────────────────────────
CREATE TABLE "insurance_carriers" (
  "id"              TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "ans_code"        TEXT NOT NULL,
  "name"            TEXT NOT NULL,
  "trade_name"      TEXT,
  "cnpj"            TEXT,
  "phone"           TEXT,
  "email"           TEXT,
  "active"          BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "insurance_carriers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "insurance_carriers_org_ans_key" UNIQUE ("organization_id","ans_code")
);
CREATE INDEX "insurance_carriers_org_idx" ON "insurance_carriers"("organization_id");

-- ─── TIS: Planos ─────────────────────────────────────────────────────────────
CREATE TABLE "insurance_plans" (
  "id"          TEXT NOT NULL,
  "carrier_id"  TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "plan_code"   TEXT NOT NULL,
  "plan_type"   TEXT NOT NULL,
  "active"      BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "insurance_plans_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "insurance_plans_carrier_code_key" UNIQUE ("carrier_id","plan_code"),
  CONSTRAINT "insurance_plans_carrier_id_fkey"
    FOREIGN KEY ("carrier_id") REFERENCES "insurance_carriers"("id") ON DELETE CASCADE
);
CREATE INDEX "insurance_plans_carrier_idx" ON "insurance_plans"("carrier_id");

-- ─── TIS: Contratos ──────────────────────────────────────────────────────────
CREATE TABLE "insurance_contracts" (
  "id"              TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "carrier_id"      TEXT NOT NULL,
  "plan_id"         TEXT,
  "contract_number" TEXT NOT NULL,
  "tiss_version"    TEXT NOT NULL,
  "operator_code"   TEXT NOT NULL,
  "provider_code"   TEXT NOT NULL,
  "valid_from"      DATE NOT NULL,
  "valid_until"     DATE,
  "active"          BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "insurance_contracts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "insurance_contracts_org_number_key" UNIQUE ("organization_id","contract_number"),
  CONSTRAINT "insurance_contracts_carrier_id_fkey"
    FOREIGN KEY ("carrier_id") REFERENCES "insurance_carriers"("id"),
  CONSTRAINT "insurance_contracts_plan_id_fkey"
    FOREIGN KEY ("plan_id") REFERENCES "insurance_plans"("id") ON DELETE SET NULL
);
CREATE INDEX "insurance_contracts_org_idx" ON "insurance_contracts"("organization_id");

-- ─── TIS: Tabela TUSS versionada ─────────────────────────────────────────────
CREATE TABLE "tuss_codes" (
  "id"              TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "code"            TEXT NOT NULL,
  "description"     TEXT NOT NULL,
  "table_code"      TEXT NOT NULL,
  "version"         TEXT NOT NULL,
  "valid_from"      DATE NOT NULL,
  "valid_until"     DATE,
  "unit_value"      NUMERIC(15,4),
  "active"          BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "tuss_codes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tuss_codes_org_code_version_key" UNIQUE ("organization_id","code","version")
);
CREATE INDEX "tuss_codes_org_idx" ON "tuss_codes"("organization_id");

-- ─── TIS: Guias ──────────────────────────────────────────────────────────────
CREATE TABLE "insurance_guides" (
  "id"                  TEXT NOT NULL,
  "organization_id"     TEXT NOT NULL,
  "contract_id"         TEXT NOT NULL,
  "guide_type"          "GuideType" NOT NULL,
  "status"              "GuideStatus" NOT NULL DEFAULT 'RASCUNHO',
  "guide_number"        TEXT,
  "authorization_number" TEXT,
  "patient_id"          TEXT,
  "appointment_id"      TEXT,
  "professional_id"     TEXT,
  "unit_id"             TEXT NOT NULL,
  "service_date"        DATE NOT NULL,
  "validation_errors"   JSONB,
  "idempotency_key"     TEXT,
  "created_by"          TEXT NOT NULL,
  "created_at"          TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"          TIMESTAMPTZ NOT NULL DEFAULT now(),
  "submitted_at"        TIMESTAMPTZ,
  "paid_at"             TIMESTAMPTZ,
  "cancelled_at"        TIMESTAMPTZ,
  CONSTRAINT "insurance_guides_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "insurance_guides_idempotency_key" UNIQUE ("idempotency_key"),
  CONSTRAINT "insurance_guides_contract_id_fkey"
    FOREIGN KEY ("contract_id") REFERENCES "insurance_contracts"("id")
);
CREATE INDEX "insurance_guides_org_idx" ON "insurance_guides"("organization_id");
CREATE INDEX "insurance_guides_contract_idx" ON "insurance_guides"("contract_id");

-- ─── TIS: Itens da Guia ──────────────────────────────────────────────────────
CREATE TABLE "insurance_guide_items" (
  "id"            TEXT NOT NULL,
  "guide_id"      TEXT NOT NULL,
  "tuss_code_id"  TEXT,
  "description"   TEXT NOT NULL,
  "quantity"      NUMERIC(15,4) NOT NULL,
  "unit_value"    NUMERIC(15,4) NOT NULL,
  "total_value"   NUMERIC(15,4) NOT NULL,
  "table_code"    TEXT,
  "item_code"     TEXT,
  CONSTRAINT "insurance_guide_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "insurance_guide_items_guide_id_fkey"
    FOREIGN KEY ("guide_id") REFERENCES "insurance_guides"("id") ON DELETE CASCADE,
  CONSTRAINT "insurance_guide_items_tuss_code_id_fkey"
    FOREIGN KEY ("tuss_code_id") REFERENCES "tuss_codes"("id") ON DELETE SET NULL
);
CREATE INDEX "insurance_guide_items_guide_idx" ON "insurance_guide_items"("guide_id");

-- ─── TIS: Lotes de Cobrança ──────────────────────────────────────────────────
CREATE TABLE "insurance_lots" (
  "id"                TEXT NOT NULL,
  "organization_id"   TEXT NOT NULL,
  "contract_id"       TEXT NOT NULL,
  "lot_number"        TEXT NOT NULL,
  "status"            "LotStatus" NOT NULL DEFAULT 'ABERTO',
  "competence_month"  INTEGER NOT NULL,
  "competence_year"   INTEGER NOT NULL,
  "total_value"       NUMERIC(15,2) NOT NULL DEFAULT 0,
  "xml_payload"       TEXT,
  "protocol_number"   TEXT,
  "sent_at"           TIMESTAMPTZ,
  "returned_at"       TIMESTAMPTZ,
  "return_notes"      TEXT,
  "paid_value"        NUMERIC(15,2),
  "paid_at"           TIMESTAMPTZ,
  "created_by"        TEXT NOT NULL,
  "created_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "insurance_lots_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "insurance_lots_org_number_key" UNIQUE ("organization_id","lot_number"),
  CONSTRAINT "insurance_lots_contract_id_fkey"
    FOREIGN KEY ("contract_id") REFERENCES "insurance_contracts"("id")
);
CREATE INDEX "insurance_lots_org_idx" ON "insurance_lots"("organization_id");

-- ─── TIS: Itens do Lote ──────────────────────────────────────────────────────
CREATE TABLE "insurance_lot_items" (
  "id"        TEXT NOT NULL,
  "lot_id"    TEXT NOT NULL,
  "guide_id"  TEXT NOT NULL,
  "value"     NUMERIC(15,2) NOT NULL,
  CONSTRAINT "insurance_lot_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "insurance_lot_items_lot_guide_key" UNIQUE ("lot_id","guide_id"),
  CONSTRAINT "insurance_lot_items_lot_id_fkey"
    FOREIGN KEY ("lot_id") REFERENCES "insurance_lots"("id") ON DELETE CASCADE,
  CONSTRAINT "insurance_lot_items_guide_id_fkey"
    FOREIGN KEY ("guide_id") REFERENCES "insurance_guides"("id")
);
CREATE INDEX "insurance_lot_items_lot_idx" ON "insurance_lot_items"("lot_id");

-- ─── TIS: Glosas ─────────────────────────────────────────────────────────────
CREATE TABLE "insurance_claims" (
  "id"                TEXT NOT NULL,
  "organization_id"   TEXT NOT NULL,
  "guide_id"          TEXT NOT NULL,
  "status"            "ClaimStatus" NOT NULL DEFAULT 'ABERTA',
  "item_description"  TEXT NOT NULL,
  "claim_reason"      TEXT NOT NULL,
  "claim_code"        TEXT,
  "glosed_value"      NUMERIC(15,2) NOT NULL,
  "responsible_party" TEXT NOT NULL,
  "due_date"          DATE,
  "resolved_at"       TIMESTAMPTZ,
  "notes"             TEXT,
  "created_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "insurance_claims_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "insurance_claims_guide_id_fkey"
    FOREIGN KEY ("guide_id") REFERENCES "insurance_guides"("id")
);
CREATE INDEX "insurance_claims_org_idx" ON "insurance_claims"("organization_id");
CREATE INDEX "insurance_claims_guide_idx" ON "insurance_claims"("guide_id");

-- ─── TIS: Recursos de Glosa ──────────────────────────────────────────────────
CREATE TABLE "insurance_claim_appeals" (
  "id"            TEXT NOT NULL,
  "claim_id"      TEXT NOT NULL,
  "appeal_text"   TEXT NOT NULL,
  "document_ref"  TEXT,
  "submitted_by"  TEXT NOT NULL,
  "submitted_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "result"        TEXT,
  "result_at"     TIMESTAMPTZ,
  CONSTRAINT "insurance_claim_appeals_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "insurance_claim_appeals_claim_id_fkey"
    FOREIGN KEY ("claim_id") REFERENCES "insurance_claims"("id") ON DELETE CASCADE
);
CREATE INDEX "insurance_claim_appeals_claim_idx" ON "insurance_claim_appeals"("claim_id");

-- ─── CRM: Funis ──────────────────────────────────────────────────────────────
CREATE TABLE "crm_funnels" (
  "id"              TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "name"            TEXT NOT NULL,
  "description"     TEXT,
  "active"          BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "crm_funnels_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "crm_funnels_org_idx" ON "crm_funnels"("organization_id");

-- ─── CRM: Etapas dos Funis ───────────────────────────────────────────────────
CREATE TABLE "crm_funnel_stages" (
  "id"          TEXT NOT NULL,
  "funnel_id"   TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "position"    INTEGER NOT NULL,
  "probability" INTEGER NOT NULL DEFAULT 50,
  "is_won"      BOOLEAN NOT NULL DEFAULT FALSE,
  "is_lost"     BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT "crm_funnel_stages_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "crm_funnel_stages_funnel_pos_key" UNIQUE ("funnel_id","position"),
  CONSTRAINT "crm_funnel_stages_funnel_id_fkey"
    FOREIGN KEY ("funnel_id") REFERENCES "crm_funnels"("id") ON DELETE CASCADE
);
CREATE INDEX "crm_funnel_stages_funnel_idx" ON "crm_funnel_stages"("funnel_id");

-- ─── CRM: Leads ──────────────────────────────────────────────────────────────
CREATE TABLE "crm_leads" (
  "id"                       TEXT NOT NULL,
  "organization_id"          TEXT NOT NULL,
  "name"                     TEXT NOT NULL,
  "email"                    TEXT,
  "phone"                    TEXT,
  "source"                   TEXT,
  "campaign"                 TEXT,
  "interest"                 TEXT,
  "status"                   "LeadStatus" NOT NULL DEFAULT 'NOVO',
  "consent_given"            BOOLEAN NOT NULL DEFAULT FALSE,
  "consent_date"             TIMESTAMPTZ,
  "consent_channel"          TEXT,
  "owned_by"                 TEXT,
  "converted_at"             TIMESTAMPTZ,
  "converted_to_patient_id"  TEXT,
  "loss_reason"              TEXT,
  "notes"                    TEXT,
  "created_at"               TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"               TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "crm_leads_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "crm_leads_org_idx" ON "crm_leads"("organization_id");

-- ─── CRM: Oportunidades ──────────────────────────────────────────────────────
CREATE TABLE "crm_opportunities" (
  "id"                   TEXT NOT NULL,
  "organization_id"      TEXT NOT NULL,
  "lead_id"              TEXT,
  "funnel_id"            TEXT NOT NULL,
  "stage_id"             TEXT NOT NULL,
  "title"                TEXT NOT NULL,
  "service_id"           TEXT,
  "value"                NUMERIC(15,2),
  "probability"          INTEGER NOT NULL DEFAULT 50,
  "expected_close_date"  DATE,
  "status"               "OpportunityStatus" NOT NULL DEFAULT 'ABERTA',
  "owned_by"             TEXT,
  "loss_reason"          TEXT,
  "created_at"           TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "crm_opportunities_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "crm_opportunities_lead_id_fkey"
    FOREIGN KEY ("lead_id") REFERENCES "crm_leads"("id") ON DELETE SET NULL,
  CONSTRAINT "crm_opportunities_funnel_id_fkey"
    FOREIGN KEY ("funnel_id") REFERENCES "crm_funnels"("id"),
  CONSTRAINT "crm_opportunities_stage_id_fkey"
    FOREIGN KEY ("stage_id") REFERENCES "crm_funnel_stages"("id")
);
CREATE INDEX "crm_opportunities_org_idx" ON "crm_opportunities"("organization_id");
CREATE INDEX "crm_opportunities_funnel_stage_idx" ON "crm_opportunities"("funnel_id","stage_id");

-- ─── CRM: Atividades ─────────────────────────────────────────────────────────
CREATE TABLE "crm_activities" (
  "id"               TEXT NOT NULL,
  "organization_id"  TEXT NOT NULL,
  "lead_id"          TEXT,
  "opportunity_id"   TEXT,
  "type"             "ActivityType" NOT NULL,
  "subject"          TEXT NOT NULL,
  "description"      TEXT,
  "due_date"         TIMESTAMPTZ,
  "completed_at"     TIMESTAMPTZ,
  "performed_by"     TEXT NOT NULL,
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "crm_activities_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "crm_activities_lead_id_fkey"
    FOREIGN KEY ("lead_id") REFERENCES "crm_leads"("id") ON DELETE SET NULL,
  CONSTRAINT "crm_activities_opportunity_id_fkey"
    FOREIGN KEY ("opportunity_id") REFERENCES "crm_opportunities"("id") ON DELETE SET NULL
);
CREATE INDEX "crm_activities_org_idx" ON "crm_activities"("organization_id");
CREATE INDEX "crm_activities_lead_idx" ON "crm_activities"("lead_id");

-- ─── CRM: Propostas ──────────────────────────────────────────────────────────
CREATE TABLE "crm_proposals" (
  "id"               TEXT NOT NULL,
  "organization_id"  TEXT NOT NULL,
  "opportunity_id"   TEXT NOT NULL,
  "title"            TEXT NOT NULL,
  "value"            NUMERIC(15,2) NOT NULL,
  "valid_until"      DATE,
  "status"           TEXT NOT NULL DEFAULT 'RASCUNHO',
  "content"          TEXT,
  "accepted_at"      TIMESTAMPTZ,
  "accepted_by"      TEXT,
  "rejected_at"      TIMESTAMPTZ,
  "rejection_reason" TEXT,
  "created_by"       TEXT NOT NULL,
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "crm_proposals_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "crm_proposals_opportunity_id_fkey"
    FOREIGN KEY ("opportunity_id") REFERENCES "crm_opportunities"("id")
);
CREATE INDEX "crm_proposals_org_idx" ON "crm_proposals"("organization_id");

-- ─── CRM: Templates ──────────────────────────────────────────────────────────
CREATE TABLE "crm_templates" (
  "id"              TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "name"            TEXT NOT NULL,
  "channel"         TEXT NOT NULL,
  "purpose"         TEXT NOT NULL,
  "subject"         TEXT,
  "body"            TEXT NOT NULL,
  "approved"        BOOLEAN NOT NULL DEFAULT FALSE,
  "approved_by"     TEXT,
  "approved_at"     TIMESTAMPTZ,
  "active"          BOOLEAN NOT NULL DEFAULT TRUE,
  "created_by"      TEXT NOT NULL,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "crm_templates_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "crm_templates_org_idx" ON "crm_templates"("organization_id");

-- ─── CRM: Tickets ────────────────────────────────────────────────────────────
CREATE TABLE "crm_tickets" (
  "id"              TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "lead_id"         TEXT,
  "patient_id"      TEXT,
  "subject"         TEXT NOT NULL,
  "category"        TEXT,
  "status"          "CrmTicketStatus" NOT NULL DEFAULT 'ABERTO',
  "priority"        "CrmTicketPriority" NOT NULL DEFAULT 'MEDIA',
  "assigned_to"     TEXT,
  "sla_deadline"    TIMESTAMPTZ,
  "resolved_at"     TIMESTAMPTZ,
  "closed_at"       TIMESTAMPTZ,
  "channel"         TEXT,
  "created_by"      TEXT NOT NULL,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "crm_tickets_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "crm_tickets_org_idx" ON "crm_tickets"("organization_id");

-- ─── CRM: Mensagens do Ticket ────────────────────────────────────────────────
CREATE TABLE "crm_ticket_messages" (
  "id"          TEXT NOT NULL,
  "ticket_id"   TEXT NOT NULL,
  "body"        TEXT NOT NULL,
  "author_sub"  TEXT NOT NULL,
  "author_name" TEXT NOT NULL,
  "is_internal" BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "crm_ticket_messages_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "crm_ticket_messages_ticket_id_fkey"
    FOREIGN KEY ("ticket_id") REFERENCES "crm_tickets"("id") ON DELETE CASCADE
);
CREATE INDEX "crm_ticket_messages_ticket_idx" ON "crm_ticket_messages"("ticket_id");
