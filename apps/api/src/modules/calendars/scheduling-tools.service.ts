import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq, and, isNull, inArray, desc, sql } from 'drizzle-orm';
import { DRIZZLE_TOKEN, type DrizzleDB } from '../../database/database.module';
import {
  calendarMeetings,
  agentCalendarSettings,
  type CalendarMeeting,
  type AgentCalendarSettings,
} from '../../database/schema/calendars';
import { contacts } from '../../database/schema/contacts';
import { CalendarsService } from './calendars.service';
import { AvailabilityService, type TimeSlot } from './availability.service';
import type { AvailabilityHours } from './availability.service';
import type { AgentExecutionContext } from '../agents/execution-context';
import { isToolAllowed } from '../agents/tool-policy';

/** The only identity a tool ever sees. Built by the server; tool inputs cannot alter it. */
export type ToolContext = AgentExecutionContext;

export interface MeetingSlot {
  start: string /* ISO 8601 */;
  end: string /* ISO 8601 */;
  label: string /* Human-readable, e.g. "amanhã às 14h" */;
}

export interface CreateMeetingInput {
  startAt: string;
  endAt: string;
  title: string;
  description?: string;
  contactName?: string;
  contactEmail?: string;
  platform?: 'google_meet' | 'teams' | 'presencial' | 'phone';
  timezone?: string;
}

/** What a tool may reveal about a meeting: never attendee emails, descriptions or other contacts. */
export interface MeetingView {
  id: string;
  title: string;
  startAt: Date;
  endAt: Date;
  status: CalendarMeeting['status'];
  platform: CalendarMeeting['platform'];
  meetUrl: string | null;
  timeZone: string;
}

const MAX_MEETING_MINUTES = 8 * 60;

@Injectable()
export class SchedulingToolsService {
  private readonly logger = new Logger(SchedulingToolsService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: DrizzleDB,
    private readonly calendarsService: CalendarsService,
    private readonly availabilityService: AvailabilityService,
  ) {}

  /**
   * A meeting may be read or changed from a tool only if it belongs to this tenant and, when the
   * caller is an external contact, to that same contact. Enforced in the queries themselves.
   */
  private contactScope(ctx: ToolContext): { contactId?: string } {
    if (ctx.source === 'external_contact') {
      if (!ctx.contactId) throw new Error('Contexto de contato ausente');
      return { contactId: ctx.contactId };
    }
    return {};
  }

  /* ── Tool: get_availability ────────────────────────────────────────────── */

  async getAvailability(
    ctx: ToolContext,
    daysAhead = 7,
  ): Promise<{ slots: MeetingSlot[]; message: string }> {
    const settings = await this.loadSettings(ctx.agentId, ctx.tenantId);

    if (!settings?.canSchedule) {
      return { slots: [], message: 'Agendamento não está habilitado para este agente.' };
    }

    const horizon = Math.min(Math.max(Math.trunc(daysAhead) || 7, 1), 30);
    const rangeStart = new Date();
    rangeStart.setMinutes(rangeStart.getMinutes() + (settings.minLeadTimeMinutes ?? 120));
    const rangeEnd = new Date(rangeStart);
    rangeEnd.setDate(rangeEnd.getDate() + horizon);

    /* Busy blocks only (start/end): no meeting details leave this method */
    const existingMeetings = await this.db
      .select({ startAt: calendarMeetings.startAt, endAt: calendarMeetings.endAt })
      .from(calendarMeetings)
      .where(
        and(
          eq(calendarMeetings.tenantId, ctx.tenantId),
          inArray(calendarMeetings.status, ['confirmed', 'pending']),
          isNull(calendarMeetings.deletedAt),
        ),
      );

    const busyBlocks: TimeSlot[] = existingMeetings.map((m) => ({
      start: new Date(m.startAt),
      end: new Date(m.endAt),
    }));

    const merged = this.availabilityService.mergeBusyBlocks(busyBlocks);

    const availableHours = (settings.availableHours ?? {}) as AvailabilityHours;
    const rawSlots = this.availabilityService.computeFreeSlots(
      merged,
      availableHours,
      settings.defaultDurationMinutes,
      settings.bufferMinutes,
      rangeStart,
      rangeEnd,
    );

    const slots: MeetingSlot[] = rawSlots.slice(0, 12).map((s) => ({
      start: s.start.toISOString(),
      end: s.end.toISOString(),
      label: this.formatSlotLabel(s.start, settings.timeZone),
    }));

    if (slots.length === 0) {
      return { slots: [], message: 'Não há horários disponíveis nos próximos dias.' };
    }

    return {
      slots,
      message: `Encontrei ${slots.length} horários disponíveis nos próximos ${horizon} dias.`,
    };
  }

  /* ── Tool: create_meeting ──────────────────────────────────────────────── */

