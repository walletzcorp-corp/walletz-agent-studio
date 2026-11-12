import { ForbiddenException, UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { PlatformAdminGuard } from '../guards/platform-admin.guard';
import type { DrizzleDB } from '../../../database/database.module';

function dbReturning(rows: Array<{ isPlatformAdmin: boolean }>): DrizzleDB {
  const chain = {
    from: () => chain,
    where: () => chain,
    limit: () => Promise.resolve(rows),
  };
  return { select: () => chain } as unknown as DrizzleDB;
}

function ctx(user: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

const user = { sub: 'u1', email: 'x@walletzcorp.com', sessionId: 's1' };

describe('PlatformAdminGuard', () => {
  it('libera admin da plataforma', async () => {
    const guard = new PlatformAdminGuard(dbReturning([{ isPlatformAdmin: true }]));
    await expect(guard.canActivate(ctx(user))).resolves.toBe(true);
  });

  it('recusa usuário comum', async () => {
    const guard = new PlatformAdminGuard(dbReturning([{ isPlatformAdmin: false }]));
    await expect(guard.canActivate(ctx(user))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('recusa usuário inexistente ou removido', async () => {
    const guard = new PlatformAdminGuard(dbReturning([]));
    await expect(guard.canActivate(ctx(user))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('recusa requisição sem usuário autenticado', async () => {
    const guard = new PlatformAdminGuard(dbReturning([{ isPlatformAdmin: true }]));
    await expect(guard.canActivate(ctx(undefined))).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
