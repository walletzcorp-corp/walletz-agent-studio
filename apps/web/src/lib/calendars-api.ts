import { api, planErrorMessage } from './api';
import type { CalendarProvider } from './calendar-connect';

export type SyncStatus = 'synced' | 'pending' | 'error' | 'disconnected' | 'reauth_required';

export interface CalendarConnection {
  id: string;
  provider: CalendarProvider;
  email: string;
  displayName: string | null;
  syncStatus: SyncStatus;
  syncError: string | null;
  lastSyncAt: string | null;
}

export type MeetingPlatform = 'google_meet' | 'teams' | 'presencial' | 'phone';

export interface Meeting {
  id: string;
  connectionId: string | null;
  agentId: string | null;
  externalEventId: string | null;
  externalMeetUrl: string | null;
  title: string;
  description: string | null;
  contactName: string | null;
  contactEmail: string | null;
  status: 'confirmed' | 'pending' | 'cancelled' | 'rescheduled';
  platform: MeetingPlatform;
  origin: 'agent' | 'manual';
  startAt: string;
  endAt: string;
  durationMinutes: number;
}

export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export interface DayWindow { enabled: boolean; start: string | null; end: string | null }

export interface AgentScheduleSettings {
  canSchedule: boolean;
  connectionId: string | null;
  defaultDurationMinutes: number;
  bufferMinutes: number;
  minLeadTimeMinutes: number;
  defaultPlatform: MeetingPlatform;
  availableHours: Partial<Record<DayKey, DayWindow>>;
}

export interface NewMeeting {
  title: string;
  contactName?: string | undefined;
  contactEmail?: string | undefined;
  startAt: string;
  endAt: string;
  platform: MeetingPlatform;
  connectionId?: string | undefined;
}

const base = (tenantId: string): string => `/tenants/${tenantId}/calendars`;

export const calendarsApi = {
  connections: (tenantId: string) => api.get<CalendarConnection[]>(`${base(tenantId)}/connections`),
  disconnect: (tenantId: string, id: string) =>
    api.delete<{ revocation: string }>(`${base(tenantId)}/connections/${id}`),
  check: (tenantId: string) =>
    api.post<{ checked: number; synced: number; failed: number }>(`${base(tenantId)}/sync`),
  meetings: (tenantId: string, from: Date, to: Date) =>
    api.get<Meeting[]>(`${base(tenantId)}/meetings`, { params: { from: from.toISOString(), to: to.toISOString() } }),
  createMeeting: (tenantId: string, data: NewMeeting) => api.post<Meeting>(`${base(tenantId)}/meetings`, data),
  reschedule: (tenantId: string, id: string, data: { startAt: string; endAt: string }) =>
    api.patch<Meeting>(`${base(tenantId)}/meetings/${id}/reschedule`, data),
  cancel: (tenantId: string, id: string) => api.delete(`${base(tenantId)}/meetings/${id}`, { data: {} }),
  agentSettings: (tenantId: string, agentId: string) =>
    api.get<AgentScheduleSettings | null | ''>(`${base(tenantId)}/agents/${agentId}/settings`),
  saveAgentSettings: (tenantId: string, agentId: string, data: Partial<AgentScheduleSettings>) =>
    api.patch<AgentScheduleSettings>(`${base(tenantId)}/agents/${agentId}/settings`, data),
};

/** Mensagem da API quando houver; senão o texto padrão. */
export function apiErrorMessage(err: unknown, fallback: string): string {
  const plan = planErrorMessage(err);
  if (plan) return plan;
  const res = (err as { response?: { status?: number; data?: { message?: unknown } } })?.response;
  if (res?.status === 403) return 'Você não tem permissão para esta ação.';
  const message = res?.data?.message;
  if (Array.isArray(message)) return message.join(' ');
  return typeof message === 'string' ? message : fallback;
}

/* ── Horário de Brasília (independe do fuso do computador) ── */

const TZ = 'America/Sao_Paulo';

function wallClock(instant: Date): Date {
  const p = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(instant);
  const get = (t: string): number => Number(p.find((x) => x.type === t)?.value ?? 0);
  return new Date(Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second')));
}

/** Data (YYYY-MM-DD) em Brasília. */
export const brDate = (d: Date): string => wallClock(d).toISOString().slice(0, 10);
/** Hora (HH:mm) em Brasília. */
export const brTime = (d: Date): string => wallClock(d).toISOString().slice(11, 16);

/** Instante de uma data e hora de Brasília. */
export function fromBrasilia(date: string, time: string): Date {
  const wall = Date.parse(`${date}T${time}:00Z`);
  const offset = (ms: number): number => wallClock(new Date(ms)).getTime() - Math.floor(ms / 1000) * 1000;
  return new Date(wall - offset(wall - offset(wall)));
}

export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

/** Domingo da semana de uma data. */
export function weekStart(date: string): string {
  return addDays(date, -new Date(`${date}T00:00:00Z`).getUTCDay());
}

/** Ex.: "seg., 24 de nov." */
export function brLongDate(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
}
