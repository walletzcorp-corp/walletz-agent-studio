import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CalendarProviderError, calendarFetch } from './calendar-provider.error';
import type { TimeSlot } from './availability.service';
import { zonedMidnight } from './time-zone.util';

const GRAPH_API = 'https://graph.microsoft.com/v1.0';
/** Situações em que o evento não ocupa o horário. */
const NOT_BUSY = new Set(['free', 'workingElsewhere']);
const DAY_MS = 86_400_000;

export interface MicrosoftTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  scopes: string[];
  email: string;
  displayName?: string;
}

export interface GraphEvent {
  id: string;
  subject: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  webLink?: string;
  onlineMeeting?: { joinUrl: string };
  onlineMeetingUrl?: string;
  attendees?: Array<{ emailAddress: { address: string; name?: string } }>;
}

export interface GraphOnlineMeeting {
  id: string;
  joinUrl: string;
  joinWebUrl?: string;
  subject: string;
  startDateTime: string;
  endDateTime: string;
  videoTeleconferenceId?: string;
}

/** Com Prefer UTC o Graph manda a data sem "Z"; sem isso o JS leria no fuso do servidor. */
function parseGraphUtc(dateTime: string): Date {
  return new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(dateTime) ? dateTime : `${dateTime}Z`);
}

@Injectable()
export class MicrosoftCalendarService {
  private readonly logger = new Logger(MicrosoftCalendarService.name);

  private readonly clientId: string | undefined;
  private readonly clientSecret: string | undefined;
  private readonly tenantIdMs: string;
  private readonly redirectUri: string;

  private readonly SCOPES = [
    'offline_access',
    'Calendars.ReadWrite',
    'OnlineMeetings.ReadWrite',
    'User.Read',
  ];

  constructor(private readonly config: ConfigService) {
    this.clientId = this.config.get<string>('MICROSOFT_OAUTH_CLIENT_ID');
    this.clientSecret = this.config.get<string>('MICROSOFT_OAUTH_CLIENT_SECRET');
    this.tenantIdMs = this.config.get<string>('MICROSOFT_OAUTH_TENANT_ID', 'common');
    this.redirectUri = this.config.get<string>(
      'MICROSOFT_OAUTH_REDIRECT_URI',
      'http://localhost:3001/api/v1/tenants/callback/microsoft',
    );
  }

  private assertCredentials() {
    if (!this.clientId || !this.clientSecret) {
      throw new ServiceUnavailableException(
        'A integração com o Microsoft 365 ainda não foi configurada na plataforma. Fale com o suporte Walletz.',
      );
    }
  }

