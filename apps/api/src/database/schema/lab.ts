import {
  pgTable,
  text,
  timestamp,
  jsonb,
  integer,
  index,
} from 'drizzle-orm/pg-core';
import { createId } from '../utils/id';
import { tenants } from './tenants';
import { users } from './users';
import { agents } from './agents';

/**
 * Conversas do Laboratório (mode=LAB).
 * Isoladas das conversas de produção (WhatsApp, e-mail, webchat).
 */
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
    /** Versão/release do agente no momento da criação. */
    agentVersion: text('agent_version'),
    title: text('title').notNull().default('Nova conversa'),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantAgentIdx: index('lab_conv_tenant_agent_idx').on(table.tenantId, table.agentId),
    tenantUserIdx: index('lab_conv_tenant_user_idx').on(table.tenantId, table.userId),
    lastMessageIdx: index('lab_conv_last_message_idx').on(table.lastMessageAt),
  }),
);

/**
 * Mensagens de uma conversa de Laboratório.
 * role: 'user' | 'assistant' | 'error'
 */
export const labMessages = pgTable(
  'lab_messages',
  {
    id: text('id').primaryKey().$defaultFn(createId),
    conversationId: text('conversation_id')
      .notNull()
      .references(() => labConversations.id),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    role: text('role').notNull(), // 'user' | 'assistant' | 'error'
    content: text('content').notNull(),
    provider: text('provider'),
    model: text('model'),
    inputTokens: integer('input_tokens'),
    outputTokens: integer('output_tokens'),
    traceId: text('trace_id'),
    retrievedChunks: jsonb('retrieved_chunks'),
    toolCallsExecuted: jsonb('tool_calls_executed'),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    conversationIdx: index('lab_msg_conversation_idx').on(table.conversationId),
    tenantIdx: index('lab_msg_tenant_idx').on(table.tenantId),
  }),
);

export type LabConversation = typeof labConversations.$inferSelect;
export type NewLabConversation = typeof labConversations.$inferInsert;
export type LabMessage = typeof labMessages.$inferSelect;
export type NewLabMessage = typeof labMessages.$inferInsert;
