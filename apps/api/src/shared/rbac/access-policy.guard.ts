import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  type Type,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { and, eq } from 'drizzle-orm';
import type { Request } from 'express';
import { DRIZZLE_TOKEN, type DrizzleDB } from '../../database/database.module';
import { memberships } from '../../database/schema/users';
import { tenants } from '../../database/schema/tenants';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../../modules/auth/auth.service';
import { AuditService } from '../audit/audit.service';
import { AUTHENTICATED_ROUTE_KEY, PUBLIC_ROUTE_KEY } from './access-policy.decorators';
import { PermissionsService } from './permissions.service';
import { ROLES_KEY, type MembershipRole } from './roles.decorator';
import type { TenantContext } from './tenant-context';

type PolicyRequest = Request & { user?: JwtPayload; tenantContext?: TenantContext };

export type RouteAccess =
  | { kind: 'public' }
  | { kind: 'authenticated' }
  | { kind: 'tenant'; roles: MembershipRole[] }
  | { kind: 'unclassified' };

/** Single definition of a route's classification, shared by the guard and the CI route audit. */
export function readRouteAccess(
  reflector: Reflector,
  targets: Array<ReturnType<ExecutionContext['getHandler']> | Type<unknown>>,
): RouteAccess {
  if (reflector.getAllAndOverride<string | undefined>(PUBLIC_ROUTE_KEY, targets)) {
    return { kind: 'public' };
  }
  const roles = reflector.getAllAndOverride<MembershipRole[] | undefined>(ROLES_KEY, targets);
  if (roles && roles.length > 0) return { kind: 'tenant', roles };
  if (reflector.getAllAndOverride<boolean | undefined>(AUTHENTICATED_ROUTE_KEY, targets)) {
    return { kind: 'authenticated' };
  }
  return { kind: 'unclassified' };
}

function firstString(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
}

/**
 * Global, deny-by-default access policy.
 *
 *   PUBLIC            -> allowed without a session (route documents why)
 *   AUTHENTICATED     -> valid session required
 *   TENANT + ROLES    -> valid session + active membership in the tenant named by the URL
 *                        + sufficient role; all other tenant identifiers must agree
 *   (nothing)         -> 403: an unclassified route is never reachable
 */
@Injectable()
export class AccessPolicyGuard implements CanActivate {
  private readonly logger = new Logger(AccessPolicyGuard.name);
  private readonly jwtGuard = new JwtAuthGuard();

  constructor(
    private readonly reflector: Reflector,
    private readonly permissions: PermissionsService,
    private readonly audit: AuditService,
    @Inject(DRIZZLE_TOKEN) private readonly db: DrizzleDB,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return false;

    const access = readRouteAccess(this.reflector, [context.getHandler(), context.getClass()]);
    if (access.kind === 'public') return true;

    if (access.kind === 'unclassified') {
      this.logger.error(
        `Unclassified route blocked: ${context.getClass().name}.${context.getHandler().name}`,
      );
      throw new ForbiddenException('Access denied: route has no access policy');
    }

    await this.jwtGuard.canActivate(context);
    const request = context.switchToHttp().getRequest<PolicyRequest>();
    const user = request.user;
    if (!user) throw new ForbiddenException('Access denied');

    if (access.kind === 'authenticated') return true;

    request.tenantContext = await this.authorizeTenant(request, user, access.roles);
    return true;
  }

  private async authorizeTenant(
    request: PolicyRequest,
    user: JwtPayload,
    requiredRoles: MembershipRole[],
  ): Promise<TenantContext> {
    const requestedTenantId = firstString(request.params?.['tenantId']);
    if (!requestedTenantId) {
      this.logger.error(
        `Tenant-scoped route without :tenantId (${request.method} ${request.path})`,
      );
      throw new ForbiddenException('Tenant context required');
    }

    const deny = async (reason: string, extra: Record<string, unknown> = {}): Promise<never> => {
      await this.auditDenied(request, user, requestedTenantId, reason, extra);
      throw new ForbiddenException('Access denied');
    };

    // Conflicting tenant identifiers are an attack signal, never resolved in the caller's favour.
    const headerSlug = firstString(request.headers['x-tenant-slug']);
    if (headerSlug) {
      const [headerTenant] = await this.db
        .select({ id: tenants.id })
        .from(tenants)
        .where(eq(tenants.slug, headerSlug))
        .limit(1);
      if (headerTenant?.id !== requestedTenantId) {
        await deny('tenant_identifier_conflict', { source: 'x-tenant-slug', claimed: headerSlug });
      }
    }
    const body = request.body as { tenantId?: unknown } | undefined;
    if (body && typeof body === 'object' && body.tenantId !== undefined) {
      if (String(body.tenantId) !== requestedTenantId) {
        await deny('tenant_identifier_conflict', { source: 'body.tenantId' });
      }
    }
    const queryTenant = request.query?.['tenantId'];
    if (queryTenant !== undefined && String(queryTenant) !== requestedTenantId) {
      await deny('tenant_identifier_conflict', { source: 'query.tenantId' });
    }

    const [membership] = await this.db
      .select({ id: memberships.id, role: memberships.role, status: memberships.status })
      .from(memberships)
      .where(and(eq(memberships.tenantId, requestedTenantId), eq(memberships.userId, user.sub)))
      .limit(1);

    if (!membership || membership.status !== 'active') {
      await deny('no_active_membership');
    }

    const role = membership!.role as MembershipRole;
    if (!this.permissions.hasRole(role, requiredRoles)) {
      await deny('insufficient_role', { role, requiredRoles });
    }

    return Object.freeze({
      tenantId: requestedTenantId,
      userId: user.sub,
      role,
      membershipId: membership!.id,
      sessionId: user.sessionId,
    });
  }

  private async auditDenied(
    request: PolicyRequest,
    user: JwtPayload,
    targetTenantId: string,
    reason: string,
    extra: Record<string, unknown>,
  ): Promise<void> {
    try {
      const [target] = await this.db
        .select({ id: tenants.id })
        .from(tenants)
        .where(eq(tenants.id, targetTenantId))
        .limit(1);
      const sourceTenants = await this.db
        .select({ tenantId: memberships.tenantId })
        .from(memberships)
        .where(and(eq(memberships.userId, user.sub), eq(memberships.status, 'active')));

      await this.audit.logSync({
        tenantId: target?.id,
        userId: user.sub,
        sessionId: user.sessionId,
        action: 'SECURITY_TENANT_ACCESS_DENIED',
        resourceType: 'route',
        resourceId: `${request.method} ${request.route?.path ?? request.path}`,
        metadata: {
          reason,
          targetTenantId,
          sourceTenantIds: sourceTenants.map((t) => t.tenantId),
          correlationId: firstString(request.headers['x-request-id']),
          ...extra,
        },
        ipAddress: request.ip,
        userAgent: firstString(request.headers['user-agent']),
      });
    } catch (err) {
      this.logger.error(`Failed to audit denied access: ${String(err)}`);
    }
  }
}
