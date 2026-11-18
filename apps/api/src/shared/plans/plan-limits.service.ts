import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, count, desc, eq, isNull, ne, sql } from 'drizzle-orm';
import { DRIZZLE_TOKEN, type DrizzleDB } from '../../database/database.module';
import { tenants } from '../../database/schema/tenants';
import { agents } from '../../database/schema/agents';
import { memberships } from '../../database/schema/users';
import { whatsappAccounts } from '../../database/schema/whatsapp';
import { calendarConnections } from '../../database/schema/calendars';
import { aiProviderConnections } from '../../database/schema/ai-providers';
import { outboundWebhooks, webchatWidgets } from '../../database/schema/channels';
import {
  isFeatureEnabled,
  RESOURCE_LABELS,
  RESOURCE_LABELS_SINGULAR,
  resolvePlan,
  type PlanDefinition,
  type PlanFeatures,
  type PlanResource,
} from './plan-catalog';

export type PlanUsage = Record<PlanResource, number>;

/** Conexão do banco ou transação em andamento. */
export type DbExecutor = DrizzleDB | Parameters<Parameters<DrizzleDB['transaction']>[0]>[0];

/** O que uma operação precisa para rodar fora do guard HTTP (webhooks, fila, webchat público). */
export interface UsageRequirement {
  feature?: keyof PlanFeatures;
  /** Item específico que precisa estar dentro do limite do plano. */
  item?: { resource: PlanResource; id: string };
}

export interface TenantPlanSummary {
  plan: PlanDefinition;
  usage: PlanUsage;
  /** Recursos liberados para este tenant (plano + exceções do admin em feature_flags). */
  enabledFeatures: Record<keyof PlanFeatures, boolean>;
}

export const FEATURE_LABELS: Record<keyof PlanFeatures, string> = {
  webchat: 'Webchat',
  whatsapp: 'WhatsApp oficial',
  calendars: 'Agendas',
  emailNotifications: 'Notificações por e-mail',
  emailInbox: 'Caixa de e-mail corporativa',
  outboundWebhooks: 'Webhooks de saída',
  publicApi: 'API pública',
  crmConnectors: 'Conectores de CRM/Trello',
  whiteLabel: 'White Label',
  campaigns: 'Campanhas em massa',
  pcConnector: 'Conector de computador (PC Connector)',
};

const label = (resource: PlanResource, n: number) =>
  n === 1 ? RESOURCE_LABELS_SINGULAR[resource] : RESOURCE_LABELS[resource];

/** Trial com data de fim já passada (sem data = sem prazo). */
export function isTrialExpired(status: string, trialEndsAt: Date | null, now = new Date()): boolean {
  return status === 'trial' && !!trialEndsAt && trialEndsAt.getTime() <= now.getTime();
}

/** 403 para organização suspensa, cancelada ou com trial vencido; null se pode operar. */
export function tenantBlockedError(status: string, trialEndsAt: Date | null): ForbiddenException | null {
  if (status === 'suspended' || status === 'cancelled') {
    return new ForbiddenException({
      statusCode: 403,
      error: 'TENANT_SUSPENDED',
      message: 'Esta organização está suspensa. Entre em contato com o suporte Walletz.',
    });
  }
  if (isTrialExpired(status, trialEndsAt)) {
    return new ForbiddenException({
      statusCode: 403,
      error: 'TRIAL_EXPIRED',
      message: 'O período de teste desta organização terminou. Fale com a Walletz para ativar o plano.',
    });
  }
  return null;
}

/** 403 ao criar além do limite do plano. */
export function limitReachedError(plan: PlanDefinition, resource: PlanResource, used: number): ForbiddenException {
  const limit = plan.limits[resource];
  return new ForbiddenException({
    statusCode: 403,
    error: 'PLAN_LIMIT_REACHED',
    resource,
    limit,
    used,
    plan: plan.slug,
    message:
      limit === 0
        ? `O plano ${plan.name} não inclui ${RESOURCE_LABELS[resource]}. Fale com a Walletz para mudar de plano.`
        : `O plano ${plan.name} permite até ${limit} ${label(resource, limit)} (em uso: ${used}). Fale com a Walletz para ampliar.`,
  });
}

