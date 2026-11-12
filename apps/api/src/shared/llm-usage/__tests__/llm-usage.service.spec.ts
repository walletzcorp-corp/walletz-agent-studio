import { parseRateLimitHeaders, startOfCurrentMonthUtc, type HeaderBag } from '../llm-usage.service';

function headers(entries: Record<string, string>): HeaderBag {
  return {
    forEach: (cb) => Object.entries(entries).forEach(([k, v]) => cb(v, k)),
  };
}

describe('parseRateLimitHeaders', () => {
  const now = new Date('2026-11-12T15:00:00Z');

  it('agrupa limit/remaining/reset por tipo de limite', () => {
    const snap = parseRateLimitHeaders(
      headers({
        'anthropic-ratelimit-requests-limit': '4000',
        'anthropic-ratelimit-requests-remaining': '3999',
        'anthropic-ratelimit-requests-reset': '2026-11-12T15:00:01Z',
        'anthropic-ratelimit-input-tokens-limit': '2000000',
        'anthropic-ratelimit-input-tokens-remaining': '1999000',
        'anthropic-ratelimit-output-tokens-limit': '400000',
        'content-type': 'application/json',
      }),
      now,
    );
    expect(snap).toEqual({
      capturedAt: '2026-11-12T15:00:00.000Z',
      limits: {
        requests: { limit: 4000, remaining: 3999, reset: '2026-11-12T15:00:01Z' },
        'input-tokens': { limit: 2000000, remaining: 1999000, reset: null },
        'output-tokens': { limit: 400000, remaining: null, reset: null },
      },
    });
  });

  it('retorna null quando não há headers de rate limit', () => {
    expect(parseRateLimitHeaders(headers({ 'content-type': 'application/json' }), now)).toBeNull();
  });

  it('ignora valores numéricos inválidos', () => {
    const snap = parseRateLimitHeaders(headers({ 'Anthropic-RateLimit-Tokens-Limit': 'abc' }), now);
    expect(snap?.limits['tokens']).toEqual({ limit: null, remaining: null, reset: null });
  });
});

describe('startOfCurrentMonthUtc', () => {
  it('retorna o primeiro dia do mês em UTC', () => {
    expect(startOfCurrentMonthUtc(new Date('2026-11-30T23:59:59Z')).toISOString()).toBe('2026-11-01T00:00:00.000Z');
  });
});
