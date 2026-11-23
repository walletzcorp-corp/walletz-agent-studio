import type { ConfigService } from '@nestjs/config';
import { AvailabilityService } from '../availability.service';
import { CalendarProviderError } from '../calendar-provider.error';
import { clampDays } from '../calendars.service';
import { GoogleCalendarService } from '../google.service';
import { MicrosoftCalendarService } from '../microsoft.service';
import { brasiliaDate, parseDateTime, toBrasiliaIso, zonedMidnight } from '../time-zone.util';

const config = { get: (key: string, fallback?: unknown) => (key.includes('CLIENT') ? 'x' : fallback) } as unknown as ConfigService;
const realFetch = global.fetch;

type Call = { url: string; method: string; body: string };
function stubFetch(...responses: Array<{ status: number; body?: unknown } | Error>): Call[] {
  const calls: Call[] = [];
  global.fetch = jest.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), method: init?.method ?? 'GET', body: String(init?.body ?? '') });
    const next = responses.shift();
    if (!next) throw new Error('chamada inesperada');
    if (next instanceof Error) throw next;
    return new Response(next.status === 204 ? null : JSON.stringify(next.body ?? {}), { status: next.status });
  }) as typeof fetch;
  return calls;
}
const kindOf = async (p: Promise<unknown>): Promise<string | undefined> => {
  const err = await p.then(() => undefined, (e: unknown) => e);
  return err instanceof CalendarProviderError ? err.kind : undefined;
};

afterEach(() => {
  global.fetch = realFetch;
});

describe('GoogleCalendarService', () => {
  const google = new GoogleCalendarService(config);
  const from = new Date('2026-12-01T00:00:00Z');
  const to = new Date('2026-12-08T00:00:00Z');

  it('renova o token; invalid_grant exige nova autorização; invalid_client não culpa o usuário', async () => {
    stubFetch({ status: 200, body: { access_token: 'novo', expires_in: 3600 } });
    expect((await google.refreshAccessToken('rt')).accessToken).toBe('novo');
    stubFetch({ status: 400, body: { error: 'invalid_grant' } });
    expect(await kindOf(google.refreshAccessToken('rt'))).toBe('reauth');
    stubFetch({ status: 401, body: { error: 'invalid_client' } });
    expect(await kindOf(google.refreshAccessToken('rt'))).toBe('unavailable');
  });

  it('usa free/busy (sem conteúdo de eventos) e devolve dia inteiro como período ocupado', async () => {
    const calls = stubFetch({
      status: 200,
      body: { calendars: { primary: { busy: [{ start: '2026-12-02T03:00:00Z', end: '2026-12-03T03:00:00Z' }] } } },
    });
    const busy = await google.listBusy('at', from, to, 'America/Sao_Paulo');
    expect(calls[0]!.url).toBe('https://www.googleapis.com/calendar/v3/freeBusy');
    expect(JSON.parse(calls[0]!.body)).toMatchObject({ timeZone: 'America/Sao_Paulo', items: [{ id: 'primary' }] });
    expect(busy).toEqual([{ start: new Date('2026-12-02T03:00:00Z'), end: new Date('2026-12-03T03:00:00Z') }]);
  });

  it('free/busy com erro na agenda ou sem resposta nunca vira "tudo livre"', async () => {
    stubFetch({ status: 200, body: { calendars: { primary: { errors: [{ reason: 'notFound' }], busy: [] } } } });
    expect(await kindOf(google.listBusy('at', from, to, 'UTC'))).toBe('unavailable');
    stubFetch({ status: 200, body: {} });
    expect(await kindOf(google.listBusy('at', from, to, 'UTC'))).toBe('unavailable');
    stubFetch(new Error('ECONNRESET'));
    expect(await kindOf(google.listBusy('at', from, to, 'UTC'))).toBe('unavailable');
  });

  it('classifica 401, falta de permissão e limite de uso', async () => {
    stubFetch({ status: 401, body: { error: { code: 401 } } });
    expect(await kindOf(google.listBusy('at', from, to, 'UTC'))).toBe('unauthorized');
    stubFetch({ status: 403, body: { error: { errors: [{ reason: 'insufficientPermissions' }] } } });
    expect(await kindOf(google.listBusy('at', from, to, 'UTC'))).toBe('reauth');
    stubFetch({ status: 403, body: { error: { errors: [{ reason: 'rateLimitExceeded' }] } } });
    expect(await kindOf(google.listBusy('at', from, to, 'UTC'))).toBe('unavailable');
  });

  it('excluir: evento inexistente conta como excluído; falha do provedor é propagada', async () => {
    stubFetch({ status: 410 });
    await expect(google.deleteEvent('at', 'ev')).resolves.toBeUndefined();
    stubFetch({ status: 500 });
    expect(await kindOf(google.deleteEvent('at', 'ev'))).toBe('unavailable');
  });

  it('pede ao Google o envio do convite só quando há convidado', async () => {
    const calls = stubFetch({ status: 200, body: { id: 'a' } }, { status: 200, body: { id: 'b' } });
    await google.createEvent('at', { summary: 's', start: 'a', end: 'b', attendeeEmails: ['c@x.com'], addMeet: true });
    await google.createEvent('at', { summary: 's', start: 'a', end: 'b' });
    expect(new URL(calls[0]!.url).searchParams.get('sendUpdates')).toBe('all');
    expect(new URL(calls[0]!.url).searchParams.get('conferenceDataVersion')).toBe('1');
    expect(new URL(calls[1]!.url).searchParams.get('sendUpdates')).toBeNull();
  });

  it('reagendar muda só o horário e recusa evento já apagado na agenda', async () => {
    const calls = stubFetch({ status: 200, body: { id: 'ev', status: 'confirmed' } });
    await google.updateEventTime('at', 'ev', { start: 's', end: 'e', timeZone: 'UTC' });
    expect(calls[0]!.method).toBe('PATCH');
    expect(new URL(calls[0]!.url).searchParams.get('sendUpdates')).toBe('all');
    expect(Object.keys(JSON.parse(calls[0]!.body) as object)).toEqual(['start', 'end']);
    stubFetch({ status: 200, body: { id: 'ev', status: 'cancelled' } });
    expect(await kindOf(google.updateEventTime('at', 'ev', { start: 's', end: 'e', timeZone: 'UTC' }))).toBe('not_found');
  });

  it('revogar: token já inválido conta como revogado', async () => {
    stubFetch({ status: 400, body: { error: 'invalid_token' } });
    await expect(google.revokeToken('rt')).resolves.toBeUndefined();
    stubFetch({ status: 503 });
    expect(await kindOf(google.revokeToken('rt'))).toBe('unavailable');
  });

  it('a mensagem de erro não leva o corpo da resposta', async () => {
    stubFetch({ status: 400, body: { error: { message: 'cliente@segredo.com', errors: [{ reason: 'invalid' }] } } });
    const err = await google.createEvent('at', { summary: 's', start: 'a', end: 'b' }).catch((e: unknown) => e);
    expect((err as Error).message).not.toContain('segredo');
  });
});

