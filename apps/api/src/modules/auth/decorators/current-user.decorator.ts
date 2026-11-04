import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { JwtPayload } from '../auth.service';

export const CurrentUser = createParamDecorator(
  (field: keyof JwtPayload | 'userId' | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request & { user: JwtPayload }>();
    const user = request.user;
    if (!field) return user;
    // 'userId' is a convenience alias for the JWT subject (user UUID)
    if (field === 'userId') return user?.sub;
    return user?.[field];
  },
);
