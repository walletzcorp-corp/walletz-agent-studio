-- ─── M22 TEL — Sala Virtual de Atendimento ────────────────────────────────────

-- Enums
CREATE TYPE "TelRoomStatus" AS ENUM (
  'AGENDADA', 'AGUARDANDO', 'EM_ANDAMENTO', 'ENCERRADA', 'CANCELADA'
);
CREATE TYPE "TelParticipantRole" AS ENUM (
  'PROFISSIONAL', 'PACIENTE', 'CONVIDADO'
);
CREATE TYPE "TelParticipantStatus" AS ENUM (
  'AGUARDANDO', 'ADMITIDO', 'CONECTADO', 'DESCONECTADO', 'SAIU'
);
CREATE TYPE "TelEventType" AS ENUM (
  'SALA_CRIADA', 'PARTICIPANTE_ENTROU', 'PARTICIPANTE_ADMITIDO',
  'PARTICIPANTE_SAIU', 'CHAMADA_INICIADA', 'CHAMADA_ENCERRADA',
  'RECONEXAO', 'DOCUMENTO_COMPARTILHADO', 'DOCUMENTO_CONFIRMADO',
  'EVOLUCAO_SALVA', 'SALA_CANCELADA', 'LINK_REVOGADO'
);
CREATE TYPE "TelDocumentStatus" AS ENUM (
  'COMPARTILHADO', 'CONFIRMADO', 'REJEITADO'
);

-- TelRoom: sala vinculada a agendamento (RV-TELE-001)
CREATE TABLE "tel_rooms" (
  "id"                     TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "organization_id"        TEXT NOT NULL,
  "appointment_id"         TEXT NOT NULL,
  "status"                 "TelRoomStatus" NOT NULL DEFAULT 'AGENDADA',
  "recording_enabled"      BOOLEAN NOT NULL DEFAULT false,
  "recording_consent_at"   TIMESTAMP(3),
  "recording_consent_by"   TEXT,
  "scheduled_at"           TIMESTAMP(3) NOT NULL,
  "started_at"             TIMESTAMP(3),
  "ended_at"               TIMESTAMP(3),
  "cancel_reason"          TEXT,
  "cancelled_by"           TEXT,
  "cancelled_at"           TIMESTAMP(3),
  "clinical_entry_id"      TEXT,
  "created_by"             TEXT NOT NULL,
  "created_at"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "tel_rooms_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tel_rooms_appointment_id_key" UNIQUE ("appointment_id"),
  CONSTRAINT "tel_rooms_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id"),
  CONSTRAINT "tel_rooms_appointment_id_fkey"
    FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id")
);
CREATE INDEX "tel_rooms_organization_id_status_idx" ON "tel_rooms"("organization_id", "status");
CREATE INDEX "tel_rooms_appointment_id_idx" ON "tel_rooms"("appointment_id");

-- TelParticipant: participantes autorizados (RV-TELE-002/003/004)
CREATE TABLE "tel_participants" (
  "id"           TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "room_id"      TEXT NOT NULL,
  "role"         "TelParticipantRole" NOT NULL,
  "status"       "TelParticipantStatus" NOT NULL DEFAULT 'AGUARDANDO',
  "user_id"      TEXT,
  "patient_id"   TEXT,
  "display_name" TEXT NOT NULL,
  "admitted_at"  TIMESTAMP(3),
  "admitted_by"  TEXT,
  "joined_at"    TIMESTAMP(3),
  "left_at"      TIMESTAMP(3),
  "reconnections" INTEGER NOT NULL DEFAULT 0,
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "tel_participants_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tel_participants_room_user_key" UNIQUE ("room_id", "user_id"),
  CONSTRAINT "tel_participants_room_patient_key" UNIQUE ("room_id", "patient_id"),
  CONSTRAINT "tel_participants_room_id_fkey"
    FOREIGN KEY ("room_id") REFERENCES "tel_rooms"("id")
);

-- TelEvent: trilha de auditoria (RV-TELE-004)
CREATE TABLE "tel_events" (
  "id"           TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "room_id"      TEXT NOT NULL,
  "event_type"   "TelEventType" NOT NULL,
  "actor_id"     TEXT NOT NULL,
  "actor_role"   "TelParticipantRole" NOT NULL,
  "metadata"     JSONB NOT NULL DEFAULT '{}',
  "occurred_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "tel_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tel_events_room_id_fkey"
    FOREIGN KEY ("room_id") REFERENCES "tel_rooms"("id")
);
CREATE INDEX "tel_events_room_id_occurred_at_idx" ON "tel_events"("room_id", "occurred_at");

-- TelAccessLink: links individuais, temporários, revogáveis (RV-TELE-008)
CREATE TABLE "tel_access_links" (
  "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "room_id"     TEXT NOT NULL,
  "token"       TEXT NOT NULL,
  "role"        "TelParticipantRole" NOT NULL,
  "patient_id"  TEXT,
  "user_id"     TEXT,
  "expires_at"  TIMESTAMP(3) NOT NULL,
  "used_at"     TIMESTAMP(3),
  "revoked_at"  TIMESTAMP(3),
  "revoked_by"  TEXT,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "tel_access_links_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tel_access_links_token_key" UNIQUE ("token"),
  CONSTRAINT "tel_access_links_room_id_fkey"
    FOREIGN KEY ("room_id") REFERENCES "tel_rooms"("id")
);
CREATE INDEX "tel_access_links_token_idx" ON "tel_access_links"("token");
CREATE INDEX "tel_access_links_room_id_idx" ON "tel_access_links"("room_id");

-- TelDocument: documentos confirmados pelo profissional (RV-TELE-010)
CREATE TABLE "tel_documents" (
  "id"           TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "room_id"      TEXT NOT NULL,
  "filename"     TEXT NOT NULL,
  "mime_type"    TEXT NOT NULL,
  "size_bytes"   INTEGER NOT NULL,
  "storage_path" TEXT NOT NULL,
  "status"       "TelDocumentStatus" NOT NULL DEFAULT 'COMPARTILHADO',
  "shared_by"    TEXT NOT NULL,
  "shared_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "confirmed_by" TEXT,
  "confirmed_at" TIMESTAMP(3),

  CONSTRAINT "tel_documents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tel_documents_room_id_fkey"
    FOREIGN KEY ("room_id") REFERENCES "tel_rooms"("id")
);
CREATE INDEX "tel_documents_room_id_idx" ON "tel_documents"("room_id");
