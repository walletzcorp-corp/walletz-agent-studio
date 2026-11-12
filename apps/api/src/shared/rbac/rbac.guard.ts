import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { eq, and } from 'drizzle-orm';
import { ROLES_KEY, type MembershipRole } from './roles.decorator';
import { PermissionsService } from './permissions.service';
import { DRIZZLE_TOKEN, type DrizzleDB } from '../../database/database.module';
import { memberships } from '../../database/schema/users';
import { tenants } from '../../database/schema/tenants';
import type { JwtPayload } from '../../modules/auth/auth.service';

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionsService: PermissionsService,
    @Inject(DRIZZLE_TOKEN) private readonly db: DrizzleDB,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<MembershipRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const hasRequiredRoles = !!requiredRoles && requiredRoles.length > 0;

    const request = context.switchToHttp().getRequest<{
      user?: JwtPayload;
      tenantId?: string;
      params?: Record<string, string>;
    }>();
    const paramTenantId = request.params?.['tenantId'];

    // Sem @Roles e sem :tenantId na rota = qualquer usuário autenticado.
    // Com :tenantId, o vínculo com o tenant é SEMPRE exigido (isolamento),
    // mesmo sem @Roles.
    if (!hasRequiredRoles && !paramTenantId) {
      return true;
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
        role: memberships.role,
        status: memberships.status,
        tenantStatus: tenants.status,
      })
      .from(memberships)
      .innerJoin(tenants, eq(tenants.id, memberships.tenantId))
      .where(and(eq(memberships.tenantId, tenantId), eq(memberships.userId, user.sub)))
      .limit(1);

    if (!membership || membership.status !== 'active') {
      throw new ForbiddenException('No active membership in this tenant');
    }

    // Suspensão/cancelamento feitos pelo admin da plataforma bloqueiam o uso
    // (os dados são mantidos; reativar libera de novo).
    if (membership.tenantStatus === 'suspended' || membership.tenantStatus === 'cancelled') {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'TENANT_SUSPENDED',
        message: 'Esta organização está suspensa. Entre em contato com o suporte Walletz.',
      });
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
