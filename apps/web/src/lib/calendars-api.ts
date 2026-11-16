import { api } from './api';

export const calendarsApi = {
  listConnections: (tenantId: string) =>
    api.get<unknown[]>(`/tenants/${tenantId}/calendars/connections`),

  sync: (tenantId: string) => api.post(`/tenants/${tenantId}/calendars/sync`),

  disconnect: (tenantId: string, connectionId: string) =>
    api.delete(`/tenants/${tenantId}/calendars/connections/${connectionId}`),

  /** Returns the provider consent URL; the browser then navigates to it. */
  startAuthorization: (tenantId: string, provider: 'google' | 'microsoft') =>
    api.post<{ url: string }>(`/tenants/${tenantId}/calendars/${provider}/authorize`),

  listPcDevices: (tenantId: string) =>
    api.get<unknown[]>(`/tenants/${tenantId}/pc-connector/devices`),
};
