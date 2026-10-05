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

    // No @Roles decorator = allow any authenticated user
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: JwtPayload; tenantId?: string }>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException();
    }

    const tenantId = request.tenantId ?? user.tenantId;
    if (!tenantId) {
      throw new ForbiddenException('Tenant context required');
    }

    const [membership] = await this.db
      .select({ role: memberships.role, status: memberships.status })
      .from(memberships)
      .where(and(eq(memberships.tenantId, tenantId), eq(memberships.userId, user.sub)))
      .limit(1);

    if (!membership || membership.status !== 'active') {
      throw new ForbiddenException('No active membership in this tenant');
    }

    if (!this.permissionsService.hasRole(membership.role as MembershipRole, requiredRoles)) {
      throw new ForbiddenException('Insufficient role');
    }

    return true;
  }
}
