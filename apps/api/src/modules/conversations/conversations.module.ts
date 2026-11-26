import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { RbacModule } from '../../shared/rbac/rbac.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';

@Module({
  imports: [HttpModule, RbacModule, WhatsappModule],
  controllers: [ConversationsController],
  providers: [ConversationsService],
  exports: [ConversationsService],
})
export class ConversationModule {}
