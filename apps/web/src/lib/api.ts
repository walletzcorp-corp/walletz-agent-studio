import axios, { type AxiosInstance, type AxiosError } from 'axios';
import { withBasePath } from './paths';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

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

  me: () => api.get<{ userId: string; email: string; sessionId: string }>('/auth/me'),
};

export const tenantsApi = {
  create: (data: { name: string; slug: string; timezone?: string; locale?: string }) =>
    api.post('/tenants', data),

  myTenants: () =>
    api.get<Array<{ tenantId: string; tenantName: string; tenantSlug: string; role: string }>>('/tenants/my'),

  getOne: (tenantId: string) => api.get(`/tenants/${tenantId}`),

  updateSettings: (tenantId: string, data: object) => api.patch(`/tenants/${tenantId}/settings`, data),

  getMembers: (tenantId: string) => api.get(`/tenants/${tenantId}/members`),

  inviteMember: (tenantId: string, data: { email: string; role: string }) =>
    api.post(`/tenants/${tenantId}/members/invite`, data),

  featureFlags: (tenantId: string) => api.get(`/tenants/${tenantId}/feature-flags`),
};
