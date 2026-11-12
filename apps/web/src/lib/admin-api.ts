import { api } from './api';

/* ── Tipos (espelham as respostas de /v1/admin/*) ─────────────────────── */

export interface RateLimitEntry {
  limit: number | null;
  remaining: number | null;
  reset: string | null;
}

export interface RateLimitSnapshot {
  capturedAt: string;
  limits: Record<string, RateLimitEntry>;
}

export interface ActivityItem {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  createdAt: string;
  tenantId: string | null;
  tenantName: string | null;
  userId: string | null;
  userEmail: string | null;
}

export interface AdminOverview {
  generatedAt: string;
  tenants: { total: number; byStatus: Record<string, number> };
  users: { total: number; new30d: number; active7d: number };
  agents: {
    total: number;
    byStatus: Record<string, number>;
    byTemplate: Array<{ template: string; agents: number; tenants: number }>;
  };
  conversations: { total: number; last30d: number; messages30d: number; contacts: number };
  knowledge: { sources: number; items: number };
  llm: {
    model: string;
    monthStart: string;
    inputTokensMonth: number;
    outputTokensMonth: number;
    tokensToday: number;
    callsMonth: number;
    rateLimits: RateLimitSnapshot | null;
    topTenants: Array<{ id: string; name: string; tokens: number; limit: number | null }>;
  };
  daily: Array<{ day: string; tenants: number; agents: number; tokens: number }>;
  agentsPerTenant: Array<{
    id: string;
    name: string;
    status: string;
    agents: number;
    byTemplate: Record<string, number>;
  }>;
  recentActivity: ActivityItem[];
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminTenantRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  planId: string | null;
  trialEndsAt: string | null;
  createdAt: string;
  ownerEmail: string | null;
  members: number;
  agents: number;
  conversations: number;
  tokensMonth: number;
  tokenLimit: number | null;
  topTemplate: string | null;
  lastActivityAt: string | null;
}

export interface AdminTenantDetail {
  tenant: {
    id: string;
    name: string;
    slug: string;
    status: string;
    planId: string | null;
    trialEndsAt: string | null;
    timezone: string;
    locale: string;
    country: string;
    currency: string;
    createdAt: string;
    updatedAt: string;
  };
  llm: {
    monthStart: string;
    tokensMonth: number;
    limit: number | null;
    daily: Array<{ day: string; input: number; output: number }>;
  };
  counts: {
    conversations: number;
    messages: number;
    contacts: number;
    knowledgeSources: number;
    knowledgeItems: number;
    whatsappAccounts: number;
    calendarConnections: number;
  };
  members: Array<{
    userId: string;
    email: string;
    name: string | null;
    role: string;
    status: string;
    lastLoginAt: string | null;
    joinedAt: string;
  }>;
  agents: Array<{
    id: string;
    name: string;
    title: string | null;
    template: string;
    status: string;
    tokensMonth: number;
    createdAt: string;
    updatedAt: string;
  }>;
  agentsByTemplate: Record<string, number>;
  activity: ActivityItem[];
}

export interface AdminAgentRow {
  id: string;
  name: string;
  template: string;
  status: string;
  createdAt: string;
  createdBy: string | null;
  tenantId: string;
  tenantName: string;
  tokensMonth: number;
}

export interface AdminUserRow {
  id: string;
  email: string;
  name: string | null;
  isPlatformAdmin: boolean;
  emailVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  memberships: Array<{ tenantId: string; tenantName: string; role: string }>;
}

type Query = Record<string, string | number | undefined>;

function clean(q: Query): Record<string, string | number> {
  return Object.fromEntries(
    Object.entries(q).filter(([, v]) => v !== undefined && v !== ''),
  ) as Record<string, string | number>;
}

/* ── Chamadas ─────────────────────────────────────────────────────────── */

export const adminApi = {
  overview: () => api.get<AdminOverview>('/admin/overview'),
  tenants: (q: Query = {}) => api.get<Paginated<AdminTenantRow>>('/admin/tenants', { params: clean(q) }),
  tenant: (id: string) => api.get<AdminTenantDetail>(`/admin/tenants/${id}`),
  agents: (q: Query = {}) => api.get<Paginated<AdminAgentRow>>('/admin/agents', { params: clean(q) }),
  users: (q: Query = {}) => api.get<Paginated<AdminUserRow>>('/admin/users', { params: clean(q) }),
  activity: (q: Query = {}) => api.get<Paginated<ActivityItem>>('/admin/activity', { params: clean(q) }),
  llm: () => api.get<{ model: string; rateLimits: RateLimitSnapshot | null }>('/admin/llm'),

  createUser: (data: { email: string; firstName: string; lastName?: string; password: string }) =>
    api.post<{ id: string; email: string; createdAt: string }>('/admin/users', data),

  suspend: (id: string, reason: string) => api.post(`/admin/tenants/${id}/suspend`, { reason }),
  reactivate: (id: string) => api.post(`/admin/tenants/${id}/reactivate`),
  extendTrial: (id: string, days: number) => api.post(`/admin/tenants/${id}/extend-trial`, { days }),
  setTokenLimit: (id: string, limit: number | null) =>
    api.patch(`/admin/tenants/${id}/token-limit`, { limit }),
};

/* ── Rótulos ──────────────────────────────────────────────────────────── */

