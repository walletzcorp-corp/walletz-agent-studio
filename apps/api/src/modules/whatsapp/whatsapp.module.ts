import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { RbacModule } from '../../shared/rbac/rbac.module';
import { CryptoModule } from '../../shared/crypto/crypto.module';
import { LabModule } from '../lab/lab.module';
import { AiProvidersModule } from '../ai-providers/ai-providers.module';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';

@Module({
  imports: [
    HttpModule.register({ timeout: 15000 }),
    RbacModule,
    CryptoModule,
    LabModule,
    AiProvidersModule,
  ],
  controllers: [WhatsappController],
  providers: [WhatsappService],
  exports: [WhatsappService],
})
export class WhatsappModule {}
