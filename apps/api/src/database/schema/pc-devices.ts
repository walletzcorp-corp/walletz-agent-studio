import { pgTable, text, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const pcDevices = pgTable('pc_devices', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id')
    .notNull()
    .references(() => tenants.id),
  deviceName: text('device_name').notNull(),
  platform: text('platform').notNull().default('windows'),
  pairingToken: text('pairing_token'),
  pairingExpiresAt: timestamp('pairing_expires_at', { withTimezone: true }),
  deviceSecretHash: text('device_secret_hash'),
  pairedAt: timestamp('paired_at', { withTimezone: true }),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
  capabilities: jsonb('capabilities')
    .notNull()
    .default({
      files: { read: true, create: true, rename: false, move: false, delete: false },
      apps: { open: false, close: false },
      browser: { openUrl: true },
      system: { info: true },
    }),
  authorizedAgentIds: jsonb('authorized_agent_ids').notNull().default([]),
  authorizedPaths: jsonb('authorized_paths').notNull().default([]),
  authorizedApps: jsonb('authorized_apps')
    .notNull()
    .default(['notepad.exe', 'calc.exe', 'msedge.exe']),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const pcCommands = pgTable('pc_commands', {
  id: text('id').primaryKey(),
  deviceId: text('device_id')
    .notNull()
    .references(() => pcDevices.id),
  tenantId: text('tenant_id').notNull(),
  agentId: text('agent_id'),
  toolName: text('tool_name').notNull(),
  params: jsonb('params').notNull().default({}),
  status: text('status').notNull().default('pending'), // pending | executing | completed | failed | timeout
  result: jsonb('result'),
  error: text('error'),
  riskLevel: text('risk_level').notNull().default('low'), // low | medium | high
  requiresApproval: boolean('requires_approval').notNull().default(false),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  approvedByUserId: text('approved_by_user_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
});

export type PcDevice = typeof pcDevices.$inferSelect;
export type NewPcDevice = typeof pcDevices.$inferInsert;
export type PcCommand = typeof pcCommands.$inferSelect;
export type NewPcCommand = typeof pcCommands.$inferInsert;
