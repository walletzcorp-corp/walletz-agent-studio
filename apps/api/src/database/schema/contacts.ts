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

export const consentStatusEnum = pgEnum('consent_status', [
  'granted',
  'revoked',
  'pending',
  'expired',
]);

export const contacts = pgTable(
  'contacts',
  {
    id: text('id').primaryKey().$defaultFn(createId),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    externalId: text('external_id'),
    firstName: text('first_name'),
    lastName: text('last_name'),
    company: text('company'),
    tags: jsonb('tags').notNull().default([]),
    customFields: jsonb('custom_fields').notNull().default({}),
    origin: text('origin'),
    timezone: text('timezone'),
    language: text('language').default('pt-BR'),
    isBlocked: boolean('is_blocked').notNull().default(false),
    blockedReason: text('blocked_reason'),
    blockedAt: timestamp('blocked_at', { withTimezone: true }),
    importBatchId: text('import_batch_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    tenantIdx: index('contacts_tenant_idx').on(table.tenantId),
  }),
);

export const contactIdentities = pgTable(
  'contact_identities',
  {
    id: text('id').primaryKey().$defaultFn(createId),
    contactId: text('contact_id')
      .notNull()
      .references(() => contacts.id),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    channel: text('channel').notNull(),
    value: text('value').notNull(),
    normalizedValue: text('normalized_value').notNull(),
    isVerified: boolean('is_verified').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantChannelValueIdx: uniqueIndex('contact_identities_tenant_channel_value_idx').on(
      table.tenantId,
      table.channel,
      table.normalizedValue,
    ),
    contactIdx: index('contact_identities_contact_idx').on(table.contactId),
  }),
);

export const consents = pgTable(
  'consents',
  {
    id: text('id').primaryKey().$defaultFn(createId),
    contactId: text('contact_id')
      .notNull()
      .references(() => contacts.id),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    channel: text('channel').notNull(),
    purpose: text('purpose').notNull(),
    status: consentStatusEnum('status').notNull().default('pending'),
    source: text('source'),
    collectedAt: timestamp('collected_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    evidenceData: jsonb('evidence_data').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    contactChannelPurposeIdx: index('consents_contact_channel_purpose_idx').on(
      table.contactId,
      table.channel,
      table.purpose,
    ),
    tenantIdx: index('consents_tenant_idx').on(table.tenantId),
  }),
);

export const suppressions = pgTable(
  'suppressions',
  {
    id: text('id').primaryKey().$defaultFn(createId),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    channel: text('channel').notNull(),
    value: text('value').notNull(),
    normalizedValue: text('normalized_value').notNull(),
    reason: text('reason').notNull(),
    suppressedAt: timestamp('suppressed_at', { withTimezone: true }).notNull().defaultNow(),
    suppressedByUserId: text('suppressed_by_user_id').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantChannelValueIdx: uniqueIndex('suppressions_tenant_channel_value_idx').on(
      table.tenantId,
      table.channel,
      table.normalizedValue,
    ),
  }),
);

export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
export type ContactIdentity = typeof contactIdentities.$inferSelect;
export type Consent = typeof consents.$inferSelect;
export type Suppression = typeof suppressions.$inferSelect;
