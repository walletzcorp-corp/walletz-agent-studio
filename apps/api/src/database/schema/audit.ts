import { pgTable, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { createId } from '../utils/id';
import { tenants } from './tenants';

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: text('id').primaryKey().$defaultFn(createId),
    tenantId: text('tenant_id').references(() => tenants.id),
    userId: text('user_id'),
    sessionId: text('session_id'),
    action: text('action').notNull(),
    resourceType: text('resource_type').notNull(),
    resourceId: text('resource_id'),
    previousState: jsonb('previous_state'),
    newState: jsonb('new_state'),
    metadata: jsonb('metadata').notNull().default({}),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    traceId: text('trace_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdx: index('audit_logs_tenant_idx').on(table.tenantId),
    tenantActionIdx: index('audit_logs_tenant_action_idx').on(table.tenantId, table.action),
    userIdx: index('audit_logs_user_idx').on(table.userId),
    resourceIdx: index('audit_logs_resource_idx').on(table.resourceType, table.resourceId),
    createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt),
  }),
);

export const outboxEvents = pgTable(
  'outbox_events',
  {
    id: text('id').primaryKey().$defaultFn(createId),
    tenantId: text('tenant_id').references(() => tenants.id),
    eventType: text('event_type').notNull(),
    payload: jsonb('payload').notNull(),
    published: text('published').notNull().default('pending'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    retryCount: text('retry_count').notNull().default('0'),
    lastError: text('last_error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pendingIdx: index('outbox_events_pending_idx').on(table.published),
    tenantIdx: index('outbox_events_tenant_idx').on(table.tenantId),
    createdAtIdx: index('outbox_events_created_at_idx').on(table.createdAt),
  }),
);

export const webhookReceipts = pgTable(
  'webhook_receipts',
  {
    id: text('id').primaryKey().$defaultFn(createId),
    tenantId: text('tenant_id').references(() => tenants.id),
    source: text('source').notNull(),
    providerEventId: text('provider_event_id').notNull(),
    eventType: text('event_type'),
    rawPayload: jsonb('raw_payload').notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    processingError: text('processing_error'),
    jobId: text('job_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    sourceEventIdx: index('webhook_receipts_source_event_idx').on(
      table.source,
      table.providerEventId,
    ),
    tenantIdx: index('webhook_receipts_tenant_idx').on(table.tenantId),
  }),
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
export type OutboxEvent = typeof outboxEvents.$inferSelect;
export type WebhookReceipt = typeof webhookReceipts.$inferSelect;
