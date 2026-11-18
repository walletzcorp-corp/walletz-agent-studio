import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { eq, and, isNull } from 'drizzle-orm';
import { ROLES_KEY, type MembershipRole } from './roles.decorator';
import { PermissionsService } from './permissions.service';
import { DRIZZLE_TOKEN, type DrizzleDB } from '../../database/database.module';
import { memberships } from '../../database/schema/users';
import { tenants } from '../../database/schema/tenants';
import type { JwtPayload } from '../../modules/auth/auth.service';
import { isFeatureEnabled, resolvePlan, type PlanFeatures } from '../plans/plan-catalog';
import { featureBlockedError, limitExceededError, PlanLimitsService, tenantBlockedError } from '../plans/plan-limits.service';
import { PLAN_EXEMPT_KEY, REQUIRED_FEATURE_KEY } from '../plans/requires-feature.decorator';

/**
 * Porta de entrada de toda rota de organização (`tenants/:tenantId/...`). Na ordem:
 *  1. vínculo ativo do usuário com o tenant (isolamento);
 *  2. organização suspensa/cancelada ou trial vencido → bloqueia;
 *  3. usuário acima do limite de usuários do plano (rebaixamento) → bloqueia;
 *  4. recurso exigido pela rota (@RequiresFeature) liberado no plano atual;
 *  5. papel mínimo (@Roles). Rota de organização sem @Roles é negada por padrão.
 */
@Injectable()
export class RbacGuard implements CanActivate {
  private readonly logger = new Logger(RbacGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly permissionsService: PermissionsService,
    private readonly planLimits: PlanLimitsService,
    @Inject(DRIZZLE_TOKEN) private readonly db: DrizzleDB,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    const requiredRoles = this.reflector.getAllAndOverride<MembershipRole[]>(ROLES_KEY, targets);
    const hasRequiredRoles = !!requiredRoles && requiredRoles.length > 0;
    const requiredFeature = this.reflector.getAllAndOverride<keyof PlanFeatures | undefined>(REQUIRED_FEATURE_KEY, targets);
    const planExempt = this.reflector.get<boolean | undefined>(PLAN_EXEMPT_KEY, context.getHandler()) === true;

    const request = context.switchToHttp().getRequest<{
      user?: JwtPayload;
      tenantId?: string;
      params?: Record<string, string>;
      method?: string;
      route?: { path?: string };
    }>();
    const paramTenantId = request.params?.['tenantId'];

    // Rota fora de organização e sem exigências = qualquer usuário autenticado.
    if (!hasRequiredRoles && !paramTenantId && !requiredFeature) {
      return true;
    }

    // Negação por padrão: toda rota de organização declara o papel mínimo.
    if (paramTenantId && !hasRequiredRoles) {
      this.logger.error(`Rota de organização sem @Roles: ${request.method ?? ''} ${request.route?.path ?? ''}`);
      throw new ForbiddenException({
        statusCode: 403,
        error: 'ROUTE_ROLE_NOT_DEFINED',
        message: 'Esta operação não está liberada. Fale com o suporte Walletz.',
      });
    }

    const user = request.user;
    if (!user) {
      throw new UnauthorizedException();
    }

    // O tenant da URL é o que o controller usa; o header x-tenant-slug não
    // pode substituí-lo (senão valida-se um tenant e acessa-se outro).
    if (paramTenantId && request.tenantId && request.tenantId !== paramTenantId) {
      throw new ForbiddenException('Tenant do cabeçalho difere do tenant da URL');
    }

    const tenantId = paramTenantId ?? request.tenantId ?? user.tenantId;
    if (!tenantId) {
      throw new ForbiddenException('Tenant context required');
    }

    const [membership] = await this.db
      .select({
        id: memberships.id,
        role: memberships.role,
        status: memberships.status,
        tenantStatus: tenants.status,
        trialEndsAt: tenants.trialEndsAt,
        planId: tenants.planId,
        featureFlags: tenants.featureFlags,
      })
      .from(memberships)
      .innerJoin(tenants, eq(tenants.id, memberships.tenantId))
      .where(and(eq(memberships.tenantId, tenantId), eq(memberships.userId, user.sub), isNull(tenants.deletedAt)))
      .limit(1);

    if (!membership || membership.status !== 'active') {
      throw new ForbiddenException('No active membership in this tenant');
    }

    // Suspensão/cancelamento pelo admin ou trial vencido bloqueiam o uso
    // (os dados são mantidos; reativar ou ativar o plano libera de novo).
    const tenantError = tenantBlockedError(membership.tenantStatus, membership.trialEndsAt);
    if (tenantError) throw tenantError;

    const plan = resolvePlan(membership.planId);

    // Depois de um rebaixamento, os usuários mais novos acima do limite ficam sem acesso
    // (o dono nunca). Nada é apagado: ampliar o plano ou remover usuários libera de novo.
    if (!(await this.planLimits.isWithinPlan(tenantId, 'users', membership.id))) {
      throw limitExceededError(plan, 'users');
    }

    if (requiredFeature && !planExempt) {
      const overrides =
        membership.featureFlags && typeof membership.featureFlags === 'object'
          ? (membership.featureFlags as Record<string, unknown>)
          : {};
      if (!isFeatureEnabled(plan, overrides, requiredFeature)) {
        throw featureBlockedError(plan, requiredFeature);
      }
    }

    if (
      hasRequiredRoles &&
      !this.permissionsService.hasRole(membership.role as MembershipRole, requiredRoles)
    ) {
      throw new ForbiddenException('Insufficient role');
    }

    return true;
  }
}

