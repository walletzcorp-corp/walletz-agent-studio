import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, count, eq, isNull, ne } from 'drizzle-orm';
import { DRIZZLE_TOKEN, type DrizzleDB } from '../../database/database.module';
import { tenants } from '../../database/schema/tenants';
import { agents } from '../../database/schema/agents';
import { memberships } from '../../database/schema/users';
import { whatsappAccounts } from '../../database/schema/whatsapp';
import { calendarConnections } from '../../database/schema/calendars';
import { aiProviderConnections } from '../../database/schema/ai-providers';
import { outboundWebhooks, webchatWidgets } from '../../database/schema/channels';
import {
  RESOURCE_LABELS,
  RESOURCE_LABELS_SINGULAR,
  resolvePlan,
  type PlanDefinition,
  type PlanFeatures,
  type PlanResource,
} from './plan-catalog';

export type PlanUsage = Record<PlanResource, number>;

export interface TenantPlanSummary {
  plan: PlanDefinition;
  usage: PlanUsage;
  /** Recursos liberados para este tenant (plano + exceções do admin em feature_flags). */
  enabledFeatures: Record<keyof PlanFeatures, boolean>;
}

const FEATURE_LABELS: Record<keyof PlanFeatures, string> = {
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
};

/**
 * Aplica no servidor os limites e recursos do plano comercial (v4.2).
 * Exceções "sob medida" são liberadas pelo admin da plataforma em
 * `tenants.feature_flags` (ex.: { "campaigns": true }).
 */
@Injectable()
export class PlanLimitsService {
  constructor(@Inject(DRIZZLE_TOKEN) private readonly db: DrizzleDB) {}

  async getTenantPlan(tenantId: string): Promise<{ plan: PlanDefinition; overrides: Record<string, unknown> }> {
    const [tenant] = await this.db
      .select({ planId: tenants.planId, featureFlags: tenants.featureFlags })
      .from(tenants)
      .where(and(eq(tenants.id, tenantId), isNull(tenants.deletedAt)))
      .limit(1);
    if (!tenant) throw new NotFoundException('Organização não encontrada');
    const overrides =
      tenant.featureFlags && typeof tenant.featureFlags === 'object'
        ? (tenant.featureFlags as Record<string, unknown>)
        : {};
    return { plan: resolvePlan(tenant.planId), overrides };
  }

  /** Quantidade em uso de um recurso limitado pelo plano. */
  async countUsage(tenantId: string, resource: PlanResource): Promise<number> {
    const one = async (query: Promise<Array<{ value: number }>>) => Number((await query)[0]?.value ?? 0);
    switch (resource) {
      case 'agents':
        return one(
          this.db
            .select({ value: count() })
            .from(agents)
            .where(and(eq(agents.tenantId, tenantId), isNull(agents.deletedAt), ne(agents.status, 'archived'))),
        );
      case 'users':
        return one(
          this.db
            .select({ value: count() })
            .from(memberships)
            .where(and(eq(memberships.tenantId, tenantId), ne(memberships.status, 'suspended'))),
        );
      case 'aiConnections':
        return one(
          this.db
            .select({ value: count() })
            .from(aiProviderConnections)
            .where(and(eq(aiProviderConnections.tenantId, tenantId), isNull(aiProviderConnections.deletedAt))),
        );
      case 'whatsappNumbers':
        return one(
          this.db
            .select({ value: count() })
            .from(whatsappAccounts)
            .where(and(eq(whatsappAccounts.tenantId, tenantId), isNull(whatsappAccounts.deletedAt))),
        );
      case 'calendars':
        return one(
          this.db
            .select({ value: count() })
            .from(calendarConnections)
            .where(and(eq(calendarConnections.tenantId, tenantId), isNull(calendarConnections.deletedAt))),
        );
      case 'webchatWidgets':
        return one(
          this.db
            .select({ value: count() })
            .from(webchatWidgets)
            .where(and(eq(webchatWidgets.tenantId, tenantId), isNull(webchatWidgets.deletedAt))),
        );
      case 'outboundWebhooks':
        return one(
          this.db
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
    const limit = plan.limits[resource];
    const used = await this.countUsage(tenantId, resource);
    if (used + adding > limit) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'PLAN_LIMIT_REACHED',
        resource,
        limit,
        used,
        plan: plan.slug,
        message:
          limit === 0
            ? `O plano ${plan.name} não inclui ${RESOURCE_LABELS[resource]}. Fale com a Walletz para mudar de plano.`
            : `O plano ${plan.name} permite até ${limit} ${limit === 1 ? RESOURCE_LABELS_SINGULAR[resource] : RESOURCE_LABELS[resource]} (em uso: ${used}). Fale com a Walletz para ampliar.`,
      });
    }
  }

  isFeatureEnabled(plan: PlanDefinition, overrides: Record<string, unknown>, feature: keyof PlanFeatures): boolean {
    if (overrides[feature] === true) return true;
    if (overrides[feature] === false) return false;
    return plan.features[feature] === 'available';
  }

  /** Bloqueia o uso de um recurso que o plano não inclui (ou ainda não está homologado). */
  async assertFeature(tenantId: string, feature: keyof PlanFeatures): Promise<void> {
    const { plan, overrides } = await this.getTenantPlan(tenantId);
    if (this.isFeatureEnabled(plan, overrides, feature)) return;
    const status = plan.features[feature];
    throw new ForbiddenException({
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

  async getSummary(tenantId: string): Promise<TenantPlanSummary> {
    const { plan, overrides } = await this.getTenantPlan(tenantId);
    const resources = Object.keys(plan.limits) as PlanResource[];
    const counts = await Promise.all(resources.map((r) => this.countUsage(tenantId, r)));
    const usage = Object.fromEntries(resources.map((r, i) => [r, counts[i] ?? 0])) as PlanUsage;
    const features = Object.keys(plan.features) as Array<keyof PlanFeatures>;
    const enabledFeatures = Object.fromEntries(
      features.map((f) => [f, this.isFeatureEnabled(plan, overrides, f)]),
    ) as Record<keyof PlanFeatures, boolean>;
    return { plan, usage, enabledFeatures };
  }
}
