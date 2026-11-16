import { pgTable, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { createId } from '../utils/id';

export const metaConfigurations = pgTable(
  'meta_configurations',
  {
    id: text('id').primaryKey().$defaultFn(createId),
    tenantId: text('tenant_id')
      .notNull()
      .unique()
      .references(() => tenants.id, { onDelete: 'cascade' }),

    appId: text('app_id').notNull().default(''),
    configId: text('config_id').notNull().default(''),
    encryptedAppSecret: text('encrypted_app_secret'),
    encryptedVerifyToken: text('encrypted_verify_token'),
    graphApiVersion: text('graph_api_version').notNull().default('v22.0'),

    webhookStatus: text('webhook_status').notNull().default('unknown'),
    connectionStatus: text('connection_status').notNull().default('unconfigured'),

    lastTestAt: timestamp('last_test_at', { withTimezone: true }),
    lastTestResult: jsonb('last_test_result').notNull().default({}),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index('meta_configurations_tenant_idx').on(t.tenantId),
  }),
);

export type MetaConfiguration = typeof metaConfigurations.$inferSelect;
