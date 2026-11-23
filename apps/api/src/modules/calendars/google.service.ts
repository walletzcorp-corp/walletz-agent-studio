import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CalendarProviderError, calendarFetch } from './calendar-provider.error';
import type { TimeSlot } from './availability.service';

const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

export interface GoogleTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  scopes: string[];
  email: string;
  displayName?: string;
}

export interface GoogleEvent {
  id: string;
  summary: string;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
  htmlLink?: string;
  attendees?: Array<{ email: string; displayName?: string }>;
  hangoutLink?: string;
  conferenceData?: unknown;
}

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);

  private readonly clientId: string | undefined;
  private readonly clientSecret: string | undefined;
  private readonly redirectUri: string;

  private readonly SCOPES = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
    'openid',
    'email',
    'profile',
  ];

  constructor(private readonly config: ConfigService) {
    this.clientId = this.config.get<string>('GOOGLE_OAUTH_CLIENT_ID');
    this.clientSecret = this.config.get<string>('GOOGLE_OAUTH_CLIENT_SECRET');
    this.redirectUri = this.config.get<string>(
      'GOOGLE_OAUTH_REDIRECT_URI',
      'http://localhost:3001/api/v1/tenants/callback/google',
    );
  }

  private assertCredentials() {
    if (!this.clientId || !this.clientSecret) {
      throw new ServiceUnavailableException(
        'A integração com o Google Agenda ainda não foi configurada na plataforma. Fale com o suporte Walletz.',
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
      access_type: 'offline',
      prompt: 'consent',
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<GoogleTokens> {
    this.assertCredentials();
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.clientId!,
        client_secret: this.clientSecret!,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });
    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`Google token exchange failed: ${body}`);
      throw new Error(`Google OAuth error: ${body}`);
    }
    const data = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      scope: string;
      id_token?: string;
    };

    const userInfo = await this.getUserInfo(data.access_token);
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      scopes: data.scope.split(' '),
      email: userInfo.email,
      displayName: userInfo.name,
    };
  }

  /**
   * Renova o token de acesso. `invalid_grant` (revogado ou expirado) vira erro
   * "reauth": só volta a funcionar com nova autorização do usuário.
   */
  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken?: string; expiresAt: Date }> {
    this.assertCredentials();
    try {
      const res = await calendarFetch('google.refresh', 'https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: this.clientId!,
          client_secret: this.clientSecret!,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }).toString(),
      });
      const data = (await res.json()) as { access_token: string; refresh_token?: string; expires_in: number };
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: new Date(Date.now() + data.expires_in * 1000),
      };
    } catch (err) {
      if (err instanceof CalendarProviderError) {
        if (err.reason === 'invalid_grant') throw new CalendarProviderError('reauth', err.operation, err.status, err.reason);
        // invalid_client etc.: problema da plataforma, não da conta do usuário.
        throw new CalendarProviderError('unavailable', err.operation, err.status, err.reason);
      }
      throw err;
    }
  }

  /**
   * Revoga a autorização no Google. Vale para a conta inteira neste app: quem
   * chama confere antes se outra conexão ativa usa a mesma conta.
   */
  async revokeToken(token: string): Promise<void> {
    try {
      await calendarFetch('google.revoke', 'https://oauth2.googleapis.com/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token }).toString(),
      });
    } catch (err) {
      // Token já revogado ou expirado: o objetivo já foi alcançado.
      if (err instanceof CalendarProviderError && err.reason === 'invalid_token') return;
      throw err;
    }
  }

  private async getUserInfo(accessToken: string): Promise<{ email: string; name?: string }> {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error('Failed to fetch Google user info');
    return res.json() as Promise<{ email: string; name?: string }>;
  }

  /**
   * Horários ocupados via free/busy: o Google devolve só início e fim (nenhum
   * conteúdo de evento), já tratando dia inteiro, recorrência, recusados e
   * eventos marcados como "Disponível".
   */
  async listBusy(accessToken: string, timeMin: Date, timeMax: Date, timeZone: string, calendarId = 'primary'): Promise<TimeSlot[]> {
    const res = await calendarFetch('google.freeBusy', `${CALENDAR_API}/freeBusy`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        timeZone,
        items: [{ id: calendarId }],
      }),
    });
    const data = (await res.json()) as {
      calendars?: Record<string, { busy?: Array<{ start: string; end: string }>; errors?: Array<{ reason?: string }> }>;
    };
    const calendar = data.calendars?.[calendarId] ?? Object.values(data.calendars ?? {})[0];
    // Sem resposta confiável não dá para afirmar que o horário está livre.
    if (!calendar || calendar.errors?.length) {
      throw new CalendarProviderError('unavailable', 'google.freeBusy', undefined, calendar?.errors?.[0]?.reason);
    }
    return (calendar.busy ?? []).map((b) => ({ start: new Date(b.start), end: new Date(b.end) }));
  }

  async createEvent(
    accessToken: string,
    event: {
      /** ID gerado por nós (hex): permite apagar o evento se a resposta se perder. */
      id?: string;
      summary: string;
      description?: string;
      start: string;
      end: string;
      timeZone?: string;
      attendeeEmails?: string[];
      addMeet?: boolean;
    },
    calendarId = 'primary',
  ): Promise<GoogleEvent> {
    const body: Record<string, unknown> = {
      ...(event.id ? { id: event.id } : {}),
      summary: event.summary,
      description: event.description,
      start: { dateTime: event.start, timeZone: event.timeZone ?? 'America/Sao_Paulo' },
      end: { dateTime: event.end, timeZone: event.timeZone ?? 'America/Sao_Paulo' },
      attendees: (event.attendeeEmails ?? []).map((email) => ({ email })),
    };
    if (event.addMeet) {
      body.conferenceData = { createRequest: { requestId: crypto.randomUUID(), conferenceSolutionKey: { type: 'hangoutsMeet' } } };
    }
    const params = new URLSearchParams({
      ...(event.addMeet ? { conferenceDataVersion: '1' } : {}),
      // Sem isto o Google adiciona o convidado mas não envia o convite.
      ...(event.attendeeEmails?.length ? { sendUpdates: 'all' } : {}),
    });
    const res = await calendarFetch(
      'google.createEvent',
      `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    );
    return res.json() as Promise<GoogleEvent>;
  }

  /** Muda só o horário; título, convidados e link do Meet são preservados. */
  async updateEventTime(
    accessToken: string,
    eventId: string,
    time: { start: string; end: string; timeZone: string },
    calendarId = 'primary',
  ): Promise<GoogleEvent> {
    const res = await calendarFetch(
      'google.updateEvent',
      `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?sendUpdates=all`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start: { dateTime: time.start, timeZone: time.timeZone },
          end: { dateTime: time.end, timeZone: time.timeZone },
        }),
      },
    );
    const event = (await res.json()) as GoogleEvent & { status?: string };
    // Evento apagado na agenda continua acessível por ID com status "cancelled".
    if (event.status === 'cancelled') throw new CalendarProviderError('not_found', 'google.updateEvent');
    return event;
  }

  /** Exclui o evento; se ele já não existe no Google, considera excluído. */
  async deleteEvent(accessToken: string, eventId: string, calendarId = 'primary'): Promise<void> {
    try {
      await calendarFetch(
        'google.deleteEvent',
        `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?sendUpdates=all`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } },
      );
    } catch (err) {
      if (err instanceof CalendarProviderError && err.kind === 'not_found') return;
      throw err;
    }
  }
}
