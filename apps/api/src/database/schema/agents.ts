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

export const agentStatusEnum = pgEnum('agent_status', [
  'draft',
  'testing',
  'published',
  'paused',
  'archived',
]);

export const agentTemplateEnum = pgEnum('agent_template', [
  'sdr',
  'commercial',
  'reception_scheduling',
  'customer_service',
  'post_sale',
  'collection',
  'faq',
  'custom',
]);

export const agents = pgTable(
  'agents',
  {
    id: text('id').primaryKey().$defaultFn(createId),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    name: text('name').notNull(),
    title: text('title'),
    status: agentStatusEnum('status').notNull().default('draft'),
    template: agentTemplateEnum('template').notNull().default('custom'),
    objective: text('objective'),
    persona: jsonb('persona').notNull().default({}),
    tone: text('tone').default('professional'),
    language: text('language').default('pt-BR'),
    channels: jsonb('channels').notNull().default([]),
    workingHours: jsonb('working_hours').notNull().default({}),
    handoffCriteria: jsonb('handoff_criteria').notNull().default({}),
    currentReleaseId: text('current_release_id'),
    createdByUserId: text('created_by_user_id').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    tenantIdx: index('agents_tenant_idx').on(table.tenantId),
    tenantStatusIdx: index('agents_tenant_status_idx').on(table.tenantId, table.status),
  }),
);

export const agentReleases = pgTable(
  'agent_releases',
  {
    id: text('id').primaryKey().$defaultFn(createId),
    agentId: text('agent_id')
      .notNull()
      .references(() => agents.id),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    version: integer('version').notNull(),
    config: jsonb('config').notNull(),
    knowledgeReleaseId: text('knowledge_release_id'),
    evalSuiteId: text('eval_suite_id'),
    publishedByUserId: text('published_by_user_id').references(() => users.id),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    rolledBackAt: timestamp('rolled_back_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    agentVersionIdx: uniqueIndex('agent_releases_agent_version_idx').on(
      table.agentId,
      table.version,
    ),
    tenantIdx: index('agent_releases_tenant_idx').on(table.tenantId),
  }),
);

export const agentToolPermissions = pgTable(
  'agent_tool_permissions',
  {
    id: text('id').primaryKey().$defaultFn(createId),
    agentId: text('agent_id')
      .notNull()
      .references(() => agents.id),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    toolName: text('tool_name').notNull(),
    allowed: boolean('allowed').notNull().default(false),
    constraints: jsonb('constraints').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    agentToolIdx: uniqueIndex('agent_tool_permissions_agent_tool_idx').on(
      table.agentId,
      table.toolName,
    ),
    tenantIdx: index('agent_tool_permissions_tenant_idx').on(table.tenantId),
  }),
);

export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;
export type AgentRelease = typeof agentReleases.$inferSelect;
export type NewAgentRelease = typeof agentReleases.$inferInsert;
export type AgentToolPermission = typeof agentToolPermissions.$inferSelect;
