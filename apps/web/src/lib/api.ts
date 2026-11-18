import axios, { type AxiosInstance, type AxiosError } from 'axios';
import { withBasePath } from './paths';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/**
 * Bloqueios da organização inteira vindos da API (valem para qualquer tela):
 * o painel mostra a mensagem num aviso fixo em vez de erros soltos.
 */
export const ACCOUNT_BLOCK_CODES = ['TRIAL_EXPIRED', 'TENANT_SUSPENDED'] as const;
export const ACCOUNT_BLOCKED_EVENT = 'walletz:account-blocked';

/** Códigos de plano: a mensagem da API já explica o que fazer e deve aparecer como está. */
export const PLAN_ERROR_CODES = [
  'PLAN_LIMIT_REACHED',
  'PLAN_LIMIT_EXCEEDED',
  'FEATURE_NOT_IN_PLAN',
  'FEATURE_IN_DEVELOPMENT',
  ...ACCOUNT_BLOCK_CODES,
] as const;

/** Mensagem legível de um erro da API de plano/organização, ou null se não for um. */
export function planErrorMessage(err: unknown): string | null {
  const data = (err as { response?: { status?: number; data?: { error?: unknown; message?: unknown } } })?.response;
  if (data?.status !== 403) return null;
  const code = typeof data.data?.error === 'string' ? data.data.error : '';
  const message = typeof data.data?.message === 'string' ? data.data.message : null;
  return (PLAN_ERROR_CODES as readonly string[]).includes(code) ? message : null;
}

function createApiClient(): AxiosInstance {
  const client = axios.create({
    baseURL: `${API_BASE}/v1`,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: false,
  });

  client.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      const tenantSlug = localStorage.getItem('tenantSlug');
      if (tenantSlug) {
        config.headers['x-tenant-slug'] = tenantSlug;
      }
    }
    return config;
  });

  client.interceptors.response.use(
    (res) => res,
    async (error: AxiosError) => {
      if (error.response?.status === 403 && typeof window !== 'undefined') {
        const body = error.response.data as { error?: unknown; message?: unknown } | undefined;
        const code = typeof body?.error === 'string' ? body.error : '';
        // Usuário acima do limite do plano também perde o acesso à organização inteira.
        const isUserBlocked = code === 'PLAN_LIMIT_EXCEEDED' && (body as { resource?: unknown })?.resource === 'users';
        if ((ACCOUNT_BLOCK_CODES as readonly string[]).includes(code) || isUserBlocked) {
          const message = typeof body?.message === 'string' ? body.message : 'O acesso a esta organização está bloqueado.';
          window.dispatchEvent(new CustomEvent(ACCOUNT_BLOCKED_EVENT, { detail: { code, message } }));
        }
      }
      if (error.response?.status === 401 && typeof window !== 'undefined') {
        const refreshToken = localStorage.getItem('refreshToken');
        const sessionId = localStorage.getItem('sessionId');
        if (refreshToken && sessionId) {
          try {
            const { data } = await axios.post<{ accessToken: string; refreshToken: string }>(
              `${API_BASE}/v1/auth/refresh`,
              { refreshToken, sessionId },
            );
            localStorage.setItem('accessToken', data.accessToken);
            localStorage.setItem('refreshToken', data.refreshToken);
            // sessionId fica no payload do novo access token; regrava para próximas renovações
            try {
              const part = data.accessToken.split('.')[1];
              if (part) {
                const p = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/'))) as Record<string, unknown>;
                if (typeof p['sessionId'] === 'string') localStorage.setItem('sessionId', p['sessionId']);
              }
            } catch { /* mantém o sessionId anterior */ }
            if (error.config) {
              error.config.headers.Authorization = `Bearer ${data.accessToken}`;
              return client.request(error.config);
            }
          } catch {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('sessionId');
            window.location.href = withBasePath('/auth/login');
          }
        }
      }
      return Promise.reject(error);
    },
  );

  return client;
}

export const api = createApiClient();

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  requiresMfa?: boolean;
  mfaToken?: string;
}

export const authApi = {
  register: (data: { email: string; password: string; firstName?: string | undefined; lastName?: string | undefined }) =>
    api.post<{ userId: string; email: string }>('/auth/register', data),

  login: (data: { email: string; password: string; mfaCode?: string | undefined }) =>
    api.post<LoginResponse>('/auth/login', data),

  logout: () => api.post('/auth/logout'),

  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string) =>
    api.post('/auth/reset-password', { token, password }),

  me: () =>
    api.get<{
      userId: string;
      email: string;
      sessionId: string;
      firstName?: string | null;
      lastName?: string | null;
      isPlatformAdmin?: boolean;
    }>('/auth/me'),
};

export interface TenantMember {
  id: string;
  role: string;
  status: string;
  createdAt: string;
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
}

export const tenantsApi = {
  create: (data: { name: string; slug: string; timezone?: string; locale?: string }) =>
    api.post('/tenants', data),

  myTenants: () =>
    api.get<Array<{ tenantId: string; tenantName: string; tenantSlug: string; role: string }>>('/tenants/my'),

  getOne: (tenantId: string) => api.get(`/tenants/${tenantId}`),

  updateSettings: (tenantId: string, data: object) => api.patch(`/tenants/${tenantId}/settings`, data),

  getMembers: (tenantId: string) => api.get<TenantMember[]>(`/tenants/${tenantId}/members`),

  addMember: (tenantId: string, data: { email: string; firstName: string; lastName?: string; role: string; password: string }) =>
    api.post(`/tenants/${tenantId}/members`, data),

  updateMemberRole: (tenantId: string, membershipId: string, role: string) =>
    api.patch(`/tenants/${tenantId}/members/${membershipId}/role`, { role }),

  removeMember: (tenantId: string, membershipId: string) =>
    api.delete(`/tenants/${tenantId}/members/${membershipId}`),

  featureFlags: (tenantId: string) => api.get(`/tenants/${tenantId}/feature-flags`),
};
