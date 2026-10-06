-- Sprint 6b: Add conversation/contact linkage to calendar_meetings
-- Enables traceability from WhatsApp conversation to real calendar event

ALTER TABLE "calendar_meetings"
  ADD COLUMN IF NOT EXISTS "conversation_id" text,
  ADD COLUMN IF NOT EXISTS "contact_id"      text;

CREATE INDEX IF NOT EXISTS "cal_meetings_conversation_idx"
  ON "calendar_meetings" ("conversation_id");

CREATE INDEX IF NOT EXISTS "cal_meetings_contact_idx"
  ON "calendar_meetings" ("contact_id");
