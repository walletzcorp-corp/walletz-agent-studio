import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator, ForbiddenException } from '@nestjs/common';
import type { MembershipRole } from './roles.decorator';

/**
 * The only trusted source of "which tenant is this request acting on".
 * It is produced exclusively by AccessPolicyGuard from: authenticated user + active
 * membership + requested tenant. URL, header, body and query values are only *claims*
 * that must agree with it; they never grant access by themselves.
 */
export interface TenantContext {
  readonly tenantId: string;
  readonly userId: string;
  readonly role: MembershipRole;
  readonly membershipId: string;
  readonly sessionId: string;
}

export interface TenantRequest {
  tenantContext?: TenantContext;
}

export function getTenantContext(request: TenantRequest): TenantContext {
  const ctx = request.tenantContext;
  if (!ctx) throw new ForbiddenException('Tenant context missing');
  return ctx;
}

/** `@CurrentTenant('tenantId') tenantId: string` or `@CurrentTenant() ctx: TenantContext`. */
export const CurrentTenant = createParamDecorator(
  (field: keyof TenantContext | undefined, ctx: ExecutionContext) => {
    const tenant = getTenantContext(ctx.switchToHttp().getRequest<TenantRequest>());
    return field ? tenant[field] : tenant;
  },
);