describe('MicrosoftCalendarService.listBusy', () => {
  const ms = new MicrosoftCalendarService(config);
  const from = new Date('2026-12-02T00:00:00Z');
  const to = new Date('2026-12-04T00:00:00Z');

  it('trata dia inteiro no fuso do agente, horário em UTC e ignora livres e cancelados', async () => {
    const ev = (start: string, end: string, extra: object = {}): object => ({ start: { dateTime: start }, end: { dateTime: end }, showAs: 'busy', ...extra });
    stubFetch({
      status: 200,
      body: {
        value: [
          ev('2026-12-02T00:00:00.0000000', '2026-12-03T00:00:00.0000000', { isAllDay: true }),
          ev('2026-12-03T15:00:00.0000000', '2026-12-03T16:00:00.0000000'),
          ev('2026-12-03T17:00:00.0000000', '2026-12-03T18:00:00.0000000', { showAs: 'free' }),
          ev('2026-12-03T19:00:00.0000000', '2026-12-03T20:00:00.0000000', { isCancelled: true }),
        ],
      },
    });
    expect(await ms.listBusy('at', from, to, 'America/Sao_Paulo')).toEqual([
      { start: new Date('2026-12-02T03:00:00Z'), end: new Date('2026-12-03T03:00:00Z') },
      { start: new Date('2026-12-03T15:00:00Z'), end: new Date('2026-12-03T16:00:00Z') },
    ]);
  });

  it('segue as páginas, mas só dentro do Graph', async () => {
    const calls = stubFetch(
      { status: 200, body: { value: [], '@odata.nextLink': 'https://graph.microsoft.com/v1.0/me/calendarView?$skip=250' } },
      { status: 200, body: { value: [] } },
    );
    await ms.listBusy('at', from, to, 'UTC');
    expect(calls).toHaveLength(2);
    stubFetch({ status: 200, body: { value: [], '@odata.nextLink': 'https://exemplo.invalido/x' } });
    expect(await kindOf(ms.listBusy('at', from, to, 'UTC'))).toBe('unavailable');
  });
});

