import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './shared/filters/http-exception.filter';
import { LoggingInterceptor } from './shared/interceptors/logging.interceptor';
import { createLogger } from './shared/telemetry/logger';

async function bootstrap() {
  const logger = createLogger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      hsts: { maxAge: 31536000, includeSubDomains: true },
      noSniff: true,
      frameguard: { action: 'deny' },
    }),
  );

  const allowedOrigins = configService.get<string>('CORS_ALLOWED_ORIGINS', '').split(',');
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Idempotency-Key', 'X-Request-Id'],
  });

  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Walletz Agent Studio API')
    .setDescription('API do Walletz Agent Studio — SaaS B2B para agentes de IA')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Autenticação e sessões')
    .addTag('tenants', 'Organizações e configurações')
    .addTag('users', 'Usuários e convites')
    .addTag('agents', 'Agentes de IA')
    .addTag('knowledge', 'Base de conhecimento')
    .addTag('conversations', 'Conversas e inbox')
    .addTag('contacts', 'Contatos e leads')
    .addTag('campaigns', 'Campanhas e cadências')
    .addTag('calendars', 'Agendas Google e Microsoft')
    .addTag('whatsapp', 'WhatsApp Business')
    .addTag('analytics', 'Métricas e relatórios')
    .addTag('billing', 'Planos e assinaturas')
    .addTag('admin', 'Administração da plataforma')
    .addTag('health', 'Health checks')
    .build();

  if (configService.get('NODE_ENV') !== 'production') {
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  const port = configService.get<number>('PORT', 3001);
  await app.listen(port);

  logger.info(`API running on port ${port} [${configService.get('NODE_ENV')}]`);
}

bootstrap().catch((err) => {
  console.error('Failed to start API:', err);
  process.exit(1);
});
