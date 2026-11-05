import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Renews a tenant user's *delegated* Microsoft Graph access token with the refresh token that
 * user granted. Deliberately no app-only / client-credentials flow: an application-wide token
 * could read the calendar of any mailbox in the directory, which no tenant of ours consented to.
 * Secrets are NEVER logged.
 */
@Injectable()
export class MicrosoftGraphAuthService {
  private readonly logger = new Logger(MicrosoftGraphAuthService.name);

  private static readonly DELEGATED_SCOPES = [
    'offline_access',
    'Calendars.ReadWrite',
    'OnlineMeetings.ReadWrite',
    'User.Read',
  ].join(' ');

  constructor(private readonly config: ConfigService) {}

  async refreshDelegatedToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresAt: Date;
  }> {
    const clientId = this.config.get<string>('MICROSOFT_OAUTH_CLIENT_ID');
    const clientSecret = this.config.get<string>('MICROSOFT_OAUTH_CLIENT_SECRET');
    const msTenantId = this.config.get<string>('MICROSOFT_OAUTH_TENANT_ID', 'common');
    if (!clientId || !clientSecret) {
      throw new ServiceUnavailableException('Microsoft OAuth is not configured');
    }

    this.logger.log('Refreshing delegated Microsoft access token');

    const res = await fetch(`https://login.microsoftonline.com/${msTenantId}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        scope: MicrosoftGraphAuthService.DELEGATED_SCOPES,
      }).toString(),
    });

    if (!res.ok) {
      this.logger.error(`Delegated token refresh failed: ${res.status}`);
      throw new ServiceUnavailableException(`Microsoft token refresh failed (${res.status})`);
    }

    const data = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }
}
