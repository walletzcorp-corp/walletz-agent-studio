-- Migration: Add device_secret_hash to pc_devices for public route authentication
-- PC Connector script must present X-Device-Secret header on poll/result endpoints.

ALTER TABLE pc_devices
  ADD COLUMN IF NOT EXISTS device_secret_hash TEXT;
