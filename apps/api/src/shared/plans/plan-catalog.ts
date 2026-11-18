/**
 * Catálogo comercial Walletz Studio IA — Proposta Comercial v4.2 (16/11/2026).
 *
 * Regra central: nenhum plano inclui créditos, tokens ou consumo de IA. O cliente
 * conecta a própria chave (BYOK) e paga o provedor diretamente.
 *
 * Os limites aqui são aplicados no servidor (PlanLimitsService). A tabela `plans`
 * do banco é semeada a partir deste catálogo pela migration 0006; o código é a
 * fonte de verdade para limites e recursos.
 */

export const PLAN_SLUGS = ['starter', 'pro', 'business', 'agency'] as const;
export type PlanSlug = (typeof PLAN_SLUGS)[number];

export const DEFAULT_PLAN: PlanSlug = 'starter';

export interface PlanLimits {
  /** Agentes ativos (não arquivados). */
  agents: number;
  /** Usuários com vínculo ativo na organização. */
  users: number;
  /** Conexões com provedores de IA (chaves do próprio cliente). */
  aiConnections: number;
  /** Números de WhatsApp oficiais. */
  whatsappNumbers: number;
  /** Agendas Google/Microsoft conectadas. */
  calendars: number;
  /** Widgets de webchat publicados. */
  webchatWidgets: number;
  /** Webhooks de saída. */
  outboundWebhooks: number;
  /** Subcontas empresariais (Agency). 0 = não se aplica. */
  subaccounts: number;
}

/**
 * Situação de cada recurso no produto, conforme a matriz de comercialização
 * (seção 13): só "available" pode ser anunciado como incluído.
 */
export type FeatureAvailability = 'available' | 'in_development' | 'not_included';

export interface PlanFeatures {
  webchat: FeatureAvailability;
  whatsapp: FeatureAvailability;
  calendars: FeatureAvailability;
  emailNotifications: FeatureAvailability;
  emailInbox: FeatureAvailability;
  outboundWebhooks: FeatureAvailability;
  publicApi: FeatureAvailability;
  crmConnectors: FeatureAvailability;
  whiteLabel: FeatureAvailability;
  campaigns: FeatureAvailability;
  /** Conector de computador local (PC Connector). Fora da proposta v4.2: bloqueado até homologar. */
  pcConnector: FeatureAvailability;
}

export type SupportTier = 'basico' | 'prioritario' | 'empresarial' | 'parceiro';

export interface PlanDefinition {
  slug: PlanSlug;
  name: string;
  description: string;
  /** Mensalidade em centavos de BRL. */
  priceMonthlyCents: number;
  /** Implantação parcelada 50/50, em centavos. */
  setupFeeCents: number;
  /** Implantação à vista, em centavos. */
  setupFeeCashCents: number;
  limits: PlanLimits;
  features: PlanFeatures;
  support: SupportTier;
  /** Primeira resposta humana (horas úteis) por severidade — metas sugeridas, não SLA. */
  supportTargetsHours: { p1: number; p2: number; p3: number };
}

