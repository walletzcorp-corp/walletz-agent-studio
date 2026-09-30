import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const isDev = config.get('NODE_ENV') === 'development';

    super(
      isDev
        ? {
            // Dev mode: aceita HS256 local (sem Keycloak)
            secretOrKey: config.get('DEV_JWT_SECRET', 'walletz-dev-secret-local-only'),
            algorithms: ['HS256'],
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
          }
        : {
            // Produção: RS256 via Keycloak JWKS
            secretOrKeyProvider: passportJwtSecret({
              cache: true,
              rateLimit: true,
              jwksRequestsPerMinute: 5,
              jwksUri: `${config.get('KEYCLOAK_URL')}/realms/${config.get('KEYCLOAK_REALM')}/protocol/openid-connect/certs`,
            }),
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            audience: config.get('JWT_AUDIENCE', 'account'),
            issuer: config.get('JWT_ISSUER'),
            algorithms: ['RS256'],
          },
    );
  }

  async validate(payload: any) {
    const keycloakId: string = payload.sub;

    const user = await this.prisma.user.findUnique({ where: { keycloakId } });

    if (!user) {
      const newUser = await this.prisma.user.create({
        data: {
          keycloakId,
          email: payload.email ?? `${keycloakId}@unknown.local`,
          name: payload.name ?? payload.preferred_username ?? keycloakId,
          status: 'ATIVO',
        },
      });
      // New user has no memberships yet — they can't access any data until added to an org
      return { sub: keycloakId, email: newUser.email, name: newUser.name, userId: newUser.id, isWalletzAdmin: false, organizationIds: [], tenantIds: [] };
    }

    if (user.status === 'BLOQUEADO' || user.status === 'ENCERRADO') {
      throw new UnauthorizedException('Usuário bloqueado ou encerrado');
    }

    // Resolve tenant context from active organizational memberships
    const memberships = await this.prisma.userOrganization.findMany({
      where: { userId: user.id, status: 'ATIVO' },
      include: {
        organization: { select: { tenantId: true } },
        profile: { select: { name: true } },
      },
    });

    const isWalletzAdmin = memberships.some((m) => m.profile.name === 'WALLETZ_ADMIN');
    const organizationIds = memberships.map((m) => m.organizationId);
    const tenantIds = [...new Set(memberships.map((m) => m.organization.tenantId))];

    return { sub: keycloakId, email: user.email, name: user.name, userId: user.id, isWalletzAdmin, organizationIds, tenantIds };
  }
}