  buildAuthUrl(state: string): string {
    this.assertCredentials();
    const params = new URLSearchParams({
      client_id: this.clientId!,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: this.SCOPES.join(' '),
      state,
      response_mode: 'query',
    });
    return `https://login.microsoftonline.com/${this.tenantIdMs}/oauth2/v2.0/authorize?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<MicrosoftTokens> {
    this.assertCredentials();
    const res = await fetch(
      `https://login.microsoftonline.com/${this.tenantIdMs}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: this.clientId!,
          client_secret: this.clientSecret!,
          redirect_uri: this.redirectUri,
          grant_type: 'authorization_code',
          scope: this.SCOPES.join(' '),
        }).toString(),
      },
    );
    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`Microsoft token exchange failed: ${body}`);
      throw new Error(`Microsoft OAuth error: ${body}`);
    }
    const data = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      scope: string;
    };
    const userInfo = await this.getUserInfo(data.access_token);
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      scopes: data.scope.split(' '),
      email: userInfo.mail ?? userInfo.userPrincipalName ?? '',
      displayName: userInfo.displayName,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<Omit<MicrosoftTokens, 'email' | 'displayName' | 'scopes'>> {
    this.assertCredentials();
    const res = await fetch(
      `https://login.microsoftonline.com/${this.tenantIdMs}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: this.clientId!,
          client_secret: this.clientSecret!,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
          scope: this.SCOPES.join(' '),
        }).toString(),
      },
    );
    if (!res.ok) throw new Error('Failed to refresh Microsoft token');
    const data = (await res.json()) as { access_token: string; refresh_token?: string; expires_in: number };
    return {
      accessToken: data.access_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  async getUserInfo(
    accessToken: string,
  ): Promise<{ mail?: string; userPrincipalName?: string; displayName?: string }> {
    const res = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error('Failed to fetch Microsoft user info');
    return res.json() as Promise<{ mail?: string; userPrincipalName?: string; displayName?: string }>;
  }

  /* ── Delegated: /me/... endpoints ── */

  /** Horários ocupados em [start, end). `timeZone` situa os eventos de dia inteiro. */
  async listBusy(accessToken: string, start: Date, end: Date, timeZone: string): Promise<TimeSlot[]> {
    // Um dia de folga nas pontas: evento de dia inteiro vem como meia-noite UTC.
    const params = new URLSearchParams({
      startDateTime: new Date(start.getTime() - DAY_MS).toISOString(),
      endDateTime: new Date(end.getTime() + DAY_MS).toISOString(),
      $select: 'start,end,isAllDay,showAs,isCancelled',
      $orderby: 'start/dateTime',
      $top: '250',
    });
    const busy: TimeSlot[] = [];
    let url: string | undefined = `${GRAPH_API}/me/calendarView?${params}`;
    while (url) {
      const res: Response = await calendarFetch('microsoft.calendarView', url, {
        headers: { Authorization: `Bearer ${accessToken}`, Prefer: 'outlook.timezone="UTC"' },
      });
      const data = (await res.json()) as {
        value?: Array<{
          start: { dateTime: string };
          end: { dateTime: string };
          isAllDay?: boolean;
          showAs?: string;
          isCancelled?: boolean;
        }>;
        '@odata.nextLink'?: string;
      };
      for (const ev of data.value ?? []) {
        if (ev.isCancelled || (ev.showAs && NOT_BUSY.has(ev.showAs))) continue;
        const slot = ev.isAllDay
          ? { start: zonedMidnight(ev.start.dateTime, timeZone), end: zonedMidnight(ev.end.dateTime, timeZone) }
          : { start: parseGraphUtc(ev.start.dateTime), end: parseGraphUtc(ev.end.dateTime) };
        if (slot.start < end && slot.end > start) busy.push(slot);
      }
      const next: string | undefined = data['@odata.nextLink'];
      // O token só vai para o próprio Graph.
      url = next?.startsWith(`${GRAPH_API}/`) ? next : undefined;
      if (next && !url) throw new CalendarProviderError('unavailable', 'microsoft.calendarView', undefined, 'nextLink');
    }
    return busy;
  }

  async createEvent(
    accessToken: string,
    event: {
      subject: string;
      body?: string;
      start: string;
      end: string;
      timeZone?: string;
      attendeeEmails?: string[];
      addTeams?: boolean;
    },
  ): Promise<GraphEvent> {
    return this.createEventForUser('me', accessToken, event);
  }

  async deleteEvent(accessToken: string, eventId: string): Promise<void> {
    return this.deleteEventForUser('me', accessToken, eventId);
  }

  /* ── Shared: works for both /me and /users/{userId} ── */

  async createEventForUser(
    userId: string,
    accessToken: string,
    event: {
      subject: string;
      body?: string;
      start: string;
      end: string;
      timeZone?: string;
      attendeeEmails?: string[];
      addTeams?: boolean;
    },
  ): Promise<GraphEvent> {
    const body: Record<string, unknown> = {
      subject: event.subject,
      body: { contentType: 'text', content: event.body ?? '' },
      // Em UTC explícito: data com "Z" junto de outro fuso é ambígua no Graph.
      start: { dateTime: new Date(event.start).toISOString().slice(0, 19), timeZone: 'UTC' },
      end: { dateTime: new Date(event.end).toISOString().slice(0, 19), timeZone: 'UTC' },
      attendees: (event.attendeeEmails ?? []).map((email) => ({
        emailAddress: { address: email },
        type: 'required',
      })),
    };
    if (event.addTeams) {
      body.isOnlineMeeting = true;
      body.onlineMeetingProvider = 'teamsForBusiness';
    }
    const base = userId === 'me' ? 'me' : `users/${encodeURIComponent(userId)}`;
    const res = await calendarFetch('microsoft.createEvent', `${GRAPH_API}/${base}/events`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.json() as Promise<GraphEvent>;
  }

  /** Muda só o horário (em UTC); título, convidados e link do Teams são preservados. */
  async updateEventTime(accessToken: string, eventId: string, time: { start: Date; end: Date }): Promise<GraphEvent> {
    const utc = (d: Date): { dateTime: string; timeZone: string } => ({ dateTime: d.toISOString().slice(0, 19), timeZone: 'UTC' });
    const res = await calendarFetch('microsoft.updateEvent', `${GRAPH_API}/me/events/${encodeURIComponent(eventId)}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ start: utc(time.start), end: utc(time.end) }),
    });
    return res.json() as Promise<GraphEvent>;
  }

  /** Exclui o evento; se ele já não existe no provedor, considera excluído. */
  async deleteEventForUser(userId: string, accessToken: string, eventId: string): Promise<void> {
    const base = userId === 'me' ? 'me' : `users/${encodeURIComponent(userId)}`;
    try {
      await calendarFetch('microsoft.deleteEvent', `${GRAPH_API}/${base}/events/${encodeURIComponent(eventId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch (err) {
      if (err instanceof CalendarProviderError && err.kind === 'not_found') return;
      throw err;
    }
  }

  /* ── App-only Teams Meeting creation ── */

  async createOnlineMeetingForUser(
    userId: string,
    accessToken: string,
    params: {
      subject: string;
      startDateTime: string;
      endDateTime: string;
    },
  ): Promise<GraphOnlineMeeting> {
    const res = await fetch(
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(userId)}/onlineMeetings`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: params.subject,
          startDateTime: params.startDateTime,
          endDateTime: params.endDateTime,
        }),
      },
    );
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to create Teams online meeting: ${err}`);
    }
    return res.json() as Promise<GraphOnlineMeeting>;
  }

  /* Delegated: create meeting via /me/onlineMeetings */
  async createMyOnlineMeeting(
    accessToken: string,
    params: {
      subject: string;
      startDateTime: string;
      endDateTime: string;
    },
  ): Promise<GraphOnlineMeeting> {
    const res = await fetch('https://graph.microsoft.com/v1.0/me/onlineMeetings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to create Teams meeting via delegated token: ${err}`);
    }
    return res.json() as Promise<GraphOnlineMeeting>;
  }

  /* Free/busy query */
  async getSchedule(
    accessToken: string,
    userEmails: string[],
    startDateTime: Date,
    endDateTime: Date,
  ): Promise<Array<{ scheduleId: string; busySlots: Array<{ start: string; end: string }> }>> {
    const res = await fetch('https://graph.microsoft.com/v1.0/me/calendar/getSchedule', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        schedules: userEmails,
        startTime: { dateTime: startDateTime.toISOString(), timeZone: 'UTC' },
        endTime: { dateTime: endDateTime.toISOString(), timeZone: 'UTC' },
        availabilityViewInterval: 15,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to fetch calendar schedule: ${err}`);
    }
    const data = (await res.json()) as {
      value: Array<{
        scheduleId: string;
        scheduleItems?: Array<{ start: { dateTime: string }; end: { dateTime: string } }>;
      }>;
    };
    return (data.value ?? []).map((v) => ({
      scheduleId: v.scheduleId,
      busySlots: (v.scheduleItems ?? []).map((s) => ({ start: s.start.dateTime, end: s.end.dateTime })),
    }));
  }
}
