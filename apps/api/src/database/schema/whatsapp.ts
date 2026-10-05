import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { createId } from '../utils/id';
import { tenants } from './tenants';
import { users } from './users';

export const waAccountStatusEnum = pgEnum('wa_account_status', [
  'pending',
  'connected',
  'disconnected',
  'suspended',
  'error',
]);

export const waMessageStatusEnum = pgEnum('wa_message_status', [
  'pending',
  'sent',
  'delivered',
  'read',
  'failed',
]);

export const waMessageDirectionEnum = pgEnum('wa_message_direction', ['inbound', 'outbound']);

export const whatsappAccounts = pgTable(
  'whatsapp_accounts',
  {
    id: text('id').primaryKey().$defaultFn(createId),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    displayName: text('display_name'),
    phoneNumber: text('phone_number'),
    phoneNumberId: text('phone_number_id').notNull(),
    wabaId: text('waba_id').notNull(),
    accessToken: text('access_token').notNull(),
    appSecret: text('app_secret'),
    verifyToken: text('verify_token').notNull(),
    webhookUrl: text('webhook_url'),
    status: waAccountStatusEnum('status').notNull().default('pending'),
    qualityRating: text('quality_rating'),
    messagingLimitTier: text('messaging_limit_tier'),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
    connectedByUserId: text('connected_by_user_id').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    tenantIdx: index('whatsapp_accounts_tenant_idx').on(table.tenantId),
    phoneNumberIdIdx: uniqueIndex('whatsapp_accounts_phone_number_id_idx').on(table.phoneNumberId),
  }),
);

export const whatsappTemplates = pgTable(
  'whatsapp_templates',
  {
    id: text('id').primaryKey().$defaultFn(createId),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    accountId: text('account_id')
      .notNull()
      .references(() => whatsappAccounts.id),
    templateId: text('template_id').notNull(),
    name: text('name').notNull(),
    language: text('language').notNull().default('pt_BR'),
    category: text('category').notNull(),
    status: text('status').notNull(),
    components: jsonb('components').notNull().default([]),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdx: index('whatsapp_templates_tenant_idx').on(table.tenantId),
    accountTemplateIdx: uniqueIndex('whatsapp_templates_account_template_idx').on(
      table.accountId,
      table.templateId,
    ),
  }),
);

export const whatsappMessageLogs = pgTable(
  'whatsapp_message_logs',
  {
    id: text('id').primaryKey().$defaultFn(createId),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    accountId: text('account_id')
      .notNull()
      .references(() => whatsappAccounts.id),
    direction: waMessageDirectionEnum('direction').notNull(),
    status: waMessageStatusEnum('status').notNull().default('pending'),
    providerMessageId: text('provider_message_id'),
    to: text('to'),
    from: text('from'),
    messageType: text('message_type').notNull().default('text'),
    content: jsonb('content').notNull(),
    conversationId: text('conversation_id'),
    contactId: text('contact_id'),
    errorCode: text('error_code'),
    errorMessage: text('error_message'),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    readAt: timestamp('read_at', { withTimezone: true }),
    failedAt: timestamp('failed_at', { withTimezone: true }),
    idempotencyKey: text('idempotency_key'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdx: index('whatsapp_message_logs_tenant_idx').on(table.tenantId),
    providerMsgIdx: index('whatsapp_message_logs_provider_msg_idx').on(table.providerMessageId),
    conversationIdx: index('whatsapp_message_logs_conversation_idx').on(table.conversationId),
    idempotencyIdx: uniqueIndex('whatsapp_message_logs_idempotency_idx').on(
      table.tenantId,
      table.idempotencyKey,
    ),
  }),
);

export type WhatsappAccount = typeof whatsappAccounts.$inferSelect;
export type NewWhatsappAccount = typeof whatsappAccounts.$inferInsert;
export type WhatsappTemplate = typeof whatsappTemplates.$inferSelect;
export type WhatsappMessageLog = typeof whatsappMessageLogs.$inferSelect;
