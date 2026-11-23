/**
 * Falhas dos provedores de agenda:
 * - unauthorized: token recusado agora (vale renovar e tentar de novo)
 * - reauth: só volta a funcionar se o usuário autorizar de novo
 * - not_found: o evento não existe mais no provedor
 * - rejected: o provedor recusou os dados enviados
 * - unavailable: rede, limite de uso ou erro do provedor (tentar mais tarde)
 */
export type CalendarErrorKind = 'unauthorized' | 'reauth' | 'not_found' | 'rejected' | 'unavailable';

/** A mensagem nunca leva o corpo da resposta (pode conter dados da agenda). */
export class CalendarProviderError extends Error {
  constructor(
    readonly kind: CalendarErrorKind,
    readonly operation: string,
    readonly status?: number,
    readonly reason?: string,
  ) {
    super(`${operation}: ${kind}${status ? ` (${status})` : ''}${reason ? ` ${reason}` : ''}`);
    this.name = 'CalendarProviderError';
  }
}

const REQUEST_TIMEOUT_MS = 15_000;

const GOOGLE_SCOPE_REASONS = new Set(['insufficientPermissions', 'ACCESS_TOKEN_SCOPE_INSUFFICIENT', 'PERMISSION_DENIED']);
const RATE_LIMIT_REASONS = new Set(['rateLimitExceeded', 'userRateLimitExceeded', 'quotaExceeded', 'RATE_LIMIT_EXCEEDED']);

/** Motivo curto do erro (código do provedor), sem o texto livre da resposta. */
async function readReason(res: Response): Promise<string | undefined> {
  try {
    const body = (await res.json()) as {
      error?: string | { code?: string | number; status?: string; errors?: Array<{ reason?: string }>; details?: Array<{ reason?: string }> };
    };
    if (typeof body.error === 'string') return body.error;
    const detail = body.error?.details?.find((d) => d.reason)?.reason;
    const first = body.error?.errors?.[0]?.reason;
    const code = typeof body.error?.code === 'string' ? body.error.code : undefined;
    return detail ?? first ?? code ?? body.error?.status;
  } catch {
    return undefined;
  }
}

function kindFor(status: number, reason: string | undefined): CalendarErrorKind {
  if (status === 401) return 'unauthorized';
  if (status === 404 || status === 410) return 'not_found';
  if (status === 403) {
    if (reason && RATE_LIMIT_REASONS.has(reason)) return 'unavailable';
    if (reason && (GOOGLE_SCOPE_REASONS.has(reason) || reason === 'ErrorAccessDenied')) return 'reauth';
    return 'unavailable';
  }
  if (status === 400 || status === 422) return 'rejected';
  return 'unavailable';
}

/** fetch com tempo limite que converte qualquer falha em CalendarProviderError. */
export async function calendarFetch(operation: string, url: string, init: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch {
    throw new CalendarProviderError('unavailable', operation, undefined, 'network');
  }
  if (res.ok) return res;
  const reason = await readReason(res);
  throw new CalendarProviderError(kindFor(res.status, reason), operation, res.status, reason);
}
