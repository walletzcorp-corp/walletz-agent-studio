-- CreateEnum
CREATE TYPE "EntryStatus" AS ENUM ('RASCUNHO', 'AGUARDANDO_ASSINATURA', 'ASSINADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "SignatureStatus" AS ENUM ('PENDENTE', 'DEMO', 'CONFIRMADO');

-- CreateEnum
CREATE TYPE "AllergyStatus" AS ENUM ('ATIVO', 'REMISSAO', 'NEGADO');

-- CreateEnum
CREATE TYPE "MedicationStatus" AS ENUM ('EM_USO', 'SUSPENSO', 'ENCERRADO');

-- CreateEnum
CREATE TYPE "DiagnosisType" AS ENUM ('PRINCIPAL', 'SECUNDARIO', 'COMPLICACAO', 'DESCARTADO');

-- CreateEnum
CREATE TYPE "PepAuditAction" AS ENUM ('LEITURA', 'IMPRESSAO', 'EXPORTACAO', 'INCLUSAO', 'EDICAO_RASCUNHO', 'ASSINATURA', 'ADENDO');

-- CreateTable
CREATE TABLE "medical_records" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medical_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_entries" (
    "id" TEXT NOT NULL,
    "record_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "unit_id" TEXT NOT NULL,
    "professional_id" TEXT NOT NULL,
    "appointment_id" TEXT,
    "template_id" TEXT,
    "subjective" TEXT,
    "objective" TEXT,
    "assessment" TEXT,
    "plan" TEXT,
    "extra_fields" JSONB,
    "copied_from_id" TEXT,
    "status" "EntryStatus" NOT NULL DEFAULT 'RASCUNHO',
    "row_version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinical_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_entry_addenda" (
    "id" TEXT NOT NULL,
    "entry_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "author_sub" TEXT NOT NULL,
    "author_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clinical_entry_addenda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vital_signs" (
    "id" TEXT NOT NULL,
    "entry_id" TEXT NOT NULL,
    "temperature_c" DECIMAL(4,1),
    "systolic_bp" INTEGER,
    "diastolic_bp" INTEGER,
    "heart_rate" INTEGER,
    "respiratory_rate" INTEGER,
    "oxygen_sat_pct" DECIMAL(4,1),
    "weight_kg" DECIMAL(5,2),
    "height_cm" DECIMAL(5,1),
    "bmi" DECIMAL(4,1),
    "pain_scale" INTEGER,
    "extra" JSONB,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vital_signs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "allergy_records" (
    "id" TEXT NOT NULL,
    "record_id" TEXT NOT NULL,
    "substance" TEXT NOT NULL,
    "reaction" TEXT,
    "severity" TEXT,
    "status" "AllergyStatus" NOT NULL DEFAULT 'ATIVO',
    "onset_date" DATE,
    "notes" TEXT,
    "reported_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "allergy_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medication_records" (
    "id" TEXT NOT NULL,
    "record_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dosage" TEXT,
    "frequency" TEXT,
    "route" TEXT,
    "start_date" DATE,
    "end_date" DATE,
    "status" "MedicationStatus" NOT NULL DEFAULT 'EM_USO',
    "indication" TEXT,
    "notes" TEXT,
    "prescribed_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medication_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnosis_records" (
    "id" TEXT NOT NULL,
    "record_id" TEXT NOT NULL,
    "cid_code" TEXT,
    "description" TEXT NOT NULL,
    "type" "DiagnosisType" NOT NULL DEFAULT 'PRINCIPAL',
    "notes" TEXT,
    "diagnosed_by" TEXT NOT NULL,
    "diagnosed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "diagnosis_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_history_records" (
    "id" TEXT NOT NULL,
    "record_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "date" DATE,
    "notes" TEXT,
    "reported_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medical_history_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_attachments" (
    "id" TEXT NOT NULL,
    "entry_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER,
    "storage_key" TEXT NOT NULL,
    "description" TEXT,
    "uploaded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clinical_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_entry_signatures" (
    "id" TEXT NOT NULL,
    "entry_id" TEXT NOT NULL,
    "signer_sub" TEXT NOT NULL,
    "signer_name" TEXT NOT NULL,
    "signer_council" TEXT,
    "status" "SignatureStatus" NOT NULL DEFAULT 'PENDENTE',
    "signed_at" TIMESTAMP(3),
    "provider_name" TEXT,
    "provider_ref" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clinical_entry_signatures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pep_templates" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "specialty_id" TEXT,
    "name" TEXT NOT NULL,
    "fields" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pep_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cid_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "version" TEXT NOT NULL DEFAULT '10',
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "cid_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pep_audit_logs" (
    "id" TEXT NOT NULL,
    "record_id" TEXT,
    "entry_id" TEXT,
    "actor_sub" TEXT NOT NULL,
    "actor_name" TEXT NOT NULL,
    "action" "PepAuditAction" NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pep_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "care_relationships" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "professional_id" TEXT NOT NULL,
    "unit_id" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "care_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "medical_records_patient_id_key" ON "medical_records"("patient_id");

-- CreateIndex
CREATE INDEX "clinical_entries_record_id_created_at_idx" ON "clinical_entries"("record_id", "created_at");

-- CreateIndex
CREATE INDEX "clinical_entries_professional_id_idx" ON "clinical_entries"("professional_id");

-- CreateIndex
CREATE UNIQUE INDEX "vital_signs_entry_id_key" ON "vital_signs"("entry_id");

-- CreateIndex
CREATE UNIQUE INDEX "clinical_entry_signatures_entry_id_key" ON "clinical_entry_signatures"("entry_id");

-- CreateIndex
CREATE INDEX "cid_codes_code_idx" ON "cid_codes"("code");

-- CreateIndex
CREATE INDEX "cid_codes_description_idx" ON "cid_codes"("description");

-- CreateIndex
CREATE UNIQUE INDEX "cid_codes_code_version_key" ON "cid_codes"("code", "version");

-- CreateIndex
CREATE INDEX "pep_audit_logs_record_id_idx" ON "pep_audit_logs"("record_id");

-- CreateIndex
CREATE INDEX "pep_audit_logs_entry_id_idx" ON "pep_audit_logs"("entry_id");

-- CreateIndex
CREATE UNIQUE INDEX "care_relationships_patient_id_professional_id_organization__key" ON "care_relationships"("patient_id", "professional_id", "organization_id");

-- AddForeignKey
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_entries" ADD CONSTRAINT "clinical_entries_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "medical_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_entries" ADD CONSTRAINT "clinical_entries_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_entries" ADD CONSTRAINT "clinical_entries_copied_from_id_fkey" FOREIGN KEY ("copied_from_id") REFERENCES "clinical_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_entry_addenda" ADD CONSTRAINT "clinical_entry_addenda_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "clinical_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vital_signs" ADD CONSTRAINT "vital_signs_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "clinical_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allergy_records" ADD CONSTRAINT "allergy_records_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "medical_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_records" ADD CONSTRAINT "medication_records_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "medical_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnosis_records" ADD CONSTRAINT "diagnosis_records_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "medical_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_history_records" ADD CONSTRAINT "medical_history_records_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "medical_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_attachments" ADD CONSTRAINT "clinical_attachments_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "clinical_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_entry_signatures" ADD CONSTRAINT "clinical_entry_signatures_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "clinical_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pep_templates" ADD CONSTRAINT "pep_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pep_templates" ADD CONSTRAINT "pep_templates_specialty_id_fkey" FOREIGN KEY ("specialty_id") REFERENCES "specialties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pep_audit_logs" ADD CONSTRAINT "pep_audit_logs_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "medical_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pep_audit_logs" ADD CONSTRAINT "pep_audit_logs_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "clinical_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_relationships" ADD CONSTRAINT "care_relationships_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_relationships" ADD CONSTRAINT "care_relationships_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
