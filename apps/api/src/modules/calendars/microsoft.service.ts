import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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
      'http://localhost:3001/v1/tenants/callback/microsoft',
    );
  }

  private assertCredentials() {
    if (!this.clientId || !this.clientSecret) {
      throw new ServiceUnavailableException(
        'Microsoft Calendar integration is not configured. Set MICROSOFT_OAUTH_CLIENT_ID and MICROSOFT_OAUTH_CLIENT_SECRET.',
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
    const data = (await res.json()) as { access_token: string; expires_in: number };
    return {
      accessToken: data.access_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  private async getUserInfo(
    accessToken: string,
  ): Promise<{ mail?: string; userPrincipalName?: string; displayName?: string }> {
    const res = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error('Failed to fetch Microsoft user info');
    return res.json() as Promise<{ mail?: string; userPrincipalName?: string; displayName?: string }>;
  }

  async listEvents(accessToken: string, startDateTime: Date, endDateTime: Date): Promise<GraphEvent[]> {
    const params = new URLSearchParams({
      startDateTime: startDateTime.toISOString(),
      endDateTime: endDateTime.toISOString(),
      $orderby: 'start/dateTime',
      $top: '250',
    });
    const res = await fetch(
      `https://graph.microsoft.com/v1.0/me/calendarView?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}`, Prefer: 'outlook.timezone="UTC"' } },
    );
    if (!res.ok) throw new Error('Failed to fetch Microsoft Graph events');
    const data = (await res.json()) as { value?: GraphEvent[] };
    return data.value ?? [];
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
    const tz = event.timeZone ?? 'E. South America Standard Time';
    const body: Record<string, unknown> = {
      subject: event.subject,
      body: { contentType: 'text', content: event.body ?? '' },
      start: { dateTime: event.start, timeZone: tz },
      end: { dateTime: event.end, timeZone: tz },
      attendees: (event.attendeeEmails ?? []).map((email) => ({
        emailAddress: { address: email },
        type: 'required',
      })),
    };
    if (event.addTeams) {
      body.isOnlineMeeting = true;
      body.onlineMeetingProvider = 'teamsForBusiness';
    }
    const res = await fetch('https://graph.microsoft.com/v1.0/me/events', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to create Microsoft Graph event: ${err}`);
    }
    return res.json() as Promise<GraphEvent>;
  }

  async deleteEvent(accessToken: string, eventId: string): Promise<void> {
    await fetch(`https://graph.microsoft.com/v1.0/me/events/${eventId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }
}
