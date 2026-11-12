import { api } from './api';

export type CalendarProvider = 'google' | 'microsoft';

/**
 * Inicia a conexão de agenda: pede à API (com o token) a URL de consentimento
 * do provedor e leva o navegador até ela. Abrir a rota da API direto no
 * navegador não funciona, porque a navegação não envia o token de login.
 * Lança erro com mensagem legível quando a API recusa (ex.: não configurado).
 */
export async function startCalendarConnect(tenantId: string, provider: CalendarProvider): Promise<void> {
  try {
    const { data } = await api.get<{ url: string }>(`/tenants/${tenantId}/calendars/${provider}/authorize`);
    window.location.href = data.url;
  } catch (err) {
    const res = (err as { response?: { status?: number; data?: { message?: unknown } } })?.response;
    const msg = typeof res?.data?.message === 'string' ? res.data.message : null;
    if (res?.status === 403) throw new Error('Só administradores da organização podem conectar agendas.');
    throw new Error(msg ?? 'Não foi possível iniciar a conexão com a agenda. Tente de novo.');
  }
}

/** Lê ?connected= / ?error= deixados pelo retorno do provedor e limpa a URL. */
export function readCalendarCallbackResult(): { connected?: CalendarProvider; error?: string } | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const connected = params.get('connected');
  const error = params.get('error');
  if (!connected && !error) return null;
  window.history.replaceState(null, '', window.location.pathname);
  return {
    ...(connected === 'google' || connected === 'microsoft' ? { connected } : {}),
    ...(error ? { error } : {}),
  };
}
