-- Migration: PC Connector devices and commands

CREATE TABLE IF NOT EXISTS pc_devices (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  device_name TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'windows',
  pairing_token TEXT,
  pairing_expires_at TIMESTAMPTZ,
  paired_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  capabilities JSONB NOT NULL DEFAULT '{"files":{"read":true,"create":true,"rename":false,"move":false,"delete":false},"apps":{"open":false,"close":false},"browser":{"openUrl":true},"system":{"info":true}}',
  authorized_agent_ids JSONB NOT NULL DEFAULT '[]',
  authorized_paths JSONB NOT NULL DEFAULT '[]',
  authorized_apps JSONB NOT NULL DEFAULT '["notepad.exe","calc.exe","msedge.exe"]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pc_commands (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL REFERENCES pc_devices(id),
  tenant_id TEXT NOT NULL,
  agent_id TEXT,
  tool_name TEXT NOT NULL,
  params JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  result JSONB,
  error TEXT,
  risk_level TEXT NOT NULL DEFAULT 'low',
  requires_approval BOOLEAN NOT NULL DEFAULT false,
  approved_at TIMESTAMPTZ,
  approved_by_user_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS pc_devices_tenant_idx ON pc_devices(tenant_id);
CREATE INDEX IF NOT EXISTS pc_commands_device_status_idx ON pc_commands(device_id, status);
CREATE INDEX IF NOT EXISTS pc_commands_created_at_idx ON pc_commands(created_at);
