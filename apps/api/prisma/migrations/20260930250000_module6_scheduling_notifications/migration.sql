-- Module 6: Scheduling notifications (RF-AGE-006) and secure tokens (RF-AGE-007)

-- AppointmentNotification: idempotent notification tracking
CREATE TABLE "appointment_notifications" (
  "id"               TEXT         NOT NULL,
  "appointment_id"   TEXT         NOT NULL,
  "organization_id"  TEXT         NOT NULL,
  "channel"          TEXT         NOT NULL,
  "event"            TEXT         NOT NULL,
  "idempotency_key"  TEXT         NOT NULL,
  "status"           TEXT         NOT NULL DEFAULT 'PENDENTE',
  "recipient"        TEXT         NOT NULL,
  "content"          TEXT,
  "sent_at"          TIMESTAMPTZ,
  "fail_reason"      TEXT,
  "is_demo"          BOOLEAN      NOT NULL DEFAULT FALSE,
  "created_at"       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT "appointment_notifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "appointment_notifications_idempotency_key_key" UNIQUE ("idempotency_key"),
  CONSTRAINT "appointment_notifications_appointment_id_fkey"
    FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE
);

CREATE INDEX "appointment_notifications_appointment_id_idx"
  ON "appointment_notifications"("appointment_id");

-- AppointmentToken: secure link tokens (NEVER logged in plaintext)
CREATE TABLE "appointment_tokens" (
  "id"               TEXT         NOT NULL,
  "appointment_id"   TEXT         NOT NULL,
  "organization_id"  TEXT         NOT NULL,
  "token"            TEXT         NOT NULL,
  "action"           TEXT         NOT NULL,
  "expires_at"       TIMESTAMPTZ  NOT NULL,
  "used_at"          TIMESTAMPTZ,
  "created_at"       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT "appointment_tokens_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "appointment_tokens_token_key" UNIQUE ("token"),
  CONSTRAINT "appointment_tokens_appointment_id_fkey"
    FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE
);

CREATE INDEX "appointment_tokens_appointment_id_idx"
  ON "appointment_tokens"("appointment_id");
