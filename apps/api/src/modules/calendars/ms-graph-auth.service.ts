import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface CachedToken {
  token: string;
  expiresAt: number; /* ms epoch */
}

/**
 * Manages Microsoft Graph access tokens.
 *
 * Supports two flows:
 *  1. Client Credentials (app-only) — no user interaction, needs Application permissions in Entra
 *  2. Delegated refresh — renews stored user access tokens with a refresh token
 *
 * Tokens are cached in-memory and refreshed 5 minutes before expiry.
 * Secrets are NEVER logged.
 */
@Injectable()
export class MicrosoftGraphAuthService {
  private readonly logger = new Logger(MicrosoftGraphAuthService.name);

  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly msTenantId: string;

  /* App-only token cache (single tenant, shared across requests) */
  private appTokenCache: CachedToken | null = null;

  /* 5-minute buffer before real expiry */
  private static readonly EXPIRY_BUFFER_MS = 5 * 60 * 1000;

  private static readonly DELEGATED_SCOPES = [
    'offline_access',
    'Calendars.ReadWrite',
    'OnlineMeetings.ReadWrite',
    'User.Read',
  ].join(' ');

  constructor(private readonly config: ConfigService) {
    this.clientId = this.config.getOrThrow<string>('MICROSOFT_OAUTH_CLIENT_ID');
    this.clientSecret = this.config.getOrThrow<string>('MICROSOFT_OAUTH_CLIENT_SECRET');
    this.msTenantId = this.config.getOrThrow<string>('MICROSOFT_OAUTH_TENANT_ID');
  }

  /* ── App-only (Client Credentials) ── */

  async getAppOnlyToken(): Promise<string> {
    if (this.appTokenCache && this.appTokenCache.expiresAt > Date.now() + MicrosoftGraphAuthService.EXPIRY_BUFFER_MS) {
      return this.appTokenCache.token;
    }

    this.logger.log('Acquiring Microsoft app-only token via Client Credentials');

    const res = await fetch(
      `https://login.microsoftonline.com/${this.msTenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          scope: 'https://graph.microsoft.com/.default',
        }).toString(),
      },
    );

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`Client Credentials token acquisition failed: ${res.status}`);
      throw new ServiceUnavailableException(`Microsoft Graph auth failed: ${res.status} — ${body}`);
    }

    const data = (await res.json()) as { access_token: string; expires_in: number };

    this.appTokenCache = {
      token: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };

    this.logger.log('App-only token acquired and cached');
    return this.appTokenCache.token;
  }

  /* ── Delegated refresh ── */

  async refreshDelegatedToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresAt: Date;
  }> {
    this.logger.log('Refreshing delegated Microsoft access token');

    const res = await fetch(
      `https://login.microsoftonline.com/${this.msTenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: refreshToken,
          scope: MicrosoftGraphAuthService.DELEGATED_SCOPES,
        }).toString(),
      },
    );

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`Delegated token refresh failed: ${res.status}`);
      throw new ServiceUnavailableException(`Microsoft token refresh failed: ${res.status} — ${body}`);
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

  /* ── Admin consent URL (Application permissions) ── */

  buildAdminConsentUrl(redirectUri: string, state?: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      ...(state ? { state } : {}),
    });
    return `https://login.microsoftonline.com/${this.msTenantId}/adminconsent?${params.toString()}`;
  }
}
