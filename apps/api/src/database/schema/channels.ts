import { pgTable, text, timestamp, boolean, jsonb, integer, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { createId } from '../utils/id';
import { tenants } from './tenants';
import { agents } from './agents';
import { users } from './users';

/** Webchat incorporável ao site do cliente (canal do plano Starter em diante). */
export const webchatWidgets = pgTable(
  'webchat_widgets',
  {
    id: text('id').primaryKey().$defaultFn(createId),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    agentId: text('agent_id')
      .notNull()
      .references(() => agents.id),
    name: text('name').notNull(),
    /** Identificador público usado no código de incorporação (não é segredo). */
    publicKey: text('public_key').notNull(),
    /** Origens (https://site.com) autorizadas a usar o widget. Vazio = qualquer origem. */
    allowedOrigins: jsonb('allowed_origins').notNull().default([]),
    title: text('title').notNull().default('Fale com a gente'),
    welcomeMessage: text('welcome_message'),
    primaryColor: text('primary_color').notNull().default('#0f766e'),
    isEnabled: boolean('is_enabled').notNull().default(true),
    createdByUserId: text('created_by_user_id').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    tenantIdx: index('webchat_widgets_tenant_idx').on(table.tenantId),
    publicKeyIdx: uniqueIndex('webchat_widgets_public_key_idx').on(table.publicKey),
  }),
);

/** Webhook de saída: eventos do Studio enviados para um sistema do cliente. */
export const outboundWebhooks = pgTable(
  'outbound_webhooks',
  {
    id: text('id').primaryKey().$defaultFn(createId),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    url: text('url').notNull(),
    description: text('description'),
    /** Segredo de assinatura HMAC-SHA256, criptografado (EncryptionService). */
    encryptedSecret: text('encrypted_secret').notNull(),
    events: jsonb('events').notNull().default([]),
    isActive: boolean('is_active').notNull().default(true),
    lastDeliveryAt: timestamp('last_delivery_at', { withTimezone: true }),
    lastDeliveryStatus: integer('last_delivery_status'),
    lastDeliveryError: text('last_delivery_error'),
    consecutiveFailures: integer('consecutive_failures').notNull().default(0),
    createdByUserId: text('created_by_user_id').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    tenantIdx: index('outbound_webhooks_tenant_idx').on(table.tenantId),
  }),
);

export type WebchatWidget = typeof webchatWidgets.$inferSelect;
export type OutboundWebhook = typeof outboundWebhooks.$inferSelect;
