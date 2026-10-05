import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  real,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { createId } from '../utils/id';
import { tenants } from './tenants';

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'trialing',
  'active',
  'past_due',
  'canceled',
  'paused',
  'incomplete',
]);

export const plans = pgTable(
  'plans',
  {
    id: text('id').primaryKey().$defaultFn(createId),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    isActive: boolean('is_active').notNull().default(true),
    limits: jsonb('limits').notNull().default({}),
    features: jsonb('features').notNull().default({}),
    priceMonthly: integer('price_monthly'),
    priceYearly: integer('price_yearly'),
    currency: text('currency').notNull().default('BRL'),
    trialDays: integer('trial_days').notNull().default(14),
    providerPlanId: jsonb('provider_plan_id').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    slugIdx: uniqueIndex('plans_slug_idx').on(table.slug),
  }),
);

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: text('id').primaryKey().$defaultFn(createId),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    planId: text('plan_id')
      .notNull()
      .references(() => plans.id),
    status: subscriptionStatusEnum('status').notNull().default('trialing'),
    currentPeriodStart: timestamp('current_period_start', { withTimezone: true }),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
    canceledAt: timestamp('canceled_at', { withTimezone: true }),
    gracePeriodEnd: timestamp('grace_period_end', { withTimezone: true }),
    providerCustomerId: text('provider_customer_id'),
    providerSubscriptionId: text('provider_subscription_id'),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdx: index('subscriptions_tenant_idx').on(table.tenantId),
    providerSubIdx: index('subscriptions_provider_sub_idx').on(table.providerSubscriptionId),
  }),
);

export const usageEvents = pgTable(
  'usage_events',
  {
    id: text('id').primaryKey().$defaultFn(createId),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    subscriptionId: text('subscription_id').references(() => subscriptions.id),
    metric: text('metric').notNull(),
    quantity: real('quantity').notNull(),
    resourceId: text('resource_id'),
    resourceType: text('resource_type'),
    metadata: jsonb('metadata').notNull().default({}),
    recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantMetricIdx: index('usage_events_tenant_metric_idx').on(table.tenantId, table.metric),
    tenantIdx: index('usage_events_tenant_idx').on(table.tenantId),
    recordedAtIdx: index('usage_events_recorded_at_idx').on(table.recordedAt),
  }),
);

export type Plan = typeof plans.$inferSelect;
export type NewPlan = typeof plans.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type UsageEvent = typeof usageEvents.$inferSelect;
export type NewUsageEvent = typeof usageEvents.$inferInsert;