/** 403 ao usar um item que ficou acima do limite (os mais novos, depois de rebaixar o plano). */
export function limitExceededError(plan: PlanDefinition, resource: PlanResource): ForbiddenException {
  const limit = plan.limits[resource];
  return new ForbiddenException({
    statusCode: 403,
    error: 'PLAN_LIMIT_EXCEEDED',
    resource,
    limit,
    plan: plan.slug,
    message:
      limit === 0
        ? `O plano ${plan.name} não inclui ${RESOURCE_LABELS[resource]}. Fale com a Walletz para mudar de plano.`
        : `Este item passa do limite do plano ${plan.name} (até ${limit} ${label(resource, limit)}) e está bloqueado. Exclua itens mais antigos ou fale com a Walletz para ampliar o plano.`,
  });
}

/** 403 ao usar um recurso fora do plano (ou ainda em desenvolvimento). */
export function featureBlockedError(plan: PlanDefinition, feature: keyof PlanFeatures): ForbiddenException {
  const status = plan.features[feature];
  return new ForbiddenException({
    statusCode: 403,
    error: status === 'in_development' ? 'FEATURE_IN_DEVELOPMENT' : 'FEATURE_NOT_IN_PLAN',
    feature,
    plan: plan.slug,
    message:
      status === 'in_development'
        ? `${FEATURE_LABELS[feature]} ainda está em desenvolvimento e não pode ser usado.`
        : `${FEATURE_LABELS[feature]} não está incluído no plano ${plan.name}. Fale com a Walletz para mudar de plano.`,
  });
}

/**
 * Aplica no servidor os limites e recursos do plano comercial (v4.2).
 * Exceções "sob medida" são liberadas pelo admin da plataforma em
 * `tenants.feature_flags` (ex.: { "campaigns": true }).
 */
@Injectable()
export class PlanLimitsService {
  constructor(@Inject(DRIZZLE_TOKEN) private readonly db: DrizzleDB) {}

  async getTenantPlan(tenantId: string): Promise<{
    plan: PlanDefinition;
    overrides: Record<string, unknown>;
    status: string;
    trialEndsAt: Date | null;
  }> {
    const [tenant] = await this.db
      .select({
        planId: tenants.planId,
        featureFlags: tenants.featureFlags,
        status: tenants.status,
        trialEndsAt: tenants.trialEndsAt,
      })
      .from(tenants)
      .where(and(eq(tenants.id, tenantId), isNull(tenants.deletedAt)))
      .limit(1);
    if (!tenant) throw new NotFoundException('Organização não encontrada');
    const overrides =
      tenant.featureFlags && typeof tenant.featureFlags === 'object'
        ? (tenant.featureFlags as Record<string, unknown>)
        : {};
    return { plan: resolvePlan(tenant.planId), overrides, status: tenant.status, trialEndsAt: tenant.trialEndsAt };
  }

  /** Quantidade em uso de um recurso limitado pelo plano. */
  async countUsage(tenantId: string, resource: PlanResource, db: DbExecutor = this.db): Promise<number> {
    const one = async (query: Promise<Array<{ value: number }>>) => Number((await query)[0]?.value ?? 0);
    switch (resource) {
      case 'agents':
        return one(
          db
            .select({ value: count() })
            .from(agents)
            .where(and(eq(agents.tenantId, tenantId), isNull(agents.deletedAt), ne(agents.status, 'archived'))),
        );
      case 'users':
        return one(
          db
            .select({ value: count() })
            .from(memberships)
            .where(and(eq(memberships.tenantId, tenantId), ne(memberships.status, 'suspended'))),
        );
      case 'aiConnections':
        return one(
          db
            .select({ value: count() })
            .from(aiProviderConnections)
            .where(and(eq(aiProviderConnections.tenantId, tenantId), isNull(aiProviderConnections.deletedAt))),
        );
      case 'whatsappNumbers':
        return one(
          db
            .select({ value: count() })
            .from(whatsappAccounts)
            .where(and(eq(whatsappAccounts.tenantId, tenantId), isNull(whatsappAccounts.deletedAt))),
        );
      case 'calendars':
        return one(
          db
            .select({ value: count() })
            .from(calendarConnections)
            .where(and(eq(calendarConnections.tenantId, tenantId), isNull(calendarConnections.deletedAt))),
        );
      case 'webchatWidgets':
        return one(
          db
            .select({ value: count() })
            .from(webchatWidgets)
            .where(and(eq(webchatWidgets.tenantId, tenantId), isNull(webchatWidgets.deletedAt))),
        );
      case 'outboundWebhooks':
        return one(
          db
            .select({ value: count() })
            .from(outboundWebhooks)
            .where(and(eq(outboundWebhooks.tenantId, tenantId), isNull(outboundWebhooks.deletedAt))),
        );
      case 'subaccounts':
        return 0;
    }
  }

