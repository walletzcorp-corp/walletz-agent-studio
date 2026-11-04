import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
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
import { TeachModule } from './modules/teach/teach.module';
import { LabModule } from './modules/lab/lab.module';
import { ConversationModule } from './modules/conversations/conversations.module';
import { ContactModule } from './modules/contacts/contacts.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { BillingModule } from './modules/billing/billing.module';
import { CalendarsModule } from './modules/calendars/calendars.module';
import { PrivacyModule } from './modules/privacy/privacy.module';
import { HealthModule } from './modules/health/health.module';
import { PcConnectorModule } from './modules/pc-connector/pc-connector.module';
import { AuditModule } from './shared/audit/audit.module';
import { CryptoModule } from './shared/crypto/crypto.module';
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
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
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
    CryptoModule,
    RbacModule,
    OutboxModule,
    HealthModule,
    AuthModule,
    TenantsModule,
    UsersModule,
    AgentsModule,
    KnowledgeModule,
    TeachModule,
    LabModule,
    ConversationModule,
    ContactModule,
    WhatsappModule,
    CampaignsModule,
    BillingModule,
    CalendarsModule,
    PrivacyModule,
    PcConnectorModule,
  ],
})
export class AppModule {}