export const TEMPLATE_LABELS: Record<string, string> = {
  radar_editais: 'Radar Editais',
  reception: 'Recepção',
  reception_scheduling: 'Recepção/Agenda',
  sdr: 'SDR',
  sdr_inbound: 'SDR Inbound',
  sdr_outbound: 'SDR Outbound',
  pre_qualifier: 'Pré-Qualificador',
  commercial: 'Comercial',
  commercial_consultant: 'Consultor Comercial',
  followup_commercial: 'Follow-up',
  customer_service: 'Atendimento',
  customer_success_cs: 'Customer Success',
  executive_assistant: 'Assistente Executivo',
  agenda_ai: 'Agenda AI',
  post_sale: 'Pós-venda',
  faq: 'FAQ',
  collection: 'Cobrança',
  custom: 'Personalizado',
};

export const templateLabel = (t: string | null | undefined): string =>
  t ? (TEMPLATE_LABELS[t] ?? t) : '—';

export const TENANT_STATUS: Record<string, { label: string; className: string }> = {
  trial: { label: 'Trial', className: 'bg-neural-blue/15 text-neural-blue' },
  active: { label: 'Ativo', className: 'bg-neural-success/15 text-neural-success' },
  suspended: { label: 'Suspenso', className: 'bg-neural-danger/15 text-neural-danger' },
  cancelled: { label: 'Cancelado', className: 'bg-muted text-muted-foreground' },
};

export const AGENT_STATUS: Record<string, string> = {
  draft: 'Rascunho',
  testing: 'Em teste',
  published: 'Publicado',
  paused: 'Pausado',
  archived: 'Arquivado',
};

export const ACTION_LABELS: Record<string, string> = {
  'auth.login.success': 'Login',
  'auth.login.failed': 'Falha de login',
  'auth.register': 'Cadastro',
  'auth.email_verified': 'E-mail verificado',
  'auth.password_reset_requested': 'Pediu reset de senha',
  'auth.password_reset': 'Redefiniu a senha',
  'auth.password_changed': 'Trocou a senha',
  'auth.mfa_enabled': 'Ativou MFA',
  'auth.mfa_disabled': 'Desativou MFA',
  'tenant.created': 'Organização criada',
  'agent.created': 'Agente criado',
  'agent.updated': 'Agente editado',
  'agent.published': 'Agente publicado',
  'agent.paused': 'Agente pausado',
  'agent.resumed': 'Agente retomado',
  'agent.deleted': 'Agente removido',
  'agent.rolled_back': 'Versão do agente revertida',
  'agent.tool_permission_updated': 'Permissões do agente alteradas',
  'knowledge_source.upload': 'Arquivo enviado à base',
  'knowledge_source.processed': 'Arquivo processado',
  'knowledge_source.delete': 'Arquivo removido da base',
  'knowledge_item.create': 'Ensinamento criado',
  'knowledge_item.update': 'Ensinamento editado',
  'knowledge_item.approve': 'Ensinamento aprovado',
  'knowledge_item.revoke_approval': 'Aprovação revogada',
  'knowledge_item.delete': 'Ensinamento removido',
  'whatsapp.account_connected': 'WhatsApp conectado',
  'whatsapp.account_disconnected': 'WhatsApp desconectado',
  'calendar.connect': 'Agenda conectada',
  'calendar.disconnect': 'Agenda desconectada',
  'campaign.create': 'Campanha criada',
  'campaign.launch': 'Campanha disparada',
  'privacy.data_export': 'Exportação de dados (LGPD)',
  'privacy.contact_anonymized': 'Contato anonimizado (LGPD)',
  'admin.tenant.suspended': 'Organização suspensa (admin)',
  'admin.tenant.reactivated': 'Organização reativada (admin)',
  'admin.tenant.trial_extended': 'Trial estendido (admin)',
  'admin.tenant.token_limit_set': 'Limite de tokens alterado (admin)',
  'admin.user.created': 'Usuário criado (admin)',
};

export const actionLabel = (a: string): string => ACTION_LABELS[a] ?? a;

/* ── Formatação ───────────────────────────────────────────────────────── */

export const fmtInt = (n: number | null | undefined): string =>
  n === null || n === undefined ? '—' : Math.round(n).toLocaleString('pt-BR');

/** 1234567 → "1,2 mi"; 12345 → "12,3 mil". */
export function fmtCompact(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
  if (Math.abs(n) >= 10_000) return `${(n / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`;
  return fmtInt(n);
}

export function fmtDate(v: string | null | undefined, withTime = false): string {
  if (!v) return '—';
  const d = new Date(v);
  return withTime
    ? d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
    : d.toLocaleDateString('pt-BR');
}

/** "há 5 min", "há 3 h", "há 2 d". */
export function fmtAgo(v: string | null | undefined): string {
  if (!v) return 'nunca';
  const s = Math.max(0, (Date.now() - new Date(v).getTime()) / 1000);
  if (s < 60) return 'agora';
  if (s < 3600) return `há ${Math.floor(s / 60)} min`;
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
  return `há ${Math.floor(s / 86400)} d`;
}

/** Mensagem de erro legível de uma resposta da API. */
export function apiErrorMessage(err: unknown): string {
  const data = (err as { response?: { data?: { message?: unknown } } })?.response?.data;
  const msg = data?.message;
  if (Array.isArray(msg)) return msg.join(', ');
  if (typeof msg === 'string') return msg;
  return 'Não foi possível concluir a operação.';
}
