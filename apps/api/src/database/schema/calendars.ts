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
import { agents } from './agents';

export const calendarProviderEnum = pgEnum('calendar_provider', ['google', 'microsoft']);

export const calendarSyncStatusEnum = pgEnum('calendar_sync_status', [
  'synced',
  'pending',
  'error',
  'disconnected',
  'reauth_required',
]);

export const meetingStatusEnum = pgEnum('meeting_status', [
  'confirmed',
  'pending',
  'cancelled',
  'rescheduled',
]);

export const meetingPlatformEnum = pgEnum('meeting_platform', [
  'google_meet',
  'teams',
  'presencial',
  'phone',
]);

export const meetingOriginEnum = pgEnum('meeting_origin', ['agent', 'manual']);

/* ── Calendar Connections ── */
export const calendarConnections = pgTable(
  'calendar_connections',
  {
    id: text('id').primaryKey().$defaultFn(createId),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    connectedByUserId: text('connected_by_user_id').references(() => users.id),
    provider: calendarProviderEnum('provider').notNull(),
    email: text('email').notNull(),
    displayName: text('display_name'),
    externalAccountId: text('external_account_id'),
    /* AES-256 encrypted tokens — never stored plaintext */
    encryptedAccessToken: text('encrypted_access_token').notNull(),
    encryptedRefreshToken: text('encrypted_refresh_token'),
    tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
    scopes: text('scopes').array(),
    syncStatus: calendarSyncStatusEnum('sync_status').notNull().default('pending'),
    lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
    syncError: text('sync_error'),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => ({
    tenantIdx: index('cal_connections_tenant_idx').on(t.tenantId),
    providerEmailIdx: uniqueIndex('cal_connections_provider_email_idx').on(
      t.tenantId,
      t.provider,
      t.email,
    ),
  }),
);

/* ── Meetings ── */
export const calendarMeetings = pgTable(
  'calendar_meetings',
  {
    id: text('id').primaryKey().$defaultFn(createId),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    connectionId: text('connection_id').references(() => calendarConnections.id),
    agentId: text('agent_id').references(() => agents.id),
    /** Conversa que originou o agendamento (rastreabilidade) */
    conversationId: text('conversation_id'),
    /** Contato/lead associado */
    contactId: text('contact_id'),
    /** ID returned by the calendar provider — mandatory before confirming */
    externalEventId: text('external_event_id'),
    externalMeetUrl: text('external_meet_url'),
    title: text('title').notNull(),
    description: text('description'),
    contactName: text('contact_name'),
    contactEmail: text('contact_email'),
    status: meetingStatusEnum('status').notNull().default('pending'),
    platform: meetingPlatformEnum('platform').notNull().default('google_meet'),
    origin: meetingOriginEnum('origin').notNull().default('manual'),
    startAt: timestamp('start_at', { withTimezone: true }).notNull(),
    endAt: timestamp('end_at', { withTimezone: true }).notNull(),
    durationMinutes: integer('duration_minutes').notNull().default(30),
    timeZone: text('time_zone').notNull().default('America/Sao_Paulo'),
    attendees: jsonb('attendees').default([]),
    cancellationReason: text('cancellation_reason'),
    rescheduledFromId: text('rescheduled_from_id'),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => ({
    tenantIdx: index('cal_meetings_tenant_idx').on(t.tenantId),
    startAtIdx: index('cal_meetings_start_at_idx').on(t.tenantId, t.startAt),
    externalEventIdx: index('cal_meetings_external_event_idx').on(t.externalEventId),
    contactIdx: index('cal_meetings_contact_idx').on(t.tenantId, t.contactId),
  }),
);

/* ── Agent scheduling settings ── */
export const agentCalendarSettings = pgTable(
  'agent_calendar_settings',
  {
    id: text('id').primaryKey().$defaultFn(createId),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    agentId: text('agent_id')
      .notNull()
      .references(() => agents.id),
    connectionId: text('connection_id').references(() => calendarConnections.id),
    canSchedule: boolean('can_schedule').notNull().default(false),
    defaultDurationMinutes: integer('default_duration_minutes').notNull().default(30),
    bufferMinutes: integer('buffer_minutes').notNull().default(15),
    maxMeetingsPerDay: integer('max_meetings_per_day').notNull().default(8),
    minLeadTimeMinutes: integer('min_lead_time_minutes').notNull().default(120),
    defaultPlatform: meetingPlatformEnum('default_platform').notNull().default('google_meet'),
    availableHours: jsonb('available_hours').default({
      mon: { start: '09:00', end: '18:00', enabled: true },
      tue: { start: '09:00', end: '18:00', enabled: true },
      wed: { start: '09:00', end: '18:00', enabled: true },
      thu: { start: '09:00', end: '18:00', enabled: true },
      fri: { start: '09:00', end: '18:00', enabled: true },
      sat: { start: null, end: null, enabled: false },
      sun: { start: null, end: null, enabled: false },
    }),
    timeZone: text('time_zone').notNull().default('America/Sao_Paulo'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index('agent_cal_settings_tenant_idx').on(t.tenantId),
    agentIdx: uniqueIndex('agent_cal_settings_agent_idx').on(t.agentId),
  }),
);

export type CalendarConnection = typeof calendarConnections.$inferSelect;
export type NewCalendarConnection = typeof calendarConnections.$inferInsert;
export type CalendarMeeting = typeof calendarMeetings.$inferSelect;
export type NewCalendarMeeting = typeof calendarMeetings.$inferInsert;
export type AgentCalendarSettings = typeof agentCalendarSettings.$inferSelect;
