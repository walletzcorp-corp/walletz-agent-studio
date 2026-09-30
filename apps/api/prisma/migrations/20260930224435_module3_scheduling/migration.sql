-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('CONSULTA', 'RETORNO', 'SESSAO', 'PROCEDIMENTO', 'TELECONSULTA');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('AGENDADO', 'CONFIRMADO', 'AGUARDANDO', 'EM_ATENDIMENTO', 'FINALIZADO', 'CANCELADO', 'NAO_COMPARECEU', 'REAGENDADO');

-- CreateEnum
CREATE TYPE "RecurrenceType" AS ENUM ('SEMANAL', 'QUINZENAL', 'MENSAL');

-- CreateEnum
CREATE TYPE "WaitListStatus" AS ENUM ('AGUARDANDO', 'NOTIFICADO', 'AGENDADO', 'EXPIRADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "QueueStatus" AS ENUM ('ABERTA', 'PAUSADA', 'FECHADA');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('AGUARDANDO', 'CHAMADO', 'EM_ATENDIMENTO', 'FINALIZADO', 'DESISTIU');

-- CreateTable
CREATE TABLE "patients" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cpf" TEXT,
    "data_nasc" DATE,
    "sexo" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "row_version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availability_rules" (
    "id" TEXT NOT NULL,
    "unit_id" TEXT NOT NULL,
    "professional_id" TEXT,
    "day_of_week" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "slot_min" INTEGER NOT NULL DEFAULT 30,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "valid_from" DATE,
    "valid_until" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "availability_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_series" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "recurrence_type" "RecurrenceType",
    "total_sessions" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointment_series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "unit_id" TEXT NOT NULL,
    "professional_id" TEXT,
    "service_id" TEXT,
    "resource_id" TEXT,
    "patient_id" TEXT NOT NULL,
    "series_id" TEXT,
    "type" "AppointmentType" NOT NULL DEFAULT 'CONSULTA',
    "status" "AppointmentStatus" NOT NULL DEFAULT 'AGENDADO',
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "check_in_at" TIMESTAMP(3),
    "waiting_start_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "check_out_at" TIMESTAMP(3),
    "waiting_minutes" INTEGER,
    "delay_minutes" INTEGER,
    "notes" TEXT,
    "cancel_reason" TEXT,
    "is_online_booking" BOOLEAN NOT NULL DEFAULT false,
    "row_version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_history" (
    "id" TEXT NOT NULL,
    "appointment_id" TEXT NOT NULL,
    "from_status" "AppointmentStatus",
    "to_status" "AppointmentStatus" NOT NULL,
    "changed_by" TEXT NOT NULL,
    "reason" TEXT,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointment_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wait_list_entries" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "unit_id" TEXT,
    "professional_id" TEXT,
    "service_id" TEXT,
    "patient_id" TEXT NOT NULL,
    "scheduled_appointment_id" TEXT,
    "status" "WaitListStatus" NOT NULL DEFAULT 'AGUARDANDO',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "notified_at" TIMESTAMP(3),
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wait_list_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "queues" (
    "id" TEXT NOT NULL,
    "unit_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "QueueStatus" NOT NULL DEFAULT 'ABERTA',
    "last_ticket_number" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "queues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "queue_tickets" (
    "id" TEXT NOT NULL,
    "queue_id" TEXT NOT NULL,
    "patient_id" TEXT,
    "service_id" TEXT,
    "professional_id" TEXT,
    "ticket_number" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "priority_label" TEXT,
    "status" "TicketStatus" NOT NULL DEFAULT 'AGUARDANDO',
    "called_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "queue_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "patients_organization_id_cpf_key" ON "patients"("organization_id", "cpf");

-- CreateIndex
CREATE INDEX "appointments_unit_id_starts_at_idx" ON "appointments"("unit_id", "starts_at");

-- CreateIndex
CREATE INDEX "appointments_professional_id_starts_at_idx" ON "appointments"("professional_id", "starts_at");

-- CreateIndex
CREATE INDEX "appointments_resource_id_starts_at_idx" ON "appointments"("resource_id", "starts_at");

-- CreateIndex
CREATE INDEX "appointments_patient_id_idx" ON "appointments"("patient_id");

-- CreateIndex
CREATE UNIQUE INDEX "queues_unit_id_date_key" ON "queues"("unit_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "queue_tickets_queue_id_ticket_number_key" ON "queue_tickets"("queue_id", "ticket_number");

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_rules" ADD CONSTRAINT "availability_rules_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_rules" ADD CONSTRAINT "availability_rules_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "appointment_series"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_history" ADD CONSTRAINT "appointment_history_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wait_list_entries" ADD CONSTRAINT "wait_list_entries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wait_list_entries" ADD CONSTRAINT "wait_list_entries_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wait_list_entries" ADD CONSTRAINT "wait_list_entries_scheduled_appointment_id_fkey" FOREIGN KEY ("scheduled_appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queues" ADD CONSTRAINT "queues_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_tickets" ADD CONSTRAINT "queue_tickets_queue_id_fkey" FOREIGN KEY ("queue_id") REFERENCES "queues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_tickets" ADD CONSTRAINT "queue_tickets_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
