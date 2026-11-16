import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NextFunction, Request, Response } from 'express';

export const SWAGGER_PATH = 'api/docs';

const CLOSED_ENVIRONMENTS = new Set(['production', 'staging']);
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

/** Swagger só existe fora de produção/homologação. Em produção as rotas nem são registradas. */
export function isSwaggerEnabled(nodeEnv: string | undefined): boolean {
  return !CLOSED_ENVIRONMENTS.has((nodeEnv ?? '').toLowerCase());
}

/** Nome do host sem a porta (`localhost:3001` → `localhost`, `[::1]:3001` → `[::1]`). */
export function hostnameOf(hostHeader: string | undefined): string {
  if (!hostHeader) return '';
  const host = hostHeader.trim().toLowerCase();
  if (host.startsWith('[')) return host.slice(0, host.indexOf(']') + 1);
  return host.split(':')[0] ?? '';
}

export function isLocalHost(hostHeader: string | undefined): boolean {
  return LOCAL_HOSTS.has(hostnameOf(hostHeader));
}

/**
 * Segunda barreira: mesmo com o Swagger ligado, só responde a quem acessa por localhost.
 * Usa o header Host (não o IP): atrás do nginx toda requisição chega de 127.0.0.1,
 * mas com o Host público — então o IP não serve para distinguir acesso local.
 */
export function localhostOnly(req: Request, res: Response, next: NextFunction): void {
  const isDocsRoute = req.path === `/${SWAGGER_PATH}` || req.path.startsWith(`/${SWAGGER_PATH}/`) || req.path.startsWith(`/${SWAGGER_PATH}-json`) || req.path.startsWith(`/${SWAGGER_PATH}-yaml`);
  if (isDocsRoute && !isLocalHost(req.headers.host)) {
    res.status(404).json({ statusCode: 404, message: 'Not Found' });
    return;
  }
  next();
}

export function buildOpenApiConfig() {
  return new DocumentBuilder()
    .setTitle('Walletz Agent Studio API')
    .setDescription(
      [
        'API do Walletz Agent Studio — SaaS B2B para criar, ensinar, testar e operar agentes de IA.',
        '',
        '**Autenticação:** faça `POST /api/v1/auth/login`, copie o `accessToken` e clique em **Authorize**.',
        '',
        '**Multi-tenant:** rotas `/tenants/:tenantId/...` exigem que o usuário seja membro da organização; o servidor valida o vínculo e o papel (RBAC) em toda requisição.',
        '',
        '**Erros:** respostas de erro trazem `message` em português e `traceId` para suporte.',
        '',
        'Esta documentação só fica disponível em ambiente local.',
      ].join('\n'),
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Autenticação e sessões')
    .addTag('tenants', 'Organizações e configurações')
    .addTag('users', 'Usuários e convites')
    .addTag('agents', 'Agentes de IA')
    .addTag('knowledge', 'Base de conhecimento')
    .addTag('teach', 'Ensinar a IA (fatos, diretrizes, exemplos)')
    .addTag('lab', 'Laboratório de testes')
    .addTag('conversations', 'Conversas e inbox')
    .addTag('contacts', 'Contatos e leads')
    .addTag('campaigns', 'Campanhas e cadências')
    .addTag('calendars', 'Agendas Google e Microsoft')
    .addTag('whatsapp', 'WhatsApp Business')
    .addTag('privacy', 'LGPD: exportação e exclusão de dados')
    .addTag('pc-connector', 'Conector local (agente no computador do cliente)')
    .addTag('admin', 'Administração da plataforma')
    .addTag('health', 'Health checks')
    .build();
}

export function setupSwagger(app: INestApplication): void {
  app.use(localhostOnly);
  const document = SwaggerModule.createDocument(app, buildOpenApiConfig());
  SwaggerModule.setup(SWAGGER_PATH, app, document, {
    swaggerOptions: { persistAuthorization: true },
    customSiteTitle: 'Walletz Agent Studio — API',
  });
}
