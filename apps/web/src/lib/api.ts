import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios';

const BASE_URL = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3011'}/api/v1`;

/* ── Types ─────────────────────────────────────────────────────────────────── */

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  requiresMfa?: boolean;
  mfaToken?: string;
}

export interface UserProfile {
  userId: string;
  email: string;
  isPlatformAdmin?: boolean;
}

export interface TenantMembership {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  role: string;
}

export interface TenantMember {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string | null;
  role: string;
  status: 'active' | 'pending';
  createdAt: string;
}

/* ── Helpers ────────────────────────────────────────────────────────────────── */

function extractSessionIdFromToken(token: string): string | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const payload = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/'))) as Record<string, unknown>;
    return typeof payload['sessionId'] === 'string' ? payload['sessionId'] : null;
  } catch {
    return null;
  }
}

/* ── Axios instance ─────────────────────────────────────────────────────────── */

function createClient(): AxiosInstance {
  const instance = axios.create({
    baseURL: BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: false,
  });

  // Inject auth token and tenant slug on every request
  instance.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (token) config.headers.Authorization = `Bearer ${token}`;
      const tenantSlug = localStorage.getItem('tenantSlug');
      if (tenantSlug) config.headers['x-tenant-slug'] = tenantSlug;
    }
    return config;
  });

  // On 401, try to refresh the access token once then retry
  instance.interceptors.response.use(
    (res) => res,
    async (err) => {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const config = (err as { config?: Record<string, unknown> })?.config;

      if (status === 401 && typeof window !== 'undefined' && config && !config['_retry']) {
        config['_retry'] = true;
        const refreshToken = localStorage.getItem('refreshToken');
        const sessionId = localStorage.getItem('sessionId');

        if (refreshToken && sessionId) {
          try {
            const { data } = await axios.post<LoginResponse>(`${BASE_URL}/auth/refresh`, {
              refreshToken,
              sessionId,
            });
            localStorage.setItem('accessToken', data.accessToken);
            localStorage.setItem('refreshToken', data.refreshToken);
            // Update sessionId from new token so future refreshes work
            const newSessionId = extractSessionIdFromToken(data.accessToken);
            if (newSessionId) localStorage.setItem('sessionId', newSessionId);

            (config as { headers?: Record<string, string> }).headers = {
              ...((config as { headers?: Record<string, string> }).headers ?? {}),
              Authorization: `Bearer ${data.accessToken}`,
            };
            return instance.request(config as Parameters<typeof instance.request>[0]);
          } catch {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('sessionId');
            const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
            window.location.href = `${basePath}/auth/login`;
          }
        }
      }
      return Promise.reject(err);
    },
  );

  return instance;
}

const client = createClient();

/* ── Generic API helpers (overloaded for backward compat) ─────────────────── */
// Overload 1: explicit token string (or undefined) → resolves to T directly (legacy admin pages)
// Overload 2: axios config or none  → resolves to AxiosResponse<T> (dashboard pages)

function makeGet(c: AxiosInstance) {
  function get<T>(path: string, token: string | undefined): Promise<T>;
  function get<T>(path: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  function get<T>(path: string, arg?: string | AxiosRequestConfig): Promise<T | AxiosResponse<T>> {
    if (arg === undefined || arg === null) return c.get<T>(path);
    if (typeof arg === 'string') {
      return c.get<T>(path, { headers: { Authorization: `Bearer ${arg}` } }).then((r) => r.data as T);
    }
    return c.get<T>(path, arg);
  }
  return get;
}

function makePost(c: AxiosInstance) {
  function post<T>(path: string, body: unknown, token: string | undefined): Promise<T>;
  function post<T>(path: string, body?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  function post<T>(path: string, body?: unknown, arg?: string | AxiosRequestConfig): Promise<T | AxiosResponse<T>> {
    if (typeof arg === 'string') {
      return c.post<T>(path, body, { headers: { Authorization: `Bearer ${arg}` } }).then((r) => r.data as T);
    }
    return c.post<T>(path, body, arg as AxiosRequestConfig | undefined);
  }
  return post;
}

function makePut(c: AxiosInstance) {
  function put<T>(path: string, body: unknown, token: string | undefined): Promise<T>;
  function put<T>(path: string, body?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  function put<T>(path: string, body?: unknown, arg?: string | AxiosRequestConfig): Promise<T | AxiosResponse<T>> {
    if (typeof arg === 'string') {
      return c.put<T>(path, body, { headers: { Authorization: `Bearer ${arg}` } }).then((r) => r.data as T);
    }
    return c.put<T>(path, body, arg as AxiosRequestConfig | undefined);
  }
  return put;
}

function makePatch(c: AxiosInstance) {
  function patch<T>(path: string, body: unknown, token: string | undefined): Promise<T>;
  function patch<T>(path: string, body?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  function patch<T>(path: string, body?: unknown, arg?: string | AxiosRequestConfig): Promise<T | AxiosResponse<T>> {
    if (typeof arg === 'string') {
      return c.patch<T>(path, body, { headers: { Authorization: `Bearer ${arg}` } }).then((r) => r.data as T);
    }
    return c.patch<T>(path, body, arg as AxiosRequestConfig | undefined);
  }
  return patch;
}

function makeDelete(c: AxiosInstance) {
  function del<T>(path: string, token: string | undefined): Promise<T>;
  function del<T>(path: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  function del<T>(path: string, arg?: string | AxiosRequestConfig): Promise<T | AxiosResponse<T>> {
    if (arg === undefined || arg === null) return c.delete<T>(path);
    if (typeof arg === 'string') {
      return c.delete<T>(path, { headers: { Authorization: `Bearer ${arg}` } }).then((r) => r.data as T);
    }
    return c.delete<T>(path, arg);
  }
  return del;
}

export const api = {
  get: makeGet(client),
  post: makePost(client),
  put: makePut(client),
  patch: makePatch(client),
  delete: makeDelete(client),
};

/* ── Auth API ─────────────────────────────────────────────────────────────── */

export const authApi = {
  login: (body: { email: string; password: string; mfaCode?: string }) =>
    client.post<LoginResponse>('/auth/login', body),
  logout: () => client.post('/auth/logout'),
  me: () => client.get<UserProfile>('/auth/me'),
  refresh: (body: { refreshToken: string; sessionId: string }) =>
    client.post<LoginResponse>('/auth/refresh', body),
  register: (body: { email: string; password: string; firstName: string; lastName?: string }) =>
    client.post('/auth/register', body),
  forgotPassword: (email: string) =>
    client.post('/auth/forgot-password', { email }),
};

/* ── Tenants API ─────────────────────────────────────────────────────────── */

export const tenantsApi = {
  myTenants: () => client.get<TenantMembership[]>('/tenants/my'),
  create: (body: { name: string; slug: string; timezone: string; locale: string }) =>
    client.post('/tenants', body),
  getMembers: (tenantId: string) =>
    client.get<TenantMember[]>(`/tenants/${tenantId}/members`),
  addMember: (tenantId: string, body: { email: string; firstName: string; lastName?: string; role: string; password: string }) =>
    client.post<TenantMember>(`/tenants/${tenantId}/members`, body),
  updateMemberRole: (tenantId: string, memberId: string, role: string) =>
    client.patch<TenantMember>(`/tenants/${tenantId}/members/${memberId}`, { role }),
  removeMember: (tenantId: string, memberId: string) =>
    client.delete(`/tenants/${tenantId}/members/${memberId}`),
};