describe('fuso e blocos', () => {
  it('meia-noite local em UTC', () => {
    expect(zonedMidnight('2026-12-02', 'America/Sao_Paulo').toISOString()).toBe('2026-12-02T03:00:00.000Z');
    expect(zonedMidnight('2026-07-01', 'Europe/Lisbon').toISOString()).toBe('2026-06-30T23:00:00.000Z');
  });

  it('data sem fuso é Brasília; com fuso é respeitada; inválida é recusada', () => {
    expect(parseDateTime('2026-12-01T14:00').toISOString()).toBe('2026-12-01T17:00:00.000Z');
    expect(parseDateTime('2026-12-01 14:00:30').toISOString()).toBe('2026-12-01T17:00:30.000Z');
    expect(parseDateTime('2026-12-01T14:00:00-03:00').toISOString()).toBe('2026-12-01T17:00:00.000Z');
    expect(parseDateTime('2026-12-01T17:00:00Z').toISOString()).toBe('2026-12-01T17:00:00.000Z');
    expect(Number.isNaN(parseDateTime('amanhã às 14h').getTime())).toBe(true);
    expect(toBrasiliaIso(new Date('2026-12-01T17:00:00.500Z'))).toBe('2026-12-01T14:00:00-03:00');
    expect(brasiliaDate(new Date('2026-12-02T02:30:00Z'))).toBe('2026-12-01');
  });

  it('expediente 9h–18h é de Brasília, não do servidor, e só nos dias habilitados', () => {
    const day = { start: '09:00', end: '18:00', enabled: true };
    // 2026-12-04 é sexta; 05 e 06 fim de semana sem expediente; 07 segunda.
    const slots = new AvailabilityService().computeFreeSlots(
      [], { fri: day, mon: day }, 30, 0, new Date('2026-12-04T03:00:00Z'), new Date('2026-12-08T02:59:00Z'),
    );
    const iso = slots.map((s) => toBrasiliaIso(s.start));
    expect(iso[0]).toBe('2026-12-04T09:00:00-03:00');
    expect(iso.filter((i) => i.startsWith('2026-12-04')).at(-1)).toBe('2026-12-04T17:30:00-03:00');
    expect([...new Set(iso.map((i) => i.slice(0, 10)))]).toEqual(['2026-12-04', '2026-12-07']);
  });

  it('perto da meia-noite UTC usa o dia certo de Brasília', () => {
    // 22h de sexta em Brasília já é sábado em UTC.
    const slots = new AvailabilityService().computeFreeSlots(
      [], { fri: { start: '20:00', end: '23:00', enabled: true } }, 60, 0, new Date('2026-12-05T01:00:00Z'), new Date('2026-12-05T12:00:00Z'),
    );
    expect(slots.map((s) => toBrasiliaIso(s.start))).toEqual(['2026-12-04T22:00:00-03:00']);
  });

  it('horários oferecidos caem em múltiplos de 15 minutos', () => {
    const slots = new AvailabilityService().computeFreeSlots(
      [{ start: new Date('2026-12-04T13:00:00Z'), end: new Date('2026-12-04T13:20:00Z') }],
      { fri: { start: '09:00', end: '12:00', enabled: true } }, 30, 10, new Date('2026-12-04T12:07:33Z'), new Date('2026-12-04T20:00:00Z'),
    );
    expect(slots.map((s) => toBrasiliaIso(s.start).slice(11, 16))).toEqual(['09:15', '10:30', '11:15']);
  });

  it('subtrai o horário da própria reunião sem liberar o resto', () => {
    const t = (h: number): Date => new Date(Date.UTC(2026, 11, 2, h));
    const out = new AvailabilityService().subtractBlock([{ start: t(10), end: t(14) }, { start: t(16), end: t(17) }], { start: t(11), end: t(12) });
    expect(out).toEqual([{ start: t(10), end: t(11) }, { start: t(12), end: t(14) }, { start: t(16), end: t(17) }]);
  });

  it('limita o período consultado', () => {
    expect([clampDays(0), clampDays(9999), clampDays(NaN), clampDays(7)]).toEqual([1, 60, 7, 7]);
  });
});
