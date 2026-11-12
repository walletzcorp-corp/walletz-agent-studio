import { BadRequestException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type Redis from 'ioredis';
import { CalendarsService } from '../calendars.service';
import type { DrizzleDB } from '../../../database/database.module';
import type { AuditService } from '../../../shared/audit/audit.service';
import type { GoogleCalendarService } from '../google.service';
import type { MicrosoftCalendarService } from '../microsoft.service';
import type { MicrosoftGraphAuthService } from '../ms-graph-auth.service';
import type { AvailabilityService } from '../availability.service';

/** Redis em memória com o que o fluxo OAuth usa (set com EX e getdel). */
function fakeRedis() {
  const store = new Map<string, string>();
  return {
    store,
    set: jest.fn(async (k: string, v: string) => { store.set(k, v); return 'OK'; }),
    getdel: jest.fn(async (k: string) => { const v = store.get(k) ?? null; store.delete(k); return v; }),
  };
}

function build() {
  const redis = fakeRedis();
  const inserted: Array<Record<string, unknown>> = [];
  const db = {
    select: () => ({ from: () => ({ where: () => ({ limit: async () => [] }) }) }),
    insert: () => ({ values: async (v: Record<string, unknown>) => { inserted.push(v); } }),
  };
  const tokens = {
    accessToken: 'at', refreshToken: 'rt', expiresAt: new Date(), email: 'agenda@empresa.com',
    displayName: 'Agenda', scopes: ['calendar'],
  };
  const google = {
    buildAuthUrl: jest.fn((state: string) => `https://accounts.google.com/o/oauth2/v2/auth?state=${state}`),
    exchangeCode: jest.fn(async () => tokens),
  };
  const microsoft = {
    buildAuthUrl: jest.fn((state: string) => `https://login.microsoftonline.com/x?state=${state}`),
    exchangeCode: jest.fn(async () => tokens),
  };
  const svc = new CalendarsService(
    db as unknown as DrizzleDB,
    { get: (_k: string, d?: unknown) => d } as unknown as ConfigService,
    { log: jest.fn(async () => undefined) } as unknown as AuditService,
    google as unknown as GoogleCalendarService,
    microsoft as unknown as MicrosoftCalendarService,
    {} as MicrosoftGraphAuthService,
    {} as AvailabilityService,
    redis as unknown as Redis,
  );
  return { svc, redis, google, inserted };
}

const stateFrom = (url: string): string => new URL(url).searchParams.get('state')!;

describe('CalendarsService — state do OAuth', () => {
  it('gera state aleatório guardado no Redis com tenant e usuário (10 min)', async () => {
    const { svc, redis } = build();
    const url = await svc.createAuthUrl('tenant-a', 'google', 'user-1');
    const state = stateFrom(url);
    expect(state).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect(state).not.toContain('tenant-a');
    expect(redis.set).toHaveBeenCalledWith(expect.stringContaining(state), expect.any(String), 'EX', 600);
  });

  it('conecta na organização guardada no Redis, não em algo vindo do navegador', async () => {
    const { svc, inserted } = build();
    const state = stateFrom(await svc.createAuthUrl('tenant-a', 'google', 'user-1'));
    await expect(svc.handleCallback('google', 'code', state)).resolves.toEqual({ tenantId: 'tenant-a', provider: 'google' });
    expect(inserted[0]).toMatchObject({ tenantId: 'tenant-a', connectedByUserId: 'user-1', provider: 'google' });
  });

  it('recusa state forjado (ex.: tenant em base64 como era antes)', async () => {
    const { svc, google } = build();
    const forged = Buffer.from(JSON.stringify({ tenantId: 'tenant-b', provider: 'google', ts: Date.now() })).toString('base64url');
    await expect(svc.handleCallback('google', 'code', forged)).rejects.toBeInstanceOf(BadRequestException);
    expect(google.exchangeCode).not.toHaveBeenCalled();
  });

  it('state só vale uma vez', async () => {
    const { svc } = build();
    const state = stateFrom(await svc.createAuthUrl('tenant-a', 'google', 'user-1'));
    await svc.handleCallback('google', 'code', state);
    await expect(svc.handleCallback('google', 'code', state)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('recusa state de um provedor usado no retorno de outro', async () => {
    const { svc, google } = build();
    const state = stateFrom(await svc.createAuthUrl('tenant-a', 'microsoft', 'user-1'));
    await expect(svc.handleCallback('google', 'code', state)).rejects.toBeInstanceOf(BadRequestException);
    expect(google.exchangeCode).not.toHaveBeenCalled();
  });

  it('recusa retorno sem code ou sem state', async () => {
    const { svc } = build();
    await expect(svc.handleCallback('google', '', 'x')).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.handleCallback('google', 'code', '')).rejects.toBeInstanceOf(BadRequestException);
  });
});
