import { api } from './api';

/* ── Erros da API ─────────────────────────────────────────────────────────── */

/** Mensagem legível de um erro do axios (a API sempre manda `message`). */
export function apiErrorMessage(err: unknown, fallback = 'Algo deu errado. Tente novamente.'): string {
  const data = (err as { response?: { data?: { message?: unknown } } })?.response?.data;
  const message = data?.message;
  if (Array.isArray(message)) return message.join(' ');
  if (typeof message === 'string' && message.length > 0) return message;
  return fallback;
}

export function apiErrorCode(err: unknown): string | null {
  const data = (err as { response?: { data?: { error?: unknown } } })?.response?.data;
  return typeof data?.error === 'string' ? data.error : null;
}

/* ── Planos (Proposta Comercial v4.2) ─────────────────────────────────────── */

export type PlanSlug = 'starter' | 'pro' | 'business' | 'agency';
export type FeatureAvailability = 'available' | 'in_development' | 'not_included';

export interface PlanLimits {
  agents: number;
  users: number;
  aiConnections: number;
  whatsappNumbers: number;
  calendars: number;
  webchatWidgets: number;
  outboundWebhooks: number;
  subaccounts: number;
}

export type PlanFeatureKey =
  | 'webchat'
  | 'whatsapp'
  | 'calendars'
  | 'emailNotifications'
  | 'emailInbox'
  | 'outboundWebhooks'
  | 'publicApi'
  | 'crmConnectors'
  | 'whiteLabel'
  | 'campaigns';

export interface PlanDefinition {
  slug: PlanSlug;
  name: string;
  description: string;
  priceMonthlyCents: number;
  setupFeeCents: number;
  setupFeeCashCents: number;
  limits: PlanLimits;
  features: Record<PlanFeatureKey, FeatureAvailability>;
  support: 'basico' | 'prioritario' | 'empresarial' | 'parceiro';
  supportTargetsHours: { p1: number; p2: number; p3: number };
}

export interface TenantPlanSummary {
  plan: PlanDefinition;
  usage: PlanLimits;
  enabledFeatures: Record<PlanFeatureKey, boolean>;
  /** Tokens usados no mês (só acompanhamento; o custo é cobrado pelo provedor do cliente). */
  aiTokensMonth: number;
}

export const LIMIT_LABELS: Record<keyof PlanLimits, string> = {
  agents: 'Agentes ativos',
  users: 'Usuários',
  aiConnections: 'Conexões de IA',
  whatsappNumbers: 'Números de WhatsApp',
  calendars: 'Agendas',
  webchatWidgets: 'Widgets de webchat',
  outboundWebhooks: 'Webhooks de saída',
  subaccounts: 'Subcontas',
};

export const FEATURE_LABELS: Record<PlanFeatureKey, string> = {
  webchat: 'Webchat no site',
  whatsapp: 'WhatsApp oficial (Meta)',
  calendars: 'Agendas Google / Microsoft',
  emailNotifications: 'Notificações por e-mail',
  emailInbox: 'Caixa de e-mail corporativa',
  outboundWebhooks: 'Webhooks de saída',
  publicApi: 'API pública',
  crmConnectors: 'Trello / CRM de catálogo',
  whiteLabel: 'White Label e subcontas',
  campaigns: 'Campanhas em massa',
};

export const SUPPORT_LABELS: Record<PlanDefinition['support'], string> = {
  basico: 'Básico',
  prioritario: 'Prioritário',
  empresarial: 'Empresarial',
  parceiro: 'Parceiro',
};

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

export const plansApi = {
  catalog: () => api.get<PlanDefinition[]>('/tenants/plans/catalog'),
  summary: (tenantId: string) => api.get<TenantPlanSummary>(`/tenants/${tenantId}/plan`),
};

/* ── Conexões de IA (chave do próprio cliente) ────────────────────────────── */

export type AiProvider = 'anthropic' | 'openai' | 'gemini' | 'openrouter';
export type AiConnectionStatus = 'active' | 'invalid' | 'billing_error' | 'revoked';

export interface AiProviderInfo {
  id: AiProvider;
  name: string;
  keyHint: string;
  preferredModels: string[];
  links: { buyCredits: string; createKey: string; pricing: string; help?: string };
  billingNote: string;
}

export interface AiConnection {
  id: string;
  provider: AiProvider;
  providerName: string;
  label: string | null;
  maskedKey: string;
  defaultModel: string;
  isDefault: boolean;
  status: AiConnectionStatus;
  lastValidatedAt: string | null;
  lastError: string | null;
  lastErrorAt: string | null;
  createdAt: string;
}