  /**
   * Bloqueia a criação de mais um item do recurso quando o limite do plano foi atingido.
   * `adding` permite checar inclusões em lote.
   */
  async assertCanAdd(tenantId: string, resource: PlanResource, adding = 1): Promise<void> {
    const { plan } = await this.getTenantPlan(tenantId);
    const used = await this.countUsage(tenantId, resource);
    if (used + adding > plan.limits[resource]) throw limitReachedError(plan, resource, used);
  }

  isFeatureEnabled(plan: PlanDefinition, overrides: Record<string, unknown>, feature: keyof PlanFeatures): boolean {
    return isFeatureEnabled(plan, overrides, feature);
  }

  /** O recurso está liberado para o tenant agora (plano atual + exceções)? */
  async hasFeature(tenantId: string, feature: keyof PlanFeatures): Promise<boolean> {
    const { plan, overrides } = await this.getTenantPlan(tenantId);
    return isFeatureEnabled(plan, overrides, feature);
  }

  /** Bloqueia o uso de um recurso que o plano não inclui (ou ainda não está homologado). */
  async assertFeature(tenantId: string, feature: keyof PlanFeatures): Promise<void> {
    const { plan, overrides } = await this.getTenantPlan(tenantId);
    if (isFeatureEnabled(plan, overrides, feature)) return;
    throw featureBlockedError(plan, feature);
  }

