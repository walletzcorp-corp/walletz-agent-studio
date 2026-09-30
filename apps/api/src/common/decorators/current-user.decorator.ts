import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthenticatedUser {
  sub: string;
  email: string;
  name?: string;
  userId?: string;
  /** true when user has WALLETZ_ADMIN profile in any organization */
  isWalletzAdmin: boolean;
  /** IDs of organizations this user is an active member of */
  organizationIds: string[];
  /** Tenant IDs derived from organizational memberships */
  tenantIds: string[];
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
