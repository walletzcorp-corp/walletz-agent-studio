import { pgTable, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { createId } from '../utils/id';
import { tenants } from './tenants';
import { users } from './users';
import { agents } from './agents';

export const labConversations = pgTable(
  'lab_conversations',
  {
    id: text('id').primaryKey().$defaultFn(createId),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    agentId: text('agent_id')
      .notNull()
      .references(() => agents.id),
    title: text('title').notNull().default('Nova conversa'),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantUserIdx: index('lab_conversations_tenant_user_idx').on(table.tenantId, table.userId),
    tenantAgentIdx: index('lab_conversations_tenant_agent_idx').on(table.tenantId, table.agentId),
  }),
);

export const labMessages = pgTable(
  'lab_messages',
  {
    id: text('id').primaryKey().$defaultFn(createId),
    conversationId: text('conversation_id')
      .notNull()
      .references(() => labConversations.id, { onDelete: 'cascade' }),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    role: text('role').notNull().$type<'user' | 'assistant'>(),
    content: text('content').notNull(),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    conversationIdx: index('lab_messages_conversation_idx').on(table.conversationId),
    tenantIdx: index('lab_messages_tenant_idx').on(table.tenantId),
  }),
);

export type LabConversation = typeof labConversations.$inferSelect;
export type NewLabConversation = typeof labConversations.$inferInsert;
export type LabMessage = typeof labMessages.$inferSelect;
export type NewLabMessage = typeof labMessages.$inferInsert;
