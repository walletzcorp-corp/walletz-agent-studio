import { api } from './api';

export interface MetaConfigPublic {
  appId: string;
  configId: string;
  hasAppSecret: boolean;
  appSecretTail: string | null;
  hasVerifyToken: boolean;
  graphApiVersion: string;
  webhookStatus: string;
  connectionStatus: string;
  lastTestAt: string | null;
  lastTestResult: TestResult | null;
  webhookUrl: string;
}

export interface TestResultItem {
  ok: boolean;
  message: string;
}

export interface TestResult {
  appId: TestResultItem;
  appSecret: TestResultItem;
  configId: TestResultItem;
  graphApi: TestResultItem;
  overallOk: boolean;
}

export interface WebhookTestResult {
  reachable: boolean;
  challengeOk: boolean;
  message: string;
}

export const metaConfigApi = {
  get: (tenantId: string) =>
    api.get<MetaConfigPublic>(`/tenants/${tenantId}/whatsapp/meta-config`),

  save: (
    tenantId: string,
    body: {
      appId: string;
      configId: string;
      appSecret?: string;
      verifyToken?: string;
      graphApiVersion?: string;
    },
  ) => api.post<MetaConfigPublic>(`/tenants/${tenantId}/whatsapp/meta-config`, body),

  test: (tenantId: string) =>
    api.post<TestResult>(`/tenants/${tenantId}/whatsapp/meta-config/test`),

  testWebhook: (tenantId: string) =>
    api.post<WebhookTestResult>(`/tenants/${tenantId}/whatsapp/meta-config/test-webhook`),
};
