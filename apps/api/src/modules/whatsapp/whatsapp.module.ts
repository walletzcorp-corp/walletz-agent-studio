import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { RbacModule } from '../../shared/rbac/rbac.module';
import { LabModule } from '../lab/lab.module';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';

@Module({
  imports: [
    HttpModule.register({ timeout: 15000 }),
    RbacModule,
    LabModule,
  ],
  controllers: [WhatsappController],
  providers: [WhatsappService],
  exports: [WhatsappService],
})
export class WhatsappModule {}
