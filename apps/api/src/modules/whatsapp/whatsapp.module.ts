import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bullmq';
import { RbacModule } from '../../shared/rbac/rbac.module';
import { CryptoModule } from '../../shared/crypto/crypto.module';
import { LabModule } from '../lab/lab.module';
import { AiProvidersModule } from '../ai-providers/ai-providers.module';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappInboundProcessor } from './whatsapp.processor';
import { WHATSAPP_INBOUND_QUEUE } from './whatsapp.queue';
import { WhatsappService } from './whatsapp.service';

@Module({
  imports: [
    HttpModule.register({ timeout: 15000 }),
    BullModule.registerQueue({ name: WHATSAPP_INBOUND_QUEUE }),
    RbacModule,
    CryptoModule,
    LabModule,
    AiProvidersModule,
  ],
  controllers: [WhatsappController],
  providers: [WhatsappService, WhatsappInboundProcessor],
  exports: [WhatsappService],
})
export class WhatsappModule {}