  async createMeeting(
    ctx: ToolContext,
    input: CreateMeetingInput,
  ): Promise<{ meeting: MeetingView; meetUrl?: string; confirmed: boolean; message: string }> {
    const settings = await this.loadSettings(ctx.agentId, ctx.tenantId);

    if (!settings?.canSchedule) {
      throw new Error('Agendamento não está habilitado para este agente.');
    }

    const startAt = new Date(input.startAt);
    const endAt = new Date(input.endAt);

    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      throw new Error('Datas inválidas. Use o formato ISO 8601.');
    }
    if (endAt <= startAt) {
      throw new Error('Horário de término deve ser após o início.');
    }
    if (startAt.getTime() < Date.now()) {
      throw new Error('Não é possível agendar no passado.');
    }
    if ((endAt.getTime() - startAt.getTime()) / 60_000 > MAX_MEETING_MINUTES) {
      throw new Error('Duração acima do máximo permitido.');
    }

    /* Re-query conflicts with actual times */
    const conflictingMeetings = await this.db
      .select({ startAt: calendarMeetings.startAt, endAt: calendarMeetings.endAt })
      .from(calendarMeetings)
      .where(
        and(
          eq(calendarMeetings.tenantId, ctx.tenantId),
          inArray(calendarMeetings.status, ['confirmed', 'pending']),
          isNull(calendarMeetings.deletedAt),
        ),
      );

    const busyBlocks: TimeSlot[] = conflictingMeetings.map((m) => ({
      start: new Date(m.startAt),
      end: new Date(m.endAt),
    }));

    if (!this.availabilityService.isSlotFree(startAt, endAt, busyBlocks)) {
      throw new Error(
        `Esse horário (${this.formatSlotLabel(startAt)}) acabou de ficar indisponível. Por favor, escolha outro.`,
      );
    }

    const durationMinutes = Math.round((endAt.getTime() - startAt.getTime()) / 60_000);
    const platform = input.platform ?? settings.defaultPlatform;
    const timeZone = input.timezone ?? settings.timeZone;

    /*
     * A meeting is CONFIRMED only with an external_event_id from the calendar provider. The
     * connection is the one configured for this agent and is re-validated against the tenant
     * inside createExternalEvent; it is never picked from "any available connection".
     */
    let externalEventId: string | undefined;
    let externalMeetUrl: string | undefined;

    if (settings.connectionId) {
      const eventResult = await this.calendarsService.createExternalEvent(
        ctx.tenantId,
        settings.connectionId,
        {
          summary: input.title,
          description: input.description,
          start: startAt.toISOString(),
          end: endAt.toISOString(),
          timeZone,
          attendeeEmails: input.contactEmail ? [input.contactEmail] : [],
          addMeet: platform === 'google_meet',
          addTeams: platform === 'teams',
        },
      );
      externalEventId = eventResult.id;
      externalMeetUrl = eventResult.meetUrl;
    }

    const confirmed = Boolean(externalEventId);

    const [meeting] = await this.db
      .insert(calendarMeetings)
      .values({
        tenantId: ctx.tenantId,
        agentId: ctx.agentId,
        conversationId: ctx.conversationId ?? null,
        contactId: ctx.contactId ?? null,
        connectionId: settings.connectionId ?? null,
        externalEventId: externalEventId ?? null,
        externalMeetUrl: externalMeetUrl ?? null,
        title: input.title,
        description: input.description ?? null,
        contactName: input.contactName ?? null,
        contactEmail: input.contactEmail ?? null,
        status: confirmed ? 'confirmed' : 'pending',
        platform,
        origin: 'agent',
        startAt,
        endAt,
        durationMinutes,
        timeZone,
        attendees: input.contactEmail
          ? [{ email: input.contactEmail, name: input.contactName }]
          : [],
      })
      .returning();

    if (!meeting) throw new Error('Falha ao inserir reunião no banco.');

    /* Merge into the contact's custom fields (never overwrite what is already there) */
    if (ctx.contactId) {
      await this.db
        .update(contacts)
        .set({
          customFields: sql`coalesce(${contacts.customFields}, '{}'::jsonb) || ${JSON.stringify({
            status: confirmed ? 'REUNIÃO AGENDADA' : 'REUNIÃO PENDENTE',
            meetingId: meeting.id,
          })}::jsonb`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(contacts.id, ctx.contactId),
            eq(contacts.tenantId, ctx.tenantId),
            isNull(contacts.deletedAt),
          ),
        );
    }

    const meetUrl = externalMeetUrl ?? undefined;
    const label = this.formatSlotLabel(startAt, timeZone);

