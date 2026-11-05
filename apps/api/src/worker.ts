/**
 * Queue worker entrypoint: boots the application context (no HTTP server) with the BullMQ
 * consumers enabled. Run it next to an API started with QUEUE_ROLE=api.
 */
process.env['QUEUE_ROLE'] = 'worker';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { createLogger } from './shared/telemetry/logger';

async function bootstrap() {
  const logger = createLogger('Worker');
  const app = await NestFactory.createApplicationContext(AppModule, { bufferLogs: true });
  app.enableShutdownHooks();
  logger.info('Queue worker running (inbox-dispatch, campaign-dispatch, knowledge)');
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start worker:', err);
  process.exit(1);
});