  /**
   * Reserva uma vaga do recurso e executa a criação na mesma transação.
   * Uma trava por (tenant, recurso) impede que duas requisições simultâneas
   * passem do limite: a segunda espera a primeira terminar e conta de novo.
   */
  async withSlot<T>(
    tenantId: string,
    resource: PlanResource,
    create: (tx: DbExecutor) => Promise<T>,
    adding = 1,
  ): Promise<T> {
    return this.db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`plan:${tenantId}:${resource}`}))`);
      const { plan } = await this.getTenantPlan(tenantId);
      const used = await this.countUsage(tenantId, resource, tx);
      if (used + adding > plan.limits[resource]) throw limitReachedError(plan, resource, used);
      return create(tx);
    });
  }

  /**
   * IDs dos itens que o plano atual cobre, do mais antigo para o mais novo.
   * Depois de um rebaixamento, os excedentes (os mais novos) ficam bloqueados
   * no uso — nada é apagado; voltar de plano ou excluir itens libera de novo.
   */
  async allowedIds(tenantId: string, resource: PlanResource): Promise<Set<string>> {
    const { plan } = await this.getTenantPlan(tenantId);
    const limit = plan.limits[resource];
    if (limit <= 0) return new Set();
    const ids = async (q: Promise<Array<{ id: string }>>) => new Set((await q).map((r) => r.id));
    switch (resource) {
      case 'agents':
        return ids(
          this.db
            .select({ id: agents.id })
            .from(agents)
            .where(and(eq(agents.tenantId, tenantId), isNull(agents.deletedAt), ne(agents.status, 'archived')))
            .orderBy(asc(agents.createdAt), asc(agents.id))
            .limit(limit),
        );
      case 'users':
        // O dono da organização nunca perde o acesso.
        return ids(
          this.db
            .select({ id: memberships.id })
            .from(memberships)
            .where(and(eq(memberships.tenantId, tenantId), ne(memberships.status, 'suspended')))
            .orderBy(desc(sql`(${memberships.role} = 'owner')`), asc(memberships.createdAt), asc(memberships.id))
            .limit(limit),
        );
      case 'aiConnections':
        return ids(
          this.db
            .select({ id: aiProviderConnections.id })
            .from(aiProviderConnections)
            .where(and(eq(aiProviderConnections.tenantId, tenantId), isNull(aiProviderConnections.deletedAt)))
            .orderBy(asc(aiProviderConnections.createdAt), asc(aiProviderConnections.id))
            .limit(limit),
        );
      case 'whatsappNumbers':
        return ids(
          this.db
            .select({ id: whatsappAccounts.id })
            .from(whatsappAccounts)
            .where(and(eq(whatsappAccounts.tenantId, tenantId), isNull(whatsappAccounts.deletedAt)))
            .orderBy(asc(whatsappAccounts.createdAt), asc(whatsappAccounts.id))
            .limit(limit),
        );
      case 'calendars':
        return ids(
          this.db
            .select({ id: calendarConnections.id })
            .from(calendarConnections)
            .where(and(eq(calendarConnections.tenantId, tenantId), isNull(calendarConnections.deletedAt)))
            .orderBy(asc(calendarConnections.createdAt), asc(calendarConnections.id))
            .limit(limit),
        );
      case 'webchatWidgets':
        return ids(
          this.db
            .select({ id: webchatWidgets.id })
            .from(webchatWidgets)
            .where(and(eq(webchatWidgets.tenantId, tenantId), isNull(webchatWidgets.deletedAt)))
            .orderBy(asc(webchatWidgets.createdAt), asc(webchatWidgets.id))
            .limit(limit),
        );
      case 'outboundWebhooks':
        return ids(
          this.db
            .select({ id: outboundWebhooks.id })
            .from(outboundWebhooks)
            .where(and(eq(outboundWebhooks.tenantId, tenantId), isNull(outboundWebhooks.deletedAt)))
            .orderBy(asc(outboundWebhooks.createdAt), asc(outboundWebhooks.id))
            .limit(limit),
        );
      case 'subaccounts':
        return new Set();
    }
  }

  /**
   * Motivo para bloquear uma operação agora, ou null se ela pode rodar. É a mesma regra
   * do RbacGuard, para os caminhos sem requisição autenticada: organização suspensa ou
   * com trial vencido, recurso fora do plano e item acima do limite (os mais novos).
   */
  async usageBlock(tenantId: string, req: UsageRequirement = {}): Promise<ForbiddenException | null> {
    const { plan, overrides, status, trialEndsAt } = await this.getTenantPlan(tenantId);
    const tenantError = tenantBlockedError(status, trialEndsAt);
    if (tenantError) return tenantError;
    if (req.feature && !isFeatureEnabled(plan, overrides, req.feature)) return featureBlockedError(plan, req.feature);
    if (req.item && !(await this.isWithinPlan(tenantId, req.item.resource, req.item.id))) {
      return limitExceededError(plan, req.item.resource);
    }
    return null;
  }

  async assertUsable(tenantId: string, req: UsageRequirement = {}): Promise<void> {
    const blocked = await this.usageBlock(tenantId, req);
    if (blocked) throw blocked;
  }

  async isUsable(tenantId: string, req: UsageRequirement = {}): Promise<boolean> {
    return (await this.usageBlock(tenantId, req)) === null;
  }

  async isWithinPlan(tenantId: string, resource: PlanResource, id: string): Promise<boolean> {
    return (await this.allowedIds(tenantId, resource)).has(id);
  }

  /** Bloqueia o uso de um item que ficou acima do limite (ex.: depois de rebaixar o plano). */
  async assertWithinPlan(tenantId: string, resource: PlanResource, id: string): Promise<void> {
    if (await this.isWithinPlan(tenantId, resource, id)) return;
    const { plan } = await this.getTenantPlan(tenantId);
    throw limitExceededError(plan, resource);
  }

  async getSummary(tenantId: string): Promise<TenantPlanSummary> {
    const { plan, overrides } = await this.getTenantPlan(tenantId);
    const resources = Object.keys(plan.limits) as PlanResource[];
    const counts = await Promise.all(resources.map((r) => this.countUsage(tenantId, r)));
    const usage = Object.fromEntries(resources.map((r, i) => [r, counts[i] ?? 0])) as PlanUsage;
    const features = Object.keys(plan.features) as Array<keyof PlanFeatures>;
    const enabledFeatures = Object.fromEntries(
      features.map((f) => [f, isFeatureEnabled(plan, overrides, f)]),
    ) as Record<keyof PlanFeatures, boolean>;
    return { plan, usage, enabledFeatures };
  }
}