    return {
      meeting: this.toView(meeting),
      meetUrl,
      confirmed,
      message: confirmed
        ? meetUrl
          ? `Reunião criada para ${label}. Link: ${meetUrl}`
          : `Reunião confirmada para ${label}.`
        : `Solicitação de reunião registrada para ${label}, mas AINDA NÃO CONFIRMADA: não há calendário conectado. Informe ao cliente que a equipe confirmará.`,
    };
  }

  /* ── Tool: find_meetings ──────────────────────────────────────────────── */

  async findMeetings(
    ctx: ToolContext,
    statusFilter: 'confirmed' | 'pending' | 'all' = 'all',
  ): Promise<{ meetings: MeetingView[]; message: string }> {
    const scope = this.contactScope(ctx);

    // Fail closed: an external contact is ALWAYS restricted to its own meetings. There is no
    // code path where a missing filter widens the query to the whole tenant.
    const conditions = [
      eq(calendarMeetings.tenantId, ctx.tenantId),
      isNull(calendarMeetings.deletedAt),
      ...(scope.contactId ? [eq(calendarMeetings.contactId, scope.contactId)] : []),
      ...(statusFilter === 'all' ? [] : [eq(calendarMeetings.status, statusFilter)]),
    ];

    const rows = await this.db
      .select()
      .from(calendarMeetings)
      .where(and(...conditions))
      .orderBy(desc(calendarMeetings.startAt))
      .limit(10);

    const meetings = rows.map((m) => this.toView(m));
    return {
      meetings,
      message: meetings.length
        ? `Encontrei ${meetings.length} reunião(ões).`
        : 'Não encontrei reuniões para este contato.',
    };
  }

  /* ── Tool: reschedule_meeting ─────────────────────────────────────────── */

  async rescheduleMeeting(
    ctx: ToolContext,
    meetingId: string,
    newStartAt: string,
    newEndAt: string,
    reason?: string,
  ): Promise<{ meeting: MeetingView; message: string }> {
    const result = await this.calendarsService.rescheduleMeeting(
      ctx.tenantId,
      meetingId,
      `agent:${ctx.agentId}`,
      { startAt: newStartAt, endAt: newEndAt, reason },
      this.contactScope(ctx),
    );
    return {
      meeting: this.toView(result),
      message: `Reunião reagendada para ${this.formatSlotLabel(new Date(newStartAt))}.`,
    };
  }

  /* ── Tool: cancel_meeting ─────────────────────────────────────────────── */

  async cancelMeeting(
    ctx: ToolContext,
    meetingId: string,
    reason?: string,
  ): Promise<{ message: string }> {
    await this.calendarsService.cancelMeeting(
      ctx.tenantId,
      meetingId,
      `agent:${ctx.agentId}`,
      reason,
      this.contactScope(ctx),
    );
    return { message: 'Reunião cancelada com sucesso.' };
  }

  /* ── Dispatch ──────────────────────────────────────────────────────────── */

  async dispatch(
    toolName: string,
    toolInput: Record<string, unknown>,
    ctx: ToolContext,
  ): Promise<unknown> {
    if (!isToolAllowed(toolName, ctx)) {
      throw new Error(`Ferramenta não permitida: ${toolName}`);
    }

    switch (toolName) {
      case 'get_availability':
        return this.getAvailability(
          ctx,
          typeof toolInput['days_ahead'] === 'number' ? toolInput['days_ahead'] : 7,
        );

      case 'create_meeting':
        return this.createMeeting(ctx, {
          startAt: String(toolInput['start_at']),
          endAt: String(toolInput['end_at']),
          title: String(toolInput['title'] ?? 'Reunião'),
          description:
            toolInput['description'] != null ? String(toolInput['description']) : undefined,
          contactName:
            toolInput['contact_name'] != null ? String(toolInput['contact_name']) : undefined,
          contactEmail:
            toolInput['contact_email'] != null ? String(toolInput['contact_email']) : undefined,
          platform: toolInput['platform'] as CreateMeetingInput['platform'],
          timezone: toolInput['timezone'] != null ? String(toolInput['timezone']) : undefined,
        });

      case 'find_meetings': {
        const status = toolInput['status'];
        return this.findMeetings(
          ctx,
          status === 'confirmed' || status === 'pending' ? status : 'all',
        );
      }

      case 'reschedule_meeting':
        return this.rescheduleMeeting(
          ctx,
          String(toolInput['meeting_id']),
          String(toolInput['new_start_at']),
          String(toolInput['new_end_at']),
          toolInput['reason'] != null ? String(toolInput['reason']) : undefined,
        );

      case 'cancel_meeting':
        return this.cancelMeeting(
          ctx,
          String(toolInput['meeting_id']),
          toolInput['reason'] != null ? String(toolInput['reason']) : undefined,
        );

      default:
        throw new Error(`Ferramenta desconhecida: ${toolName}`);
    }
  }

  /* ── Helpers ── */

  async loadSettings(agentId: string, tenantId: string): Promise<AgentCalendarSettings | null> {
    const [s] = await this.db
      .select()
      .from(agentCalendarSettings)
      .where(
        and(
          eq(agentCalendarSettings.agentId, agentId),
          eq(agentCalendarSettings.tenantId, tenantId),
        ),
      )
      .limit(1);
    return s ?? null;
  }

  private toView(m: CalendarMeeting): MeetingView {
    return {
      id: m.id,
      title: m.title,
      startAt: m.startAt,
      endAt: m.endAt,
      status: m.status,
      platform: m.platform,
      meetUrl: m.externalMeetUrl,
      timeZone: m.timeZone,
    };
  }

  private formatSlotLabel(date: Date, timezone?: string | null): string {
    const opts: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone ?? 'America/Sao_Paulo',
    };
    return date.toLocaleString('pt-BR', opts);
  }
}