export const aiConnectionsApi = {
  providers: (tenantId: string) => api.get<AiProviderInfo[]>(`/tenants/${tenantId}/ai-connections/providers`),
  list: (tenantId: string) => api.get<AiConnection[]>(`/tenants/${tenantId}/ai-connections`),
  create: (tenantId: string, body: { provider: AiProvider; apiKey: string; model?: string; label?: string; makeDefault?: boolean }) =>
    api.post<AiConnection>(`/tenants/${tenantId}/ai-connections`, body),
  update: (tenantId: string, id: string, body: { apiKey?: string; model?: string; label?: string }) =>
    api.patch<AiConnection>(`/tenants/${tenantId}/ai-connections/${id}`, body),
  test: (tenantId: string, id: string) =>
    api.post<{ ok: boolean; status: AiConnectionStatus; model: string; message: string }>(`/tenants/${tenantId}/ai-connections/${id}/test`),
  models: (tenantId: string, id: string) => api.get<string[]>(`/tenants/${tenantId}/ai-connections/${id}/models`),
  setDefault: (tenantId: string, id: string) => api.post<AiConnection>(`/tenants/${tenantId}/ai-connections/${id}/default`),
  remove: (tenantId: string, id: string) => api.delete(`/tenants/${tenantId}/ai-connections/${id}`),
  setAgentConnection: (tenantId: string, agentId: string, connectionId: string | null) =>
    api.put(`/tenants/${tenantId}/ai-connections/agents/${agentId}`, { connectionId }),
};

/* ── Webchat ──────────────────────────────────────────────────────────────── */

export interface WebchatWidget {
  id: string;
  agentId: string;
  name: string;
  publicKey: string;
  allowedOrigins: string[];
  title: string;
  welcomeMessage: string | null;
  primaryColor: string;
  isEnabled: boolean;
  createdAt: string;
}

export interface WidgetInput {
  agentId?: string;
  name?: string;
  allowedOrigins?: string[];
  title?: string;
  welcomeMessage?: string;
  primaryColor?: string;
  isEnabled?: boolean;
}

export const webchatApi = {
  list: (tenantId: string) => api.get<WebchatWidget[]>(`/tenants/${tenantId}/webchat/widgets`),
  create: (tenantId: string, body: WidgetInput & { agentId: string; name: string }) =>
    api.post<WebchatWidget>(`/tenants/${tenantId}/webchat/widgets`, body),
  update: (tenantId: string, id: string, body: WidgetInput) => api.patch<WebchatWidget>(`/tenants/${tenantId}/webchat/widgets/${id}`, body),
  remove: (tenantId: string, id: string) => api.delete(`/tenants/${tenantId}/webchat/widgets/${id}`),
};

/** URL pública do script do widget (mesma base da API). */
export function widgetScriptUrl(): string {
  const base = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001').replace(/\/$/, '');
  const absolute = base.startsWith('http') ? base : `${typeof window !== 'undefined' ? window.location.origin : ''}${base}`;
  return `${absolute}/v1/public/webchat/widget.js`;
}

/* ── Webhooks de saída ────────────────────────────────────────────────────── */

export interface OutboundWebhook {
  id: string;
  url: string;
  description: string | null;
  events: string[];
  isActive: boolean;
  lastDeliveryAt: string | null;
  lastDeliveryStatus: number | null;
  lastDeliveryError: string | null;
  consecutiveFailures: number;
  createdAt: string;
}

export const webhooksApi = {
  events: (tenantId: string) => api.get<Array<{ name: string; description: string }>>(`/tenants/${tenantId}/webhooks/events`),
  list: (tenantId: string) => api.get<OutboundWebhook[]>(`/tenants/${tenantId}/webhooks`),
  create: (tenantId: string, body: { url: string; events: string[]; description?: string }) =>
    api.post<OutboundWebhook & { secret: string }>(`/tenants/${tenantId}/webhooks`, body),
  update: (tenantId: string, id: string, body: { url?: string; events?: string[]; description?: string; isActive?: boolean }) =>
    api.patch<OutboundWebhook>(`/tenants/${tenantId}/webhooks/${id}`, body),
  rotateSecret: (tenantId: string, id: string) => api.post<{ secret: string }>(`/tenants/${tenantId}/webhooks/${id}/rotate-secret`),
  test: (tenantId: string, id: string) =>
    api.post<{ ok: boolean; status: number | null; error: string | null }>(`/tenants/${tenantId}/webhooks/${id}/test`),
  remove: (tenantId: string, id: string) => api.delete(`/tenants/${tenantId}/webhooks/${id}`),
};
