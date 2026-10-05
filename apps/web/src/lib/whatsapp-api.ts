import { api } from './api';

export interface WhatsappAccount {
  id: string;
  tenantId: string;
  displayName: string | null;
  phoneNumber: string | null;
  phoneNumberId: string;
  wabaId: string;
  webhookUrl: string | null;
  status: 'pending' | 'connected' | 'disconnected' | 'suspended' | 'error';
  qualityRating: string | null;
  lastSyncedAt: string | null;
  createdAt: string;
}

export interface WhatsappTemplate {
  id: string;
  name: string;
  language: string;
  category: string;
  status: string;
  components: unknown[];
}

export interface ConnectAccountPayload {
  phoneNumberId: string;
  wabaId: string;
  accessToken: string;
  appSecret?: string;
  verifyToken: string;
  webhookUrl: string;
}

export const whatsappApi = {
  listAccounts: (tenantId: string) =>
    api.get<WhatsappAccount[]>(`/tenants/${tenantId}/whatsapp/accounts`),

  getAccount: (tenantId: string, accountId: string) =>
    api.get<WhatsappAccount>(`/tenants/${tenantId}/whatsapp/accounts/${accountId}`),

  connectAccount: (tenantId: string, payload: ConnectAccountPayload) =>
    api.post<WhatsappAccount>(`/tenants/${tenantId}/whatsapp/accounts`, payload),

  disconnectAccount: (tenantId: string, accountId: string) =>
    api.delete(`/tenants/${tenantId}/whatsapp/accounts/${accountId}`),

  sendMessage: (tenantId: string, accountId: string, to: string, text: string) =>
    api.post(`/tenants/${tenantId}/whatsapp/accounts/${accountId}/send`, { to, text }),

  syncTemplates: (tenantId: string, accountId: string) =>
    api.post(`/tenants/${tenantId}/whatsapp/accounts/${accountId}/sync-templates`),

  listTemplates: (tenantId: string, accountId: string) =>
    api.get<WhatsappTemplate[]>(`/tenants/${tenantId}/whatsapp/accounts/${accountId}/templates`),

  getStats: (tenantId: string, accountId: string) =>
    api.get<{ sent: number; received: number; failed: number; total: number }>(
      `/tenants/${tenantId}/whatsapp/accounts/${accountId}/stats`,
    ),
};
