-- Module 5: Patients & Consents
-- Extends Patient model + adds 9 new models

-- New enums
CREATE TYPE "ConsentType" AS ENUM ('TERMO_TRATAMENTO','LGPD_TRATAMENTO','USO_IMAGEM','ANESTESIA','CIRURGIA','PESQUISA','MARKETING','TELEMEDICINA','COMPARTILHAMENTO','OUTRO');
CREATE TYPE "ConsentStatus" AS ENUM ('VIGENTE','REVOGADO','EXPIRADO','PENDENTE');
CREATE TYPE "ConsentChannel" AS ENUM ('PRESENCIAL','DIGITAL','PORTAL_PACIENTE','APP','WHATSAPP','EMAIL');
CREATE TYPE "AlertType" AS ENUM ('ALERGICO','MEDICAMENTO','CONTRAINDICACAO','RISCO_QUEDA','ISOLAMENTO','ADMINISTRATIVO','SEGURANCA','OUTRO');
CREATE TYPE "AlertSeverity" AS ENUM ('BAIXA','MEDIA','ALTA','CRITICA');
CREATE TYPE "PatientDocumentType" AS ENUM ('RG','CPF_DOC','PASSAPORTE','CNH','TITULO_ELEITOR','CARTAO_SUS','CERTIDAO_NASCIMENTO','LAUDO_MEDICO','EXAME','OUTRO');
CREATE TYPE "PatientLinkType" AS ENUM ('RESPONSAVEL_LEGAL','PAI','MAE','CONJUGE','FILHO','TUTOR','CUIDADOR','ACOMPANHANTE','OUTRO');

-- Extend Patient table
ALTER TABLE "patients"
  ADD COLUMN "nome_social" TEXT,
  ADD COLUMN "cns" TEXT,
  ADD COLUMN "rg" TEXT,
  ADD COLUMN "rg_orgao_emissor" TEXT,
  ADD COLUMN "estado_civil" TEXT,
  ADD COLUMN "nacionalidade" TEXT,
  ADD COLUMN "naturalidade" TEXT,
  ADD COLUMN "etnia" TEXT,
  ADD COLUMN "escolaridade" TEXT,
  ADD COLUMN "profissao" TEXT,
  ADD COLUMN "logradouro" TEXT,
  ADD COLUMN "numero" TEXT,
  ADD COLUMN "complemento" TEXT,
  ADD COLUMN "bairro" TEXT,
  ADD COLUMN "cidade" TEXT,
  ADD COLUMN "uf" CHAR(2),
  ADD COLUMN "cep" TEXT,
  ADD COLUMN "marketing_blocked" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN "preferencias" JSONB,
  ADD COLUMN "deactivated_at" TIMESTAMP(3);

-- CNS unique per org
CREATE UNIQUE INDEX "patients_organization_id_cns_key" ON "patients"("organization_id", "cns");

-- PatientContact
CREATE TABLE "patient_contacts" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "patient_id" TEXT NOT NULL REFERENCES "patients"("id"),
  "organization_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "relationship" TEXT NOT NULL,
  "telefone" TEXT,
  "email" TEXT,
  "cpf" TEXT,
  "is_primary" BOOLEAN NOT NULL DEFAULT FALSE,
  "is_emergency" BOOLEAN NOT NULL DEFAULT FALSE,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "patient_contacts_patient_id_idx" ON "patient_contacts"("patient_id");

-- PatientInsurance
CREATE TABLE "patient_insurances" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "patient_id" TEXT NOT NULL REFERENCES "patients"("id"),
  "organization_id" TEXT NOT NULL,
  "operator" TEXT NOT NULL,
  "plan_name" TEXT NOT NULL,
  "card_number" TEXT,
  "valid_until" DATE,
  "plan_type" TEXT,
  "notes" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "patient_insurances_patient_id_idx" ON "patient_insurances"("patient_id");

-- PatientAlert
CREATE TABLE "patient_alerts" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "patient_id" TEXT NOT NULL REFERENCES "patients"("id"),
  "organization_id" TEXT NOT NULL,
  "type" "AlertType" NOT NULL,
  "severity" "AlertSeverity" NOT NULL DEFAULT 'MEDIA',
  "message" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "resolved_at" TIMESTAMP(3),
  "resolved_by" TEXT,
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "patient_alerts_patient_id_active_idx" ON "patient_alerts"("patient_id", "active");

