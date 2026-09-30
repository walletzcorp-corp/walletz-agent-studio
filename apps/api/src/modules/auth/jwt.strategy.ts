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
    super({
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
    });
  }

  async validate(payload: any) {
    const keycloakId: string = payload.sub;

    // Busca usuário interno pelo keycloakId
    const user = await this.prisma.user.findUnique({
      where: { keycloakId },
    });

    if (!user) {
      // Auto-provision: cria usuário na primeira autenticação
      const newUser = await this.prisma.user.create({
        data: {
          keycloakId,
          email: payload.email ?? `${keycloakId}@unknown.local`,
          name: payload.name ?? payload.preferred_username ?? keycloakId,
          status: 'ATIVO',
        },
      });
      return {
        sub: keycloakId,
        email: newUser.email,
        name: newUser.name,
        userId: newUser.id,
      };
    }

    if (user.status === 'BLOQUEADO' || user.status === 'ENCERRADO') {
      throw new UnauthorizedException('Usuário bloqueado ou encerrado');
    }

    return {
      sub: keycloakId,
      email: user.email,
      name: user.name,
      userId: user.id,
    };
  }
}
