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

  const allowedOrigins = configService.get<string>('CORS_ALLOWED_ORIGINS', '').split(',');
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Idempotency-Key', 'X-Request-Id', 'x-tenant-slug'],
    exposedHeaders: ['X-Request-Id'],
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
