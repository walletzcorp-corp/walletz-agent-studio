import { Controller, Post, Body, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';

@ApiTags('Dev Auth (apenas desenvolvimento)')
@Controller({ path: 'auth', version: '1' })
export class DevAuthController {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('dev-login')
  @ApiOperation({ summary: '[DEV] Login sem Keycloak — disponível apenas em NODE_ENV=development' })
  async devLogin(@Body() body: { email?: string }) {
    if (this.config.get('NODE_ENV') !== 'development') {
      return { error: 'Disponível apenas em ambiente de desenvolvimento' };
    }

    const email = body?.email ?? 'dev-admin@walletz-med.local';
    const keycloakId = `dev-${email.split('@')[0]}`;

    let user = await this.prisma.user.findUnique({ where: { keycloakId } });
    if (!user) {
      user = await this.prisma.user.upsert({
        where: { email },
        update: {},
        create: {
          keycloakId,
          email,
          name: 'Dev Admin',
          status: 'ATIVO',
        },
      });
    }

    const payload = {
      sub: user.keycloakId,
      email: user.email,
      name: user.name,
      preferred_username: user.email,
    };

    const token = this.jwt.sign(payload);
    return {
      access_token: token,
      token_type: 'Bearer',
      user: { id: user.id, email: user.email, name: user.name },
    };
  }

  @Get('dev-whoami')
  @ApiOperation({ summary: '[DEV] Verifica token atual' })
  devWhoami() {
    return { message: 'Use o header Authorization: Bearer <token>' };
  }
}
