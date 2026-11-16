import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './shared/filters/http-exception.filter';
import { LoggingInterceptor } from './shared/interceptors/logging.interceptor';
import { createLogger } from './shared/telemetry/logger';
import { isSwaggerEnabled, setupSwagger, SWAGGER_PATH } from './shared/docs/swagger';

async function bootstrap() {
  const logger = createLogger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    rawBody: true,
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

  // A API fica atrás do nginx: o IP real do cliente vem em X-Forwarded-For
  // (necessário para limite de taxa por IP e para o audit log).
  app.getHttpAdapter().getInstance().set('trust proxy', 'loopback, linklocal, uniquelocal');

  const allowedOrigins = configService.get<string>('CORS_ALLOWED_ORIGINS', '').split(',');
  const panelCors = {
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Idempotency-Key', 'X-Request-Id', 'x-tenant-slug'],
    exposedHeaders: ['X-Request-Id'],
  };
  // O webchat roda nos sites dos clientes: qualquer origem passa no CORS, sem
  // credenciais; a autorização real é a lista de sites do widget (header Origin).
  const webchatCors = {
    origin: true,
    credentials: false,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-Webchat-Session'],
  };
  const publicWebchatPath = /^\/api\/v\d+\/public\/webchat\//;
  app.enableCors((req: { url?: string }, callback: (err: Error | null, options: typeof panelCors | typeof webchatCors) => void) => {
    callback(null, publicWebchatPath.test(req.url ?? '') ? webchatCors : panelCors);
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

  const nodeEnv = configService.get<string>('NODE_ENV');
  const swaggerEnabled = isSwaggerEnabled(nodeEnv);
  if (swaggerEnabled) setupSwagger(app);

  const port = configService.get<number>('PORT', 3001);
  await app.listen(port);

  logger.info(`API running on port ${port} [${nodeEnv}]`);
  if (swaggerEnabled) logger.info(`Swagger (somente localhost): http://localhost:${port}/${SWAGGER_PATH}`);
}

bootstrap().catch((err) => {
  console.error('Failed to start API:', err);
  process.exit(1);
});
