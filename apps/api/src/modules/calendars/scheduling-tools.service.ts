import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq, and, desc, isNull, or, type SQL } from 'drizzle-orm';
import { DRIZZLE_TOKEN, type DrizzleDB } from '../../database/database.module';
import {
  calendarMeetings,
  agentCalendarSettings,
  type CalendarMeeting,
  type AgentCalendarSettings,
} from '../../database/schema/calendars';
import { contacts } from '../../database/schema/contacts';
import { CalendarsService, clampDays } from './calendars.service';
import { AvailabilityService } from './availability.service';
import type { AvailabilityHours } from './availability.service';
import { BRASILIA_TIME_ZONE, parseDateTime, toBrasiliaIso } from './time-zone.util';

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
}

import { PlanLimitsService } from '../../shared/plans/plan-limits.service';

/** Sem agenda conectada não há evento no provedor, e sem ele nada pode ser confirmado. */
const NO_CALENDAR_MESSAGE = 'Não é possível agendar agora: nenhuma agenda está conectada a este agente. Nenhuma reunião foi marcada.';

/**
 * Reuniões que o agente pode ver e alterar: as da pessoa com quem ele conversa (contato
 * ou conversa). Sem conversa (Laboratório), só as que este agente criou em teste.
 * Vem do canal, nunca do que o modelo ou o usuário escreve.
 */
function ownMeetings(ctx: ToolContext): SQL {
  const scope = ctx.contactId || ctx.conversationId
    ? or(
        ctx.contactId ? eq(calendarMeetings.contactId, ctx.contactId) : undefined,
        ctx.conversationId ? eq(calendarMeetings.conversationId, ctx.conversationId) : undefined,
      )
    : and(
        eq(calendarMeetings.agentId, ctx.agentId),
        eq(calendarMeetings.origin, 'agent'),
        isNull(calendarMeetings.contactId),
        isNull(calendarMeetings.conversationId),
      );
  return scope!;
}

