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

export const conversationStatusEnum = pgEnum('conversation_status', [
  'open',
  'in_progress',
  'waiting_human',
  'resolved',
  'opted_out',
]);

export const messageDirectionEnum = pgEnum('message_direction', ['inbound', 'outbound']);

export const messageStatusEnum = pgEnum('message_status', [
  'pending',
  'sent',
  'delivered',
  'read',
  'failed',
]);

export const handoffStatusEnum = pgEnum('handoff_status', [
  'active',
  'resolved',
  'returned_to_ai',
]);

export const conversations = pgTable(
  'conversations',
  {
    id: text('id').primaryKey().$defaultFn(createId),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    agentId: text('agent_id').references(() => agents.id),
    contactId: text('contact_id').notNull(),
    channel: text('channel').notNull(),
    channelConversationId: text('channel_conversation_id'),
    status: conversationStatusEnum('status').notNull().default('open'),
    assignedToUserId: text('assigned_to_user_id').references(() => users.id),
    tags: jsonb('tags').notNull().default([]),
    metadata: jsonb('metadata').notNull().default({}),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
    aiPausedAt: timestamp('ai_paused_at', { withTimezone: true }),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdx: index('conversations_tenant_idx').on(table.tenantId),
    tenantStatusIdx: index('conversations_tenant_status_idx').on(table.tenantId, table.status),
    tenantContactIdx: index('conversations_tenant_contact_idx').on(table.tenantId, table.contactId),
    lastMessageIdx: index('conversations_last_message_idx').on(table.lastMessageAt),
  }),
);

export const messages = pgTable(
  'messages',
  {
    id: text('id').primaryKey().$defaultFn(createId),
    conversationId: text('conversation_id')
      .notNull()
      .references(() => conversations.id),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    direction: messageDirectionEnum('direction').notNull(),
    status: messageStatusEnum('status').notNull().default('pending'),
    providerMessageId: text('provider_message_id'),
    content: jsonb('content').notNull(),
    sentByUserId: text('sent_by_user_id').references(() => users.id),
    sentByAgentId: text('sent_by_agent_id').references(() => agents.id),
    isAiGenerated: boolean('is_ai_generated').notNull().default(false),
    traceId: text('trace_id'),
    retriedFrom: text('retried_from'),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    readAt: timestamp('read_at', { withTimezone: true }),
    failedAt: timestamp('failed_at', { withTimezone: true }),
    failureReason: text('failure_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    conversationIdx: index('messages_conversation_idx').on(table.conversationId),
    tenantIdx: index('messages_tenant_idx').on(table.tenantId),
    providerMsgIdx: index('messages_provider_msg_idx').on(table.providerMessageId),
  }),
);

export const humanHandoffs = pgTable(
  'human_handoffs',
  {
    id: text('id').primaryKey().$defaultFn(createId),
    conversationId: text('conversation_id')
      .notNull()
      .references(() => conversations.id),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    status: handoffStatusEnum('status').notNull().default('active'),
    reason: text('reason'),
    requestedByUserId: text('requested_by_user_id').references(() => users.id),
    assignedToUserId: text('assigned_to_user_id').references(() => users.id),
    resolvedByUserId: text('resolved_by_user_id').references(() => users.id),
    summary: text('summary'),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    conversationIdx: index('human_handoffs_conversation_idx').on(table.conversationId),
    tenantIdx: index('human_handoffs_tenant_idx').on(table.tenantId),
  }),
);

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type HumanHandoff = typeof humanHandoffs.$inferSelect;