-- PatientDocument
CREATE TABLE "patient_documents" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "patient_id" TEXT NOT NULL REFERENCES "patients"("id"),
  "organization_id" TEXT NOT NULL,
  "type" "PatientDocumentType" NOT NULL,
  "file_name" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "size_bytes" INTEGER,
  "storage_key" TEXT NOT NULL,
  "description" TEXT,
  "issued_at" DATE,
  "expires_at" DATE,
  "uploaded_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "patient_documents_patient_id_idx" ON "patient_documents"("patient_id");

-- PatientConsent
CREATE TABLE "patient_consents" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "patient_id" TEXT NOT NULL REFERENCES "patients"("id"),
  "organization_id" TEXT NOT NULL,
  "type" "ConsentType" NOT NULL,
  "status" "ConsentStatus" NOT NULL DEFAULT 'VIGENTE',
  "channel" "ConsentChannel" NOT NULL,
  "version" TEXT NOT NULL,
  "document_url" TEXT,
  "signed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "signed_by" TEXT NOT NULL,
  "signed_by_name" TEXT NOT NULL,
  "valid_until" DATE,
  "ip_address" TEXT,
  "notes" TEXT,
  "revoked_at" TIMESTAMP(3),
  "revoked_by" TEXT,
  "revoked_by_name" TEXT,
  "revocation_reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "patient_consents_patient_id_type_status_idx" ON "patient_consents"("patient_id", "type", "status");

-- PatientLink
CREATE TABLE "patient_links" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organization_id" TEXT NOT NULL,
  "guardian_id" TEXT NOT NULL REFERENCES "patients"("id"),
  "dependent_id" TEXT NOT NULL REFERENCES "patients"("id"),
  "link_type" "PatientLinkType" NOT NULL,
  "valid_until" DATE,
  "notes" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "patient_links_guardian_id_dependent_id_organization_id_key" ON "patient_links"("guardian_id","dependent_id","organization_id");
CREATE INDEX "patient_links_dependent_id_idx" ON "patient_links"("dependent_id");

-- PreAdmissionForm
CREATE TABLE "pre_admission_forms" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organization_id" TEXT NOT NULL REFERENCES "organizations"("id"),
  "name" TEXT NOT NULL,
  "version" TEXT NOT NULL DEFAULT '1.0',
  "fields" JSONB NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "pre_admission_forms_organization_id_active_idx" ON "pre_admission_forms"("organization_id","active");

-- PreAdmissionFormResponse
CREATE TABLE "pre_admission_form_responses" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "form_id" TEXT NOT NULL REFERENCES "pre_admission_forms"("id"),
  "patient_id" TEXT NOT NULL REFERENCES "patients"("id"),
  "organization_id" TEXT NOT NULL,
  "answers" JSONB NOT NULL,
  "form_version" TEXT NOT NULL,
  "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "submitted_by" TEXT NOT NULL,
  "notes" TEXT
);
CREATE INDEX "pre_admission_form_responses_patient_id_form_id_idx" ON "pre_admission_form_responses"("patient_id","form_id");

-- PatientAuditLog
CREATE TABLE "patient_audit_logs" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "patient_id" TEXT NOT NULL REFERENCES "patients"("id"),
  "organization_id" TEXT NOT NULL,
  "actor_sub" TEXT NOT NULL,
  "actor_name" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "resource_type" TEXT NOT NULL,
  "resource_id" TEXT,
  "metadata" JSONB,
  "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "patient_audit_logs_patient_id_idx" ON "patient_audit_logs"("patient_id");

-- Function to auto-update updated_at timestamps for new tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END;
$$ language 'plpgsql';

CREATE TRIGGER update_patient_contacts_updated_at BEFORE UPDATE ON "patient_contacts" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_patient_insurances_updated_at BEFORE UPDATE ON "patient_insurances" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_patient_alerts_updated_at BEFORE UPDATE ON "patient_alerts" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_patient_consents_updated_at BEFORE UPDATE ON "patient_consents" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_patient_links_updated_at BEFORE UPDATE ON "patient_links" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pre_admission_forms_updated_at BEFORE UPDATE ON "pre_admission_forms" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
