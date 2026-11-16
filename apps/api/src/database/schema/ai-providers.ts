import { pgTable, text, timestamp, boolean, jsonb, pgEnum, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createId } from '../utils/id';
import { tenants } from './tenants';
import { users } from './users';

/** Provedores de IA homologados para BYOK (chave do próprio cliente). */
export const aiProviderEnum = pgEnum('ai_provider', ['anthropic', 'openai', 'gemini', 'openrouter']);

/**
 * active        — última validação/chamada OK
 * invalid       — chave recusada (401/403) ou revogada no provedor
 * billing_error — provedor recusou por saldo/faturamento/quota
 * revoked       — removida pelo cliente (soft delete também preenche deleted_at)
 */
export const aiConnectionStatusEnum = pgEnum('ai_connection_status', [
  'active',
  'invalid',
  'billing_error',
  'revoked',
]);

export const aiProviderConnections = pgTable(
  'ai_provider_connections',
  {
    id: text('id').primaryKey().$defaultFn(createId),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    provider: aiProviderEnum('provider').notNull(),
    label: text('label'),
    /** AES-256-GCM (EncryptionService). Nunca sai da API em claro. */
    encryptedApiKey: text('encrypted_api_key').notNull(),
    /** Últimos 4 caracteres, só para exibir a máscara. */
    keyLast4: text('key_last4').notNull(),
    defaultModel: text('default_model').notNull(),
    isDefault: boolean('is_default').notNull().default(false),
    status: aiConnectionStatusEnum('status').notNull().default('active'),
    lastValidatedAt: timestamp('last_validated_at', { withTimezone: true }),
    lastError: text('last_error'),
    lastErrorAt: timestamp('last_error_at', { withTimezone: true }),
    /** Último snapshot de limites de taxa informado pelo provedor (headers). */
    rateLimits: jsonb('rate_limits'),
    createdByUserId: text('created_by_user_id').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    tenantIdx: index('ai_provider_connections_tenant_idx').on(table.tenantId),
    oneDefaultPerTenant: uniqueIndex('ai_provider_connections_default_idx')
      .on(table.tenantId)
      .where(sql`${table.isDefault} = true AND ${table.deletedAt} IS NULL`),
  }),
);

export type AiProviderConnection = typeof aiProviderConnections.$inferSelect;
export type NewAiProviderConnection = typeof aiProviderConnections.$inferInsert;
export type AiProvider = (typeof aiProviderEnum.enumValues)[number];
export type AiConnectionStatus = (typeof aiConnectionStatusEnum.enumValues)[number];