export const PLAN_CATALOG: Record<PlanSlug, PlanDefinition> = {
  starter: {
    slug: 'starter',
    name: 'Starter',
    description: 'Um profissional ou pequeno negócio: 1 agente publicado no site via webchat.',
    priceMonthlyCents: 9_900,
    setupFeeCents: 250_000,
    setupFeeCashCents: 200_000,
    limits: {
      agents: 1,
      users: 1,
      aiConnections: 1,
      whatsappNumbers: 0,
      calendars: 0,
      webchatWidgets: 1,
      outboundWebhooks: 0,
      subaccounts: 0,
    },
    features: {
      webchat: 'available',
      whatsapp: 'not_included',
      calendars: 'not_included',
      emailNotifications: 'not_included',
      emailInbox: 'not_included',
      outboundWebhooks: 'not_included',
      publicApi: 'not_included',
      crmConnectors: 'not_included',
      whiteLabel: 'not_included',
      campaigns: 'not_included',
      pcConnector: 'in_development',
    },
    support: 'basico',
    supportTargetsHours: { p1: 8, p2: 24, p3: 48 },
  },
  pro: {
    slug: 'pro',
    name: 'Pro',
    description: 'Atendimento, pré-vendas e agendamentos com até 3 agentes, WhatsApp e agenda.',
    priceMonthlyCents: 39_900,
    setupFeeCents: 600_000,
    setupFeeCashCents: 500_000,
    limits: {
      agents: 3,
      users: 5,
      aiConnections: 2,
      whatsappNumbers: 1,
      calendars: 1,
      webchatWidgets: 3,
      outboundWebhooks: 1,
      subaccounts: 0,
    },
    features: {
      webchat: 'available',
      whatsapp: 'available',
      calendars: 'available',
      emailNotifications: 'in_development',
      emailInbox: 'not_included',
      outboundWebhooks: 'available',
      publicApi: 'not_included',
      crmConnectors: 'not_included',
      whiteLabel: 'not_included',
      campaigns: 'not_included',
      pcConnector: 'in_development',
    },
    support: 'prioritario',
    supportTargetsHours: { p1: 4, p2: 16, p3: 16 },
  },
  business: {
    slug: 'business',
    name: 'Business',
    description: 'Múltiplos departamentos e agentes, integrações corporativas e governança.',
    priceMonthlyCents: 89_900,
    setupFeeCents: 800_000,
    setupFeeCashCents: 700_000,
    limits: {
      agents: 8,
      users: 15,
      aiConnections: 3,
      whatsappNumbers: 2,
      calendars: 3,
      webchatWidgets: 8,
      outboundWebhooks: 5,
      subaccounts: 0,
    },
    features: {
      webchat: 'available',
      whatsapp: 'available',
      calendars: 'available',
      emailNotifications: 'in_development',
      emailInbox: 'in_development',
      outboundWebhooks: 'available',
      publicApi: 'in_development',
      crmConnectors: 'in_development',
      whiteLabel: 'not_included',
      campaigns: 'not_included',
      pcConnector: 'in_development',
    },
    support: 'empresarial',
    supportTargetsHours: { p1: 2, p2: 8, p3: 8 },
  },
  agency: {
    slug: 'agency',
    name: 'Agency / White Label',
    description: 'Agências que administram agentes em contas independentes dos clientes.',
    priceMonthlyCents: 199_000,
    setupFeeCents: 1_200_000,
    setupFeeCashCents: 1_000_000,
    limits: {
      agents: 10,
      users: 25,
      // "Até 2 por subconta": enquanto subcontas não existem, vale para a conta principal.
      aiConnections: 2,
      whatsappNumbers: 5,
      calendars: 5,
      webchatWidgets: 10,
      outboundWebhooks: 5,
      subaccounts: 5,
    },
    features: {
      webchat: 'available',
      whatsapp: 'available',
      calendars: 'available',
      emailNotifications: 'in_development',
      emailInbox: 'in_development',
      outboundWebhooks: 'available',
      publicApi: 'in_development',
      crmConnectors: 'in_development',
      // Oferta condicionada (seção 06): só após validar isolamento, permissões e faturamento por subconta.
      whiteLabel: 'in_development',
      campaigns: 'not_included',
      pcConnector: 'in_development',
    },
    support: 'parceiro',
    supportTargetsHours: { p1: 1, p2: 4, p3: 4 },
  },
};

export function isPlanSlug(value: unknown): value is PlanSlug {
  return typeof value === 'string' && (PLAN_SLUGS as readonly string[]).includes(value);
}

/** Plano efetivo de um tenant: valores ausentes ou legados caem no Starter. */
export function resolvePlan(planId: string | null | undefined): PlanDefinition {
  return PLAN_CATALOG[isPlanSlug(planId) ? planId : DEFAULT_PLAN];
}

/**
 * Recurso liberado? Exceção do admin em `tenants.feature_flags` vence o plano
 * (true libera sob medida, false bloqueia); sem exceção, só "available" libera.
 */
export function isFeatureEnabled(
  plan: PlanDefinition,
  overrides: Record<string, unknown>,
  feature: keyof PlanFeatures,
): boolean {
  if (overrides[feature] === true) return true;
  if (overrides[feature] === false) return false;
  return plan.features[feature] === 'available';
}

export type PlanResource = keyof PlanLimits;

export const RESOURCE_LABELS_SINGULAR: Record<PlanResource, string> = {
  agents: 'agente',
  users: 'usuário',
  aiConnections: 'conexão com provedor de IA',
  whatsappNumbers: 'número de WhatsApp',
  calendars: 'agenda',
  webchatWidgets: 'widget de webchat',
  outboundWebhooks: 'webhook de saída',
  subaccounts: 'subconta',
};

export const RESOURCE_LABELS: Record<PlanResource, string> = {
  agents: 'agentes',
  users: 'usuários',
  aiConnections: 'conexões com provedores de IA',
  whatsappNumbers: 'números de WhatsApp',
  calendars: 'agendas',
  webchatWidgets: 'widgets de webchat',
  outboundWebhooks: 'webhooks de saída',
  subaccounts: 'subcontas',
};
