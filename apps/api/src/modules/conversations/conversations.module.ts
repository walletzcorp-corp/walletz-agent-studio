import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bullmq';
import { RbacModule } from '../../shared/rbac/rbac.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { InboxDispatchProcessor, INBOX_DISPATCH_QUEUE } from './inbox-dispatch.processor';
import { queueConsumers } from '../../shared/queue/queue-role';

@Module({
  imports: [
    HttpModule,
    RbacModule,
    WhatsappModule,
    BullModule.registerQueue({ name: INBOX_DISPATCH_QUEUE }),
  ],
  controllers: [ConversationsController],
  providers: [ConversationsService, ...queueConsumers(InboxDispatchProcessor)],
  exports: [ConversationsService],
})
export class ConversationModule {}
