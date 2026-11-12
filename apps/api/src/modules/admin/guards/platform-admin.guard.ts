import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { DRIZZLE_TOKEN, type DrizzleDB } from '../../../database/database.module';
import { users } from '../../../database/schema/users';
import type { JwtPayload } from '../../auth/auth.service';

/**
 * Libera só administradores da plataforma Walletz. Consulta o banco a cada
 * requisição (não confia em claim do JWT), então revogar o acesso vale na hora.
 * Usar sempre depois do JwtAuthGuard.
 */
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(@Inject(DRIZZLE_TOKEN) private readonly db: DrizzleDB) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    const user = request.user;
    if (!user) {
      throw new UnauthorizedException();
    }

    const [row] = await this.db
      .select({ isPlatformAdmin: users.isPlatformAdmin })
      .from(users)
      .where(and(eq(users.id, user.sub), isNull(users.deletedAt)))
      .limit(1);

    if (!row?.isPlatformAdmin) {
      throw new ForbiddenException('Acesso restrito à administração da plataforma');
    }
    return true;
  }
}
