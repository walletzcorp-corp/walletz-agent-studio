import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthenticatedUser {
  sub: string;          // Keycloak user ID
  email: string;
  name?: string;
  tenantId?: string;    // Set after tenant resolution
  userId?: string;      // Walletz Med internal user ID
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
