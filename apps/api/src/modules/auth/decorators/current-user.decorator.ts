import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { JwtPayload } from '../auth.service';

/**
 * Usuário autenticado (payload do JWT).
 * - `@CurrentUser()` → JwtPayload completo
 * - `@CurrentUser('userId')` → id do usuário (`sub`)
 * - `@CurrentUser('email')` etc. → o campo pedido
 */
export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | 'userId' | undefined, ctx: ExecutionContext): JwtPayload | string | undefined => {
    const request = ctx.switchToHttp().getRequest<Request & { user: JwtPayload }>();
    const user = request.user;
    if (!data) return user;
    if (data === 'userId') return user?.sub;
    return user?.[data];
  },
);
