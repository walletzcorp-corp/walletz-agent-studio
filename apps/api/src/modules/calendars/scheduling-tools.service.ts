import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq, and, isNull, inArray } from 'drizzle-orm';
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
export interface ToolContext {
  tenantId: string;
  agentId: string;
  conversationId?: string;
  contactId?: string;
}

export interface MeetingSlot {
  start: string;   /* ISO 8601 */
  end: string;     /* ISO 8601 */
  label: string;   /* Human-readable, e.g. "amanhã às 14h" */
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

@Injectable()
export class SchedulingToolsService {
  private readonly logger = new Logger(SchedulingToolsService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: DrizzleDB,
    private readonly calendarsService: CalendarsService,
    private readonly availabilityService: AvailabilityService,
  ) {}

  /* ── Tool: get_availability ────────────────────────────────────────────── */

  async getAvailability(
    ctx: ToolContext,
    daysAhead = 7,
  ): Promise<{ slots: MeetingSlot[]; message: string }> {
    const settings = await this.loadSettings(ctx.agentId, ctx.tenantId);

    if (!settings?.canSchedule) {
      return { slots: [], message: 'Agendamento não está habilitado para este agente.' };
    }

    const rangeStart = new Date();
    rangeStart.setMinutes(rangeStart.getMinutes() + (settings.minLeadTimeMinutes ?? 120));
    const rangeEnd = new Date(rangeStart);
    rangeEnd.setDate(rangeEnd.getDate() + daysAhead);

    /* Fetch busy blocks from existing confirmed meetings */
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
      message: `Encontrei ${slots.length} horários disponíveis nos próximos ${daysAhead} dias.`,
    };
  }

  /* ── Tool: create_meeting ──────────────────────────────────────────────── */

  async createMeeting(
    ctx: ToolContext,
    input: CreateMeetingInput,
  ): Promise<{ meeting: CalendarMeeting; meetUrl?: string; message: string }> {
    const settings = await this.loadSettings(ctx.agentId, ctx.tenantId);

    if (!settings?.canSchedule) {
      throw new Error('Agendamento não está habilitado para este agente.');
    }

    const startAt = new Date(input.startAt);
    const endAt = new Date(input.endAt);

    if (endAt <= startAt) {
      throw new Error('Horário de término deve ser após o início.');
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

    /* Try to create real provider event if connection exists */
    let externalEventId: string | undefined;
    let externalMeetUrl: string | undefined;

    if (settings.connectionId) {
      try {
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
      } catch (err) {
        this.logger.warn(`Provider event creation failed, saving locally: ${err instanceof Error ? err.message : err}`);
      }
    }

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
        status: 'confirmed',
        platform,
        origin: 'agent',
        startAt,
        endAt,
        durationMinutes,
        timeZone,
        attendees: input.contactEmail ? [{ email: input.contactEmail, name: input.contactName }] : [],
      })
      .returning();

    if (!meeting) throw new Error('Falha ao inserir reunião no banco.');

    /* Update contact status to REUNIÃO AGENDADA */
    if (ctx.contactId) {
      await this.db
        .update(contacts)
        .set({
          customFields: { status: 'REUNIÃO AGENDADA', meetingId: meeting.id },
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
      meeting,
      meetUrl,
      message: meetUrl
        ? `Reunião criada para ${label}. Link: ${meetUrl}`
        : `Reunião confirmada para ${label}.`,
    };
  }

  /* ── Tool: find_meetings ──────────────────────────────────────────────── */

  async findMeetings(
    ctx: ToolContext,
    statusFilter: 'confirmed' | 'pending' | 'all' = 'all',
  ): Promise<{ meetings: CalendarMeeting[]; message: string }> {
    const whereBase = and(
      eq(calendarMeetings.tenantId, ctx.tenantId),
      isNull(calendarMeetings.deletedAt),
      ctx.conversationId
        ? eq(calendarMeetings.conversationId, ctx.conversationId)
        : ctx.contactId
        ? eq(calendarMeetings.contactId, ctx.contactId)
        : undefined,
    );

    const rows = await this.db
      .select()
      .from(calendarMeetings)
      .where(whereBase)
      .limit(10);

    const filtered = statusFilter === 'all'
      ? rows
      : rows.filter((m) => m.status === statusFilter);

    return {
      meetings: filtered,
      message: filtered.length
        ? `Encontrei ${filtered.length} reunião(ões).`
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
  ): Promise<{ meeting: CalendarMeeting; message: string }> {
    const result = await this.calendarsService.rescheduleMeeting(
      ctx.tenantId,
      meetingId,
      ctx.agentId,
      { startAt: newStartAt, endAt: newEndAt, reason },
    );
    return {
      meeting: result,
      message: `Reunião reagendada para ${this.formatSlotLabel(new Date(newStartAt))}.`,
    };
  }

  /* ── Tool: cancel_meeting ─────────────────────────────────────────────── */

  async cancelMeeting(
    ctx: ToolContext,
    meetingId: string,
    reason?: string,
  ): Promise<{ message: string }> {
    await this.calendarsService.cancelMeeting(ctx.tenantId, meetingId, ctx.agentId, reason);
    return { message: 'Reunião cancelada com sucesso.' };
  }

  /* ── Dispatch ──────────────────────────────────────────────────────────── */

  async dispatch(
    toolName: string,
    toolInput: Record<string, unknown>,
    ctx: ToolContext,
  ): Promise<unknown> {
    switch (toolName) {
      case 'get_availability':
        return this.getAvailability(ctx, typeof toolInput['days_ahead'] === 'number' ? toolInput['days_ahead'] : 7);

      case 'create_meeting':
        return this.createMeeting(ctx, {
          startAt: String(toolInput['start_at']),
          endAt: String(toolInput['end_at']),
          title: String(toolInput['title'] ?? 'Reunião'),
          description: toolInput['description'] != null ? String(toolInput['description']) : undefined,
          contactName: toolInput['contact_name'] != null ? String(toolInput['contact_name']) : undefined,
          contactEmail: toolInput['contact_email'] != null ? String(toolInput['contact_email']) : undefined,
          platform: toolInput['platform'] as CreateMeetingInput['platform'],
          timezone: toolInput['timezone'] != null ? String(toolInput['timezone']) : undefined,
        });

      case 'find_meetings':
        return this.findMeetings(
          ctx,
          (toolInput['status'] as 'confirmed' | 'pending' | 'all') ?? 'all',
        );

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
      .where(and(eq(agentCalendarSettings.agentId, agentId), eq(agentCalendarSettings.tenantId, tenantId)))
      .limit(1);
    return s ?? null;
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