@Injectable()
export class SchedulingToolsService {
  private readonly logger = new Logger(SchedulingToolsService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: DrizzleDB,
    private readonly calendarsService: CalendarsService,
    private readonly availabilityService: AvailabilityService,
    private readonly planLimits: PlanLimitsService,
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
    const days = clampDays(daysAhead);
    rangeEnd.setDate(rangeEnd.getDate() + days);

    /* Reuniões da plataforma + agenda conectada (se a agenda não responder, falha) */
    if (!settings.connectionId) throw new Error(NO_CALENDAR_MESSAGE);
    const merged = this.availabilityService.mergeBusyBlocks(
      await this.calendarsService.getBusyBlocks(ctx.tenantId, {
        connectionId: settings.connectionId,
        from: rangeStart,
        to: rangeEnd,
      }),
    );

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
      start: toBrasiliaIso(s.start),
      end: toBrasiliaIso(s.end),
      label: this.formatSlotLabel(s.start),
    }));

    if (slots.length === 0) {
      return { slots: [], message: 'Não há horários disponíveis nos próximos dias.' };
    }

    return {
      slots,
      message: `Encontrei ${slots.length} horários disponíveis nos próximos ${days} dias.`,
    };
  }

  /* ── Tool: create_meeting ──────────────────────────────────────────────── */

  async createMeeting(
    ctx: ToolContext,
    input: CreateMeetingInput,
  ): Promise<{ meeting: CalendarMeeting; meetUrl?: string; inviteSent: boolean; message: string }> {
    const settings = await this.loadSettings(ctx.agentId, ctx.tenantId);

    if (!settings?.canSchedule) {
      throw new Error('Agendamento não está habilitado para este agente.');
    }

    const startAt = parseDateTime(input.startAt);
    const endAt = parseDateTime(input.endAt);

    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      throw new Error('Data ou horário inválido.');
    }
    if (endAt <= startAt) {
      throw new Error('Horário de término deve ser após o início.');
    }
    if (!settings.connectionId) throw new Error(NO_CALENDAR_MESSAGE);

    await this.assertSlotFree(ctx, settings, startAt, endAt);

    const durationMinutes = Math.round((endAt.getTime() - startAt.getTime()) / 60_000);
    const platform = input.platform ?? settings.defaultPlatform;

    /* O evento precisa existir no provedor; se falhar, nada é salvo nem confirmado */
    const event = await this.calendarsService.createExternalEvent(ctx.tenantId, settings.connectionId, {
      summary: input.title,
      description: input.description,
      start: startAt.toISOString(),
      end: endAt.toISOString(),
      attendeeEmails: input.contactEmail ? [input.contactEmail] : [],
      addMeet: platform === 'google_meet',
      addTeams: platform === 'teams',
    });
    const externalMeetUrl = event.meetUrl;

    const meeting = await this.calendarsService.saveMeetingOrUndo(ctx.tenantId, settings.connectionId, event.id, {
      tenantId: ctx.tenantId,
      agentId: ctx.agentId,
      conversationId: ctx.conversationId ?? null,
      contactId: ctx.contactId ?? null,
      connectionId: settings.connectionId,
      externalEventId: event.id,
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
      timeZone: BRASILIA_TIME_ZONE,
      attendees: input.contactEmail ? [{ email: input.contactEmail, name: input.contactName }] : [],
    });

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
    const label = this.formatSlotLabel(startAt);

    return {
      meeting,
      meetUrl,
      inviteSent: !!input.contactEmail,
      message: [
        `Reunião confirmada para ${label} (horário de Brasília).`,
        meetUrl ? `Link: ${meetUrl}` : '',
        input.contactEmail
          ? `Convite enviado para ${input.contactEmail}.`
          : 'Nenhum convite foi enviado, porque o e-mail não foi informado.',
      ].filter(Boolean).join(' '),
    };
  }

  /* ── Tool: find_meetings ──────────────────────────────────────────────── */

  async findMeetings(
    ctx: ToolContext,
    statusFilter: 'confirmed' | 'pending' | 'all' = 'all',
  ): Promise<{ meetings: Array<CalendarMeeting & { horario: string }>; message: string }> {
    const filtered = await this.db
      .select()
      .from(calendarMeetings)
      .where(and(
        eq(calendarMeetings.tenantId, ctx.tenantId),
        isNull(calendarMeetings.deletedAt),
        ownMeetings(ctx),
        statusFilter === 'confirmed' || statusFilter === 'pending' ? eq(calendarMeetings.status, statusFilter) : undefined,
      ))
      .orderBy(desc(calendarMeetings.startAt))
      .limit(10);

    return {
      // O banco guarda UTC; o texto evita que a IA informe o horário errado ao cliente.
      meetings: filtered.map((m) => ({ ...m, horario: `${this.formatSlotLabel(m.startAt)} (Brasília)` })),
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
    const settings = await this.loadSettings(ctx.agentId, ctx.tenantId);
    if (!settings?.canSchedule) throw new Error('Agendamento não está habilitado para este agente.');
    if (!settings.connectionId) throw new Error(NO_CALENDAR_MESSAGE);

    const result = await this.calendarsService.rescheduleMeeting(
      ctx.tenantId,
      meetingId,
      ctx.agentId,
      { startAt: newStartAt, endAt: newEndAt, reason },
      ownMeetings(ctx),
    );
    return {
      meeting: result,
      message: result.status === 'confirmed'
        ? `Reunião reagendada para ${this.formatSlotLabel(result.startAt)} (horário de Brasília).`
        : `Novo horário registrado para ${this.formatSlotLabel(result.startAt)}, ainda sem confirmação na agenda.`,
    };
  }

  /* ── Tool: cancel_meeting ─────────────────────────────────────────────── */

  async cancelMeeting(
    ctx: ToolContext,
    meetingId: string,
    reason?: string,
  ): Promise<{ message: string }> {
    const settings = await this.loadSettings(ctx.agentId, ctx.tenantId);
    if (!settings?.canSchedule) throw new Error('Agendamento não está habilitado para este agente.');
    await this.calendarsService.cancelMeeting(ctx.tenantId, meetingId, ctx.agentId, reason, ownMeetings(ctx));
    return { message: 'Reunião cancelada com sucesso.' };
  }

  /* ── Dispatch ──────────────────────────────────────────────────────────── */

  async dispatch(
    toolName: string,
    toolInput: Record<string, unknown>,
    ctx: ToolContext,
  ): Promise<unknown> {
    // O agente só agenda se o plano inclui agendas e o agente está dentro do limite.
    await this.planLimits.assertUsable(ctx.tenantId, { feature: 'calendars', item: { resource: 'agents', id: ctx.agentId } });
    switch (toolName) {
      case 'get_availability':
        return this.getAvailability(ctx, typeof toolInput['days_ahead'] === 'number' ? toolInput['days_ahead'] : 7);

      case 'create_meeting':
        return this.forModel(await this.createMeeting(ctx, {
          startAt: String(toolInput['start_at']),
          endAt: String(toolInput['end_at']),
          title: String(toolInput['title'] ?? 'Reunião'),
          description: toolInput['description'] != null ? String(toolInput['description']) : undefined,
          contactName: toolInput['contact_name'] != null ? String(toolInput['contact_name']) : undefined,
          contactEmail: toolInput['contact_email'] != null ? String(toolInput['contact_email']) : undefined,
          platform: toolInput['platform'] as CreateMeetingInput['platform'],
        }));

      case 'find_meetings':
        return this.forModel(await this.findMeetings(
          ctx,
          (toolInput['status'] as 'confirmed' | 'pending' | 'all') ?? 'all',
        ));

      case 'reschedule_meeting':
        return this.forModel(await this.rescheduleMeeting(
          ctx,
          String(toolInput['meeting_id']),
          String(toolInput['new_start_at']),
          String(toolInput['new_end_at']),
          toolInput['reason'] != null ? String(toolInput['reason']) : undefined,
        ));

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

  /** O modelo recebe só o que precisa dizer ao cliente: nada de IDs internos da organização. */
  private forModel<T extends { meeting?: CalendarMeeting; meetings?: CalendarMeeting[] }>(result: T): Record<string, unknown> {
    const summary = (m: CalendarMeeting): Record<string, unknown> => ({
      meeting_id: m.id,
      title: m.title,
      status: m.status,
      horario: `${this.formatSlotLabel(m.startAt)} (Brasília)`,
      start_at: toBrasiliaIso(m.startAt),
      end_at: toBrasiliaIso(m.endAt),
      platform: m.platform,
      link: m.externalMeetUrl,
    });
    const { meeting, meetings, ...rest } = result;
    return {
      ...rest,
      ...(meeting ? { meeting: summary(meeting) } : {}),
      ...(meetings ? { meetings: meetings.map(summary) } : {}),
    };
  }

  async loadSettings(agentId: string, tenantId: string): Promise<AgentCalendarSettings | null> {
    const [s] = await this.db
      .select()
      .from(agentCalendarSettings)
      .where(and(eq(agentCalendarSettings.agentId, agentId), eq(agentCalendarSettings.tenantId, tenantId)))
      .limit(1);
    return s ?? null;
  }

  private async assertSlotFree(
    ctx: ToolContext,
    settings: AgentCalendarSettings,
    startAt: Date,
    endAt: Date,
  ): Promise<void> {
    const busy = await this.calendarsService.getBusyBlocks(ctx.tenantId, {
      connectionId: settings.connectionId,
      from: startAt,
      to: endAt,
    });
    if (!this.availabilityService.isSlotFree(startAt, endAt, busy)) {
      throw new Error(
        `Esse horário (${this.formatSlotLabel(startAt)}) está ocupado ou acabou de ficar indisponível. Escolha outro.`,
      );
    }
  }

  private formatSlotLabel(date: Date): string {
    const opts: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: BRASILIA_TIME_ZONE,
    };
    return date.toLocaleString('pt-BR', opts);
  }
}
