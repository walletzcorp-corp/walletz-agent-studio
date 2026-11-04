import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { eq, and, isNull, gte, lte, lt } from 'drizzle-orm';
import { DRIZZLE_TOKEN, type DrizzleDB } from '../../database/database.module';
import {
  calendarConnections,
  calendarMeetings,
  agentCalendarSettings,
  type CalendarConnection,
  type CalendarMeeting,
} from '../../database/schema/calendars';
import { AuditService } from '../../shared/audit/audit.service';
import { GoogleCalendarService } from './google.service';
import { MicrosoftCalendarService } from './microsoft.service';
import { MicrosoftGraphAuthService } from './ms-graph-auth.service';
import { AvailabilityService, type TimeSlot } from './availability.service';
import type { CreateMeetingDto, RescheduleMeetingDto } from './dto/create-meeting.dto';
import type { UpdateAgentCalendarSettingsDto } from './dto/update-agent-settings.dto';

type Provider = 'google' | 'microsoft';

@Injectable()
export class CalendarsService {
  private readonly logger = new Logger(CalendarsService.name);
  private readonly encKey: Buffer;

  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: DrizzleDB,
    private readonly config: ConfigService,
    private readonly auditService: AuditService,
    private readonly googleService: GoogleCalendarService,
    private readonly microsoftService: MicrosoftCalendarService,
    private readonly msGraphAuth: MicrosoftGraphAuthService,
    private readonly availabilityService: AvailabilityService,
  ) {
    const raw = this.config.get<string>('CALENDAR_ENCRYPTION_KEY', '');
    if (!raw && this.config.get('NODE_ENV') === 'production') {
      throw new Error('CALENDAR_ENCRYPTION_KEY must be set in production — stored OAuth tokens cannot be decrypted without it');
    }
    if (!raw) {
      this.logger.warn('CALENDAR_ENCRYPTION_KEY not set — using ephemeral key (tokens will be lost on restart). Set CALENDAR_ENCRYPTION_KEY in .env.local for persistent tokens.');
    }
    this.encKey = raw ? Buffer.from(raw, 'hex') : crypto.randomBytes(32);
  }

  /* ── Token encryption (AES-256-GCM) ── */

  private encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encKey, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString('base64');
  }

  private decrypt(ciphertext: string): string {
    const buf = Buffer.from(ciphertext, 'base64');
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const encrypted = buf.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encKey, iv);
    decipher.setAuthTag(tag);
    return decipher.update(encrypted) + decipher.final('utf8');
  }

  /* ── Token auto-refresh ── */

  /**
   * Returns a valid access token for a Microsoft connection.
   * Automatically refreshes the token if it has expired or is about to expire,
   * persisting the new tokens back to the DB.
   * Throws ServiceUnavailableException if refresh fails.
   */
  async getValidMsToken(conn: CalendarConnection): Promise<string> {
    const BUFFER_MS = 5 * 60 * 1000; // 5 minutes
    const isExpired = !conn.tokenExpiresAt || conn.tokenExpiresAt.getTime() < Date.now() + BUFFER_MS;

    if (!isExpired) {
      return this.decrypt(conn.encryptedAccessToken);
    }

    if (!conn.encryptedRefreshToken) {
      this.logger.warn(`MS token expired for connection ${conn.id} and no refresh token stored`);
      return this.decrypt(conn.encryptedAccessToken); // return stale, let caller fail gracefully
    }

    this.logger.log(`Refreshing expired MS token for connection ${conn.id} (${conn.email})`);
    const refreshToken = this.decrypt(conn.encryptedRefreshToken);
    const refreshed = await this.msGraphAuth.refreshDelegatedToken(refreshToken);

    // Persist refreshed tokens
    await this.db
      .update(calendarConnections)
      .set({
        encryptedAccessToken: this.encrypt(refreshed.accessToken),
        ...(refreshed.refreshToken
          ? { encryptedRefreshToken: this.encrypt(refreshed.refreshToken) }
          : {}),
        tokenExpiresAt: refreshed.expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(calendarConnections.id, conn.id));

    this.logger.log(`MS token refreshed for ${conn.email}, expires ${refreshed.expiresAt.toISOString()}`);
    return refreshed.accessToken;
  }

  /* ── OAuth ── */

  private signOAuthState(payload: string): string {
    const secret = this.config.get<string>('CALENDAR_OAUTH_STATE_SECRET', 'dev-state-secret-change-in-prod');
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  buildAuthUrl(tenantId: string, provider: Provider): string {
    const payload = JSON.stringify({ tenantId, provider, ts: Date.now() });
    const encoded = Buffer.from(payload).toString('base64url');
    const sig = this.signOAuthState(encoded);
    const state = `${encoded}.${sig}`;
    return provider === 'google'
      ? this.googleService.buildAuthUrl(state)
      : this.microsoftService.buildAuthUrl(state);
  }

  async handleCallback(
    code: string,
    state: string,
    userId: string | null,
  ): Promise<{ tenantId: string; provider: Provider }> {
    const parts = state.split('.');
    if (parts.length !== 2) throw new BadRequestException('Invalid OAuth state');
    const [encoded, sig] = parts as [string, string];

    const expectedSig = this.signOAuthState(encoded);
    if (!crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expectedSig, 'hex'))) {
      throw new BadRequestException('OAuth state signature invalid — possible CSRF');
    }

    const decoded = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as {
      tenantId: string;
      provider: Provider;
      ts: number;
    };

    if (Date.now() - decoded.ts > 10 * 60 * 1000) {
      throw new BadRequestException('OAuth state expired — please try again');
    }

    const { tenantId, provider } = decoded;

    const tokens =
      provider === 'google'
        ? await this.googleService.exchangeCode(code)
        : await this.microsoftService.exchangeCode(code);

    /* Upsert connection — one connection per provider+email per tenant */
    const existing = await this.db
      .select()
      .from(calendarConnections)
      .where(
        and(
          eq(calendarConnections.tenantId, tenantId),
          eq(calendarConnections.provider, provider),
          eq(calendarConnections.email, tokens.email),
          isNull(calendarConnections.deletedAt),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      await this.db
        .update(calendarConnections)
        .set({
          encryptedAccessToken: this.encrypt(tokens.accessToken),
          encryptedRefreshToken: tokens.refreshToken ? this.encrypt(tokens.refreshToken) : undefined,
          tokenExpiresAt: tokens.expiresAt,
          scopes: tokens.scopes,
          displayName: tokens.displayName ?? null,
          syncStatus: 'pending',
          updatedAt: new Date(),
        })
        .where(eq(calendarConnections.id, existing[0]!.id));
    } else {
      await this.db.insert(calendarConnections).values({
        tenantId,
        connectedByUserId: userId,
        provider,
        email: tokens.email,
        displayName: tokens.displayName ?? null,
        encryptedAccessToken: this.encrypt(tokens.accessToken),
        encryptedRefreshToken: tokens.refreshToken ? this.encrypt(tokens.refreshToken) : null,
        tokenExpiresAt: tokens.expiresAt,
        scopes: tokens.scopes,
        syncStatus: 'pending',
      });
    }

    await this.auditService.log({
      tenantId,
      userId: userId ?? undefined,
      action: 'calendar.connect',
      resourceType: 'calendar_connection',
      metadata: { provider, email: tokens.email },
    });

    return { tenantId, provider };
  }

  /* ── Connections CRUD ── */

  async listConnections(tenantId: string): Promise<Omit<CalendarConnection, 'encryptedAccessToken' | 'encryptedRefreshToken'>[]> {
    const rows = await this.db
      .select()
      .from(calendarConnections)
      .where(and(eq(calendarConnections.tenantId, tenantId), isNull(calendarConnections.deletedAt)));

    return rows.map(({ encryptedAccessToken: _a, encryptedRefreshToken: _b, ...rest }) => rest);
  }

  async disconnect(tenantId: string, connectionId: string, userId: string): Promise<void> {
    const [conn] = await this.db
      .select()
      .from(calendarConnections)
      .where(and(eq(calendarConnections.id, connectionId), eq(calendarConnections.tenantId, tenantId)))
      .limit(1);

    if (!conn) throw new NotFoundException('Calendar connection not found');

    await this.db
      .update(calendarConnections)
      .set({ deletedAt: new Date(), syncStatus: 'disconnected', updatedAt: new Date() })
      .where(eq(calendarConnections.id, connectionId));

    await this.auditService.log({
      tenantId,
      userId,
      action: 'calendar.disconnect',
      resourceType: 'calendar_connection',
      resourceId: connectionId,
      metadata: { provider: conn.provider, email: conn.email },
    });
  }

  async triggerSync(tenantId: string): Promise<{ queued: number }> {
    const conns = await this.db
      .select()
      .from(calendarConnections)
      .where(and(eq(calendarConnections.tenantId, tenantId), isNull(calendarConnections.deletedAt)));

    /* Mark all as pending; actual sync would be done by a background worker */
    if (conns.length > 0) {
      await this.db
        .update(calendarConnections)
        .set({ syncStatus: 'pending', updatedAt: new Date() })
        .where(and(eq(calendarConnections.tenantId, tenantId), isNull(calendarConnections.deletedAt)));
    }

    return { queued: conns.length };
  }

  /* ── Availability ── */

  async getAvailableSlots(
    tenantId: string,
    agentId: string,
    daysAhead = 7,
  ): Promise<{ start: string; end: string }[]> {
    const [settings] = await this.db
      .select()
      .from(agentCalendarSettings)
      .where(and(eq(agentCalendarSettings.tenantId, tenantId), eq(agentCalendarSettings.agentId, agentId)))
      .limit(1);

    if (!settings?.canSchedule) return [];

    const now = new Date();
    const rangeEnd = new Date(now);
    rangeEnd.setDate(rangeEnd.getDate() + daysAhead);

    /* Fetch existing meetings as busy blocks */
    const existingMeetings = await this.db
      .select()
      .from(calendarMeetings)
      .where(
        and(
          eq(calendarMeetings.tenantId, tenantId),
          gte(calendarMeetings.startAt, now),
          lte(calendarMeetings.endAt, rangeEnd),
          isNull(calendarMeetings.deletedAt),
        ),
      );

    const busyBlocks: TimeSlot[] = existingMeetings.map((m) => ({
      start: m.startAt,
      end: m.endAt,
    }));

    /* Also fetch external calendar events if connection exists */
    if (settings.connectionId) {
      const [conn] = await this.db
        .select()
        .from(calendarConnections)
        .where(and(eq(calendarConnections.id, settings.connectionId), isNull(calendarConnections.deletedAt)))
        .limit(1);

      if (conn) {
        try {
          const token = conn.provider === 'microsoft'
            ? await this.getValidMsToken(conn)
            : this.decrypt(conn.encryptedAccessToken);
          const externalEvents =
            conn.provider === 'google'
              ? await this.googleService.listEvents(token, now, rangeEnd)
              : await this.microsoftService.listEvents(token, now, rangeEnd);

          for (const ev of externalEvents) {
            const start = conn.provider === 'google'
              ? new Date((ev as { start: { dateTime: string } }).start.dateTime)
              : new Date((ev as { start: { dateTime: string } }).start.dateTime);
            const end = conn.provider === 'google'
              ? new Date((ev as { end: { dateTime: string } }).end.dateTime)
              : new Date((ev as { end: { dateTime: string } }).end.dateTime);
            busyBlocks.push({ start, end });
          }
        } catch (err) {
          this.logger.warn(`Failed to fetch external events for availability: ${err}`);
        }
      }
    }

    const merged = this.availabilityService.mergeBusyBlocks(busyBlocks);
    const slots = this.availabilityService.computeFreeSlots(
      merged,
      (settings.availableHours ?? {}) as Parameters<typeof this.availabilityService.computeFreeSlots>[1],
      settings.defaultDurationMinutes,
      settings.bufferMinutes,
      now,
      rangeEnd,
    );

    return slots.map((s) => ({ start: s.start.toISOString(), end: s.end.toISOString() }));
  }

  /* ── Meetings ── */

  async createMeeting(tenantId: string, userId: string, dto: CreateMeetingDto): Promise<CalendarMeeting> {
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);

    if (endAt <= startAt) throw new BadRequestException('endAt must be after startAt');

    /* Double-booking check: any meeting that overlaps [startAt, endAt) */
    const conflicts = await this.db
      .select()
      .from(calendarMeetings)
      .where(
        and(
          eq(calendarMeetings.tenantId, tenantId),
          isNull(calendarMeetings.deletedAt),
          lt(calendarMeetings.startAt, endAt),   // existing starts before new ends
          gte(calendarMeetings.endAt, startAt),  // existing ends after new starts
        ),
      )
      .limit(1);

    if (conflicts.length > 0) {
      throw new ConflictException('Time slot conflicts with an existing meeting');
    }

    let externalEventId: string | undefined;
    let externalMeetUrl: string | undefined;

    /* If a connection is specified, create event externally */
    if (dto.connectionId) {
      const [conn] = await this.db
        .select()
        .from(calendarConnections)
        .where(and(eq(calendarConnections.id, dto.connectionId), eq(calendarConnections.tenantId, tenantId), isNull(calendarConnections.deletedAt)))
        .limit(1);

      if (conn) {
        const token = conn.provider === 'microsoft'
          ? await this.getValidMsToken(conn)
          : this.decrypt(conn.encryptedAccessToken);
        const attendeeEmails = dto.contactEmail ? [dto.contactEmail] : [];
        if (conn.provider === 'google') {
          const ev = await this.googleService.createEvent(token, {
            summary: dto.title,
            description: dto.description,
            start: dto.startAt,
            end: dto.endAt,
            timeZone: dto.timeZone,
            attendeeEmails,
            addMeet: dto.platform === 'google_meet',
          });
          externalEventId = ev.id;
          externalMeetUrl = ev.hangoutLink ?? ev.htmlLink;
        } else {
          const ev = await this.microsoftService.createEvent(token, {
            subject: dto.title,
            body: dto.description,
            start: dto.startAt,
            end: dto.endAt,
            timeZone: dto.timeZone,
            attendeeEmails,
            addTeams: dto.platform === 'teams',
          });
          externalEventId = ev.id;
          externalMeetUrl = ev.onlineMeeting?.joinUrl ?? ev.webLink;
        }
      }
    }

    /* Meetings MUST have externalEventId when connection is involved */
    if (dto.connectionId && !externalEventId) {
      throw new BadRequestException('Could not obtain external_event_id from calendar provider');
    }

    const [meeting] = await this.db
      .insert(calendarMeetings)
      .values({
        tenantId,
        connectionId: dto.connectionId ?? null,
        agentId: dto.agentId ?? null,
        externalEventId: externalEventId ?? null,
        externalMeetUrl: externalMeetUrl ?? null,
        title: dto.title,
        description: dto.description ?? null,
        contactName: dto.contactName ?? null,
        contactEmail: dto.contactEmail ?? null,
        status: 'confirmed',
        platform: (dto.platform ?? 'google_meet') as CalendarMeeting['platform'],
        origin: dto.agentId ? 'agent' : 'manual',
        startAt,
        endAt,
        durationMinutes: Math.round((endAt.getTime() - startAt.getTime()) / 60_000),
        timeZone: dto.timeZone ?? 'America/Sao_Paulo',
      })
      .returning();

    if (!meeting) throw new Error('Insert returned no rows');

    await this.auditService.log({
      tenantId,
      userId,
      action: 'calendar.meeting.create',
      resourceType: 'calendar_meeting',
      resourceId: meeting.id,
      metadata: { title: dto.title, externalEventId },
    });

    return meeting;
  }

  async rescheduleMeeting(
    tenantId: string,
    meetingId: string,
    userId: string,
    dto: RescheduleMeetingDto,
  ): Promise<CalendarMeeting> {
    const [meeting] = await this.db
      .select()
      .from(calendarMeetings)
      .where(and(eq(calendarMeetings.id, meetingId), eq(calendarMeetings.tenantId, tenantId), isNull(calendarMeetings.deletedAt)))
      .limit(1);

    if (!meeting) throw new NotFoundException('Meeting not found');

    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);

    if (endAt <= startAt) throw new BadRequestException('endAt must be after startAt');

    /* Overlap check for new slot (exclude the meeting being rescheduled) */
    const conflictingMeetings = await this.db
      .select({ id: calendarMeetings.id })
      .from(calendarMeetings)
      .where(
        and(
          eq(calendarMeetings.tenantId, tenantId),
          isNull(calendarMeetings.deletedAt),
          lt(calendarMeetings.startAt, endAt),
          gte(calendarMeetings.endAt, startAt),
        ),
      )
      .limit(2);

    const realConflicts = conflictingMeetings.filter((m) => m.id !== meetingId);
    if (realConflicts.length > 0) {
      throw new ConflictException('New time slot conflicts with an existing meeting');
    }

    /* Update the external calendar event if connected */
    if (meeting.connectionId && meeting.externalEventId) {
      const [conn] = await this.db
        .select()
        .from(calendarConnections)
        .where(and(eq(calendarConnections.id, meeting.connectionId), eq(calendarConnections.tenantId, tenantId), isNull(calendarConnections.deletedAt)))
        .limit(1);

      if (conn) {
        const token = conn.provider === 'microsoft'
          ? await this.getValidMsToken(conn)
          : this.decrypt(conn.encryptedAccessToken);

        if (conn.provider === 'google') {
          await this.googleService.updateEvent(token, meeting.externalEventId, {
            start: dto.startAt,
            end: dto.endAt,
            timeZone: dto.timeZone ?? meeting.timeZone,
          });
        } else {
          await this.microsoftService.updateEvent(token, meeting.externalEventId, {
            start: dto.startAt,
            end: dto.endAt,
            timeZone: dto.timeZone ?? meeting.timeZone,
          });
        }
      }
    }

    /* Cancel old, create new (preserves audit trail) */
    await this.db
      .update(calendarMeetings)
      .set({ status: 'rescheduled', updatedAt: new Date() })
      .where(eq(calendarMeetings.id, meetingId));

    const [newMeeting] = await this.db
      .insert(calendarMeetings)
      .values({
        tenantId,
        connectionId: meeting.connectionId,
        agentId: meeting.agentId,
        externalEventId: meeting.externalEventId ?? null,
        externalMeetUrl: meeting.externalMeetUrl ?? null,
        title: meeting.title,
        description: meeting.description,
        contactName: meeting.contactName,
        contactEmail: meeting.contactEmail,
        status: 'confirmed',
        platform: meeting.platform,
        origin: meeting.origin,
        startAt,
        endAt,
        durationMinutes: Math.round((endAt.getTime() - startAt.getTime()) / 60_000),
        timeZone: dto.timeZone ?? meeting.timeZone,
        rescheduledFromId: meetingId,
      })
      .returning();

    if (!newMeeting) throw new Error('Insert returned no rows');

    await this.auditService.log({
      tenantId,
      userId,
      action: 'calendar.meeting.reschedule',
      resourceType: 'calendar_meeting',
      resourceId: newMeeting.id,
      metadata: { originalMeetingId: meetingId, reason: dto.reason },
    });

    return newMeeting;
  }

  async cancelMeeting(
    tenantId: string,
    meetingId: string,
    userId: string,
    reason?: string,
  ): Promise<void> {
    const [meeting] = await this.db
      .select()
      .from(calendarMeetings)
      .where(and(eq(calendarMeetings.id, meetingId), eq(calendarMeetings.tenantId, tenantId), isNull(calendarMeetings.deletedAt)))
      .limit(1);

    if (!meeting) throw new NotFoundException('Meeting not found');

    /* Delete from external provider if linked */
    if (meeting.externalEventId && meeting.connectionId) {
      const [conn] = await this.db
        .select()
        .from(calendarConnections)
        .where(eq(calendarConnections.id, meeting.connectionId))
        .limit(1);

      if (conn) {
        try {
          const token = conn.provider === 'microsoft'
            ? await this.getValidMsToken(conn)
            : this.decrypt(conn.encryptedAccessToken);
          if (conn.provider === 'google') {
            await this.googleService.deleteEvent(token, meeting.externalEventId);
          } else {
            await this.microsoftService.deleteEvent(token, meeting.externalEventId);
          }
        } catch (err) {
          this.logger.warn(`Failed to delete external calendar event: ${err}`);
        }
      }
    }

    await this.db
      .update(calendarMeetings)
      .set({ status: 'cancelled', cancellationReason: reason ?? null, updatedAt: new Date() })
      .where(eq(calendarMeetings.id, meetingId));

    await this.auditService.log({
      tenantId,
      userId,
      action: 'calendar.meeting.cancel',
      resourceType: 'calendar_meeting',
      resourceId: meetingId,
      metadata: { reason },
    });
  }

  async listMeetings(tenantId: string, from?: Date, to?: Date): Promise<CalendarMeeting[]> {
    const conditions = [
      eq(calendarMeetings.tenantId, tenantId),
      isNull(calendarMeetings.deletedAt),
    ];
    if (from) conditions.push(gte(calendarMeetings.startAt, from));
    if (to) conditions.push(lte(calendarMeetings.endAt, to));

    return this.db
      .select()
      .from(calendarMeetings)
      .where(and(...conditions))
      .orderBy(calendarMeetings.startAt);
  }

  /* ── Agent scheduling settings ── */

  async getAgentSettings(tenantId: string, agentId: string) {
    const [settings] = await this.db
      .select()
      .from(agentCalendarSettings)
      .where(and(eq(agentCalendarSettings.tenantId, tenantId), eq(agentCalendarSettings.agentId, agentId)))
      .limit(1);
    return settings ?? null;
  }

  async upsertAgentSettings(
    tenantId: string,
    agentId: string,
    userId: string,
    dto: UpdateAgentCalendarSettingsDto,
  ) {
    const existing = await this.getAgentSettings(tenantId, agentId);

    const safeFields = {
      canSchedule: dto.canSchedule,
      defaultDurationMinutes: dto.defaultDurationMinutes,
      bufferMinutes: dto.bufferMinutes,
      maxMeetingsPerDay: dto.maxMeetingsPerDay,
      minLeadTimeMinutes: dto.minLeadTimeMinutes,
      defaultPlatform: dto.defaultPlatform as ('google_meet' | 'teams' | 'presencial' | 'phone') | undefined,
      availableHours: dto.availableHours,
      connectionId: dto.connectionId,
      timeZone: dto.timeZone,
    };

    if (existing) {
      const [updated] = await this.db
        .update(agentCalendarSettings)
        .set({ ...safeFields, updatedAt: new Date() })
        .where(eq(agentCalendarSettings.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await this.db
      .insert(agentCalendarSettings)
      .values({ tenantId, agentId, ...safeFields })
      .returning();

    await this.auditService.log({
      tenantId,
      userId,
      action: 'calendar.agent_settings.upsert',
      resourceType: 'agent_calendar_settings',
      resourceId: agentId,
    });

    return created;
  }

  /* ── External event creation (used by SchedulingToolsService) ── */

  async createExternalEvent(
    tenantId: string,
    connectionId: string,
    params: {
      summary: string;
      description?: string;
      start: string;
      end: string;
      timeZone?: string;
      attendeeEmails?: string[];
      addMeet?: boolean;
      addTeams?: boolean;
    },
  ): Promise<{ id: string; meetUrl?: string }> {
    const [conn] = await this.db
      .select()
      .from(calendarConnections)
      .where(
        and(
          eq(calendarConnections.id, connectionId),
          eq(calendarConnections.tenantId, tenantId),
          isNull(calendarConnections.deletedAt),
        ),
      )
      .limit(1);

    if (!conn) throw new NotFoundException('Calendar connection not found');

    const token = conn.provider === 'microsoft'
      ? await this.getValidMsToken(conn)
      : this.decrypt(conn.encryptedAccessToken);

    if (conn.provider === 'google') {
      const ev = await this.googleService.createEvent(token, {
        summary: params.summary,
        description: params.description,
        start: params.start,
        end: params.end,
        timeZone: params.timeZone,
        attendeeEmails: params.attendeeEmails ?? [],
        addMeet: params.addMeet ?? false,
      });
      return { id: ev.id, meetUrl: ev.hangoutLink ?? ev.htmlLink ?? undefined };
    } else {
      const ev = await this.microsoftService.createEvent(token, {
        subject: params.summary,
        body: params.description,
        start: params.start,
        end: params.end,
        timeZone: params.timeZone,
        attendeeEmails: params.attendeeEmails ?? [],
        addTeams: params.addTeams ?? false,
      });
      return { id: ev.id, meetUrl: (ev as { onlineMeeting?: { joinUrl?: string }; webLink?: string }).onlineMeeting?.joinUrl ?? (ev as { webLink?: string }).webLink ?? undefined };
    }
  }
}
