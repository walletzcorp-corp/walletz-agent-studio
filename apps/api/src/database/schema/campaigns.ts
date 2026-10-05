import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { createId } from '../utils/id';
import { tenants } from './tenants';
import { users } from './users';
import { agents } from './agents';

export const segmentStatusEnum = pgEnum('segment_status', ['active', 'archived']);

export const campaignStatusEnum = pgEnum('campaign_status', [
  'draft',
  'scheduled',
  'running',
  'paused',
  'completed',
  'cancelled',
  'failed',
]);

export const segments = pgTable(
  'segments',
  {
    id: text('id').primaryKey().$defaultFn(createId),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    name: text('name').notNull(),
    description: text('description'),
    filters: jsonb('filters').notNull().default({}),
    status: segmentStatusEnum('status').notNull().default('active'),
    contactCount: integer('contact_count').notNull().default(0),
    createdByUserId: text('created_by_user_id').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    tenantIdx: index('segments_tenant_idx').on(table.tenantId),
  }),
);

export const campaigns = pgTable(
  'campaigns',
  {
    id: text('id').primaryKey().$defaultFn(createId),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    agentId: text('agent_id').references(() => agents.id),
    name: text('name').notNull(),
    objective: text('objective'),
    status: campaignStatusEnum('status').notNull().default('draft'),
    channel: text('channel').notNull().default('whatsapp'),
    segmentId: text('segment_id').references(() => segments.id),
    templateName: text('template_name'),
    templateLanguage: text('template_language'),
    templateComponents: jsonb('template_components').notNull().default([]),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    totalTargeted: integer('total_targeted').notNull().default(0),
    totalEligible: integer('total_eligible').notNull().default(0),
    totalBlocked: integer('total_blocked').notNull().default(0),
    totalSent: integer('total_sent').notNull().default(0),
    totalFailed: integer('total_failed').notNull().default(0),
    totalReplied: integer('total_replied').notNull().default(0),
    createdByUserId: text('created_by_user_id').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    tenantIdx: index('campaigns_tenant_idx').on(table.tenantId),
    tenantStatusIdx: index('campaigns_tenant_status_idx').on(table.tenantId, table.status),
  }),
);

export const campaignRecipients = pgTable(
  'campaign_recipients',
  {
    id: text('id').primaryKey().$defaultFn(createId),
    campaignId: text('campaign_id')
      .notNull()
      .references(() => campaigns.id),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    contactId: text('contact_id').notNull(),
    phone: text('phone').notNull(),
    status: text('status').notNull().default('pending'),
    blockedReason: text('blocked_reason'),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    failedAt: timestamp('failed_at', { withTimezone: true }),
    repliedAt: timestamp('replied_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    campaignIdx: index('campaign_recipients_campaign_idx').on(table.campaignId),
    tenantIdx: index('campaign_recipients_tenant_idx').on(table.tenantId),
  }),
);

export type Segment = typeof segments.$inferSelect;
export type Campaign = typeof campaigns.$inferSelect;
export type CampaignRecipient = typeof campaignRecipients.$inferSelect;
