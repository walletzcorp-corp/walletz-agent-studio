import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './shared/redis/redis.module';
import { StorageModule } from './shared/storage/storage.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UsersModule } from './modules/users/users.module';
import { AgentsModule } from './modules/agents/agents.module';
import { KnowledgeModule } from './modules/knowledge/knowledge.module';
import { ConversationModule } from './modules/conversations/conversations.module';
import { ContactModule } from './modules/contacts/contacts.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { BillingModule } from './modules/billing/billing.module';
import { HealthModule } from './modules/health/health.module';
import { AuditModule } from './shared/audit/audit.module';
import { OutboxModule } from './shared/outbox/outbox.module';
import { TelemetryModule } from './shared/telemetry/telemetry.module';
import { MailModule } from './shared/mail/mail.module';
import { RbacModule } from './shared/rbac/rbac.module';
import { appConfig } from './config/app.config';
import { databaseConfig } from './config/database.config';
import { redisConfig } from './config/redis.config';
import { jwtConfig } from './config/jwt.config';
import { storageConfig } from './config/storage.config';
import { anthropicConfig } from './config/anthropic.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig, jwtConfig, storageConfig, anthropicConfig],
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 10,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 50,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 100,
      },
    ]),
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.getOrThrow<string>('REDIS_URL'),
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: 100,
          removeOnFail: 500,
        },
      }),
    }),
    TelemetryModule,
    MailModule,
    DatabaseModule,
    RedisModule,
    StorageModule,
    AuditModule,
    RbacModule,
    OutboxModule,
    HealthModule,
    AuthModule,
    TenantsModule,
    UsersModule,
    AgentsModule,
    KnowledgeModule,
    ConversationModule,
    ContactModule,
    WhatsappModule,
    BillingModule,
  ],
})
export class AppModule {}
