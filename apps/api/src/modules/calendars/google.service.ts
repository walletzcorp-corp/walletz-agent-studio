import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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
        'Google Calendar integration is not configured. Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET.',
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
      await res.text();
      this.logger.error(`Google token exchange failed (HTTP ${res.status})`);
      throw new Error(`Google OAuth token exchange failed (HTTP ${res.status})`);
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

  async refreshAccessToken(
    refreshToken: string,
  ): Promise<Omit<GoogleTokens, 'email' | 'displayName' | 'scopes'>> {
    this.assertCredentials();
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId!,
        client_secret: this.clientSecret!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    });
    if (!res.ok) throw new Error('Failed to refresh Google token');
    const data = (await res.json()) as { access_token: string; expires_in: number };
    return {
      accessToken: data.access_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  private async getUserInfo(accessToken: string): Promise<{ email: string; name?: string }> {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error('Failed to fetch Google user info');
    return res.json() as Promise<{ email: string; name?: string }>;
  }

  async listEvents(
    accessToken: string,
    timeMin: Date,
    timeMax: Date,
    calendarId = 'primary',
  ): Promise<GoogleEvent[]> {
    const params = new URLSearchParams({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '250',
    });
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!res.ok) throw new Error('Failed to fetch Google Calendar events');
    const data = (await res.json()) as { items?: GoogleEvent[] };
    return data.items ?? [];
  }

  async createEvent(
    accessToken: string,
    event: {
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
      summary: event.summary,
      description: event.description,
      start: { dateTime: event.start, timeZone: event.timeZone ?? 'America/Sao_Paulo' },
      end: { dateTime: event.end, timeZone: event.timeZone ?? 'America/Sao_Paulo' },
      attendees: (event.attendeeEmails ?? []).map((email) => ({ email })),
    };
    if (event.addMeet) {
      body.conferenceData = {
        createRequest: {
          requestId: crypto.randomUUID(),
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      };
    }
    const params = new URLSearchParams(event.addMeet ? { conferenceDataVersion: '1' } : {});
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to create Google Calendar event: ${err}`);
    }
    return res.json() as Promise<GoogleEvent>;
  }

  async updateEvent(
    accessToken: string,
    eventId: string,
    patch: { start: string; end: string; timeZone?: string },
    calendarId = 'primary',
  ): Promise<GoogleEvent> {
    const body = {
      start: { dateTime: patch.start, timeZone: patch.timeZone ?? 'America/Sao_Paulo' },
      end: { dateTime: patch.end, timeZone: patch.timeZone ?? 'America/Sao_Paulo' },
    };
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to update Google Calendar event: ${err}`);
    }
    return res.json() as Promise<GoogleEvent>;
  }

  async deleteEvent(accessToken: string, eventId: string, calendarId = 'primary'): Promise<void> {
    await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } },
    );
  }
}
