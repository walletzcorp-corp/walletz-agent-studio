import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  pgEnum,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createId } from '../utils/id';

export const tenantStatusEnum = pgEnum('tenant_status', [
  'trial',
  'active',
  'suspended',
  'cancelled',
]);

/** Tipo do cliente: pessoa física (CPF) ou jurídica (CNPJ). */
export const customerTypeEnum = pgEnum('customer_type', ['pf', 'pj']);

export const tenants = pgTable(
  'tenants',
  {
    id: text('id').primaryKey().$defaultFn(createId),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    status: tenantStatusEnum('status').notNull().default('trial'),
    timezone: text('timezone').notNull().default('America/Sao_Paulo'),
    locale: text('locale').notNull().default('pt-BR'),
    country: text('country').notNull().default('BR'),
    currency: text('currency').notNull().default('BRL'),
    planId: text('plan_id'),
    trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
    settings: jsonb('settings').notNull().default({}),
    featureFlags: jsonb('feature_flags').notNull().default({}),
    /** Limite mensal de tokens de LLM (entrada + saída). null = sem limite.
     *  Coluna própria (não `settings`) para o tenant não conseguir alterá-la
     *  via PATCH /settings; só o admin da plataforma define. */
    llmMonthlyTokenLimit: integer('llm_monthly_token_limit'),
    /** Dados cadastrais do cliente: definidos pelo admin da plataforma, fora de `settings`. */
    customerType: customerTypeEnum('customer_type').notNull().default('pj'),
    /** CPF (11 dígitos) ou CNPJ (14 dígitos), só números. */
    taxId: text('tax_id'),
    contactPhone: text('contact_phone'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    slugIdx: uniqueIndex('tenants_slug_idx').on(table.slug),
    taxIdIdx: uniqueIndex('tenants_tax_id_idx').on(table.taxId).where(sql`${table.deletedAt} IS NULL AND ${table.taxId} IS NOT NULL`),
    customerTypeIdx: index('tenants_customer_type_idx').on(table.customerType),
  }),
);

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
