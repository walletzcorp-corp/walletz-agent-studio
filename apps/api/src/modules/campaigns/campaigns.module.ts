import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { RbacModule } from '../../shared/rbac/rbac.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';
import { CampaignDispatchProcessor, CAMPAIGN_DISPATCH_QUEUE } from './campaign-dispatch.processor';
import { queueConsumers } from '../../shared/queue/queue-role';

@Module({
  imports: [
    RbacModule,
    WhatsappModule,
    BullModule.registerQueue({ name: CAMPAIGN_DISPATCH_QUEUE }),
  ],
  controllers: [CampaignsController],
  providers: [CampaignsService, ...queueConsumers(CampaignDispatchProcessor)],
  exports: [CampaignsService],
})
export class CampaignsModule {}
