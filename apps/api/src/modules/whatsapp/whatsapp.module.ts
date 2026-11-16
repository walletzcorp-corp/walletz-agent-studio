import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { RbacModule } from '../../shared/rbac/rbac.module';
import { CryptoModule } from '../../shared/crypto/crypto.module';
import { LabModule } from '../lab/lab.module';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';
import { MetaConfigService } from './meta-config.service';

@Module({
  imports: [HttpModule.register({ timeout: 15000 }), RbacModule, CryptoModule, LabModule],
  controllers: [WhatsappController],
  providers: [WhatsappService, MetaConfigService],
  exports: [WhatsappService, MetaConfigService],
})
export class WhatsappModule {}
