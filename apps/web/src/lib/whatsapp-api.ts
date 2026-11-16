import { api } from './api';

export interface WhatsappAccount {
  id: string;
  tenantId: string;
  displayName: string | null;
  phoneNumber: string | null;
  phoneNumberId: string;
  wabaId: string;
  status: 'pending' | 'connected' | 'disconnected' | 'suspended' | 'error';
  qualityRating: string | null;
  lastSyncedAt: string | null;
  agentId: string | null;
  /** client = app Meta do próprio cliente; embedded = app da Walletz (Embedded Signup). */
  credentialSource: 'client' | 'embedded';
  hasAppSecret: boolean;
  createdAt: string;
}

export interface WebhookSetup {
  callbackUrl: string;
  verifyToken: string;
  fields: string[];
}

export interface ConnectResult {
  account: WhatsappAccount;
  webhook: WebhookSetup;
  subscribed: boolean;
  tokenExpiresAt: string | null;
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
  appId: string;
  appSecret: string;
  agentId?: string;
}

export interface EmbeddedSignupPayload {
  code: string;
  path?: 'existing' | 'new';
  wabaId?: string;
  phoneNumberId?: string;
}

export const whatsappApi = {
  listAccounts: (tenantId: string) =>
    api.get<WhatsappAccount[]>(`/tenants/${tenantId}/whatsapp/accounts`),

  getAccount: (tenantId: string, accountId: string) =>
    api.get<WhatsappAccount>(`/tenants/${tenantId}/whatsapp/accounts/${accountId}`),

  embeddedSignup: (tenantId: string, payload: EmbeddedSignupPayload) =>
    api.post<WhatsappAccount>(`/tenants/${tenantId}/whatsapp/embedded-signup`, payload),

  connectAccount: (tenantId: string, payload: ConnectAccountPayload) =>
    api.post<ConnectResult>(`/tenants/${tenantId}/whatsapp/accounts`, payload),

  webhookSetup: (tenantId: string, accountId: string) =>
    api.get<WebhookSetup>(`/tenants/${tenantId}/whatsapp/accounts/${accountId}/webhook-setup`),

  updateCredentials: (tenantId: string, accountId: string, body: { appId: string; accessToken?: string; appSecret?: string }) =>
    api.put<WhatsappAccount>(`/tenants/${tenantId}/whatsapp/accounts/${accountId}/credentials`, body),

  setAgent: (tenantId: string, accountId: string, agentId: string | null) =>
    api.patch<WhatsappAccount>(`/tenants/${tenantId}/whatsapp/accounts/${accountId}/agent`, { agentId }),

  reconnectAccount: (tenantId: string, accountId: string, payload: EmbeddedSignupPayload) =>
    api.post<WhatsappAccount>(`/tenants/${tenantId}/whatsapp/accounts/${accountId}/reconnect`, payload),

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
