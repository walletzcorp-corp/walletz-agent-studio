-- Migration: explicit agent <-> WhatsApp channel assignment + contact lookup index.
--
-- Inbound WhatsApp messages must be answered ONLY by the agent explicitly assigned to the
-- receiving WhatsApp account (never "first agent of the tenant"). NULL = no AI on this channel.
-- Tenant consistency of the pair (account, agent) is enforced by the application layer.

ALTER TABLE whatsapp_accounts
  ADD COLUMN IF NOT EXISTS agent_id TEXT REFERENCES agents(id);

CREATE INDEX IF NOT EXISTS whatsapp_accounts_agent_idx ON whatsapp_accounts (agent_id);

-- find_meetings / ownership checks always filter by (tenant, contact)
CREATE INDEX IF NOT EXISTS cal_meetings_contact_idx ON calendar_meetings (tenant_id, contact_id);
