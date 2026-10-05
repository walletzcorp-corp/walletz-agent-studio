import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { RbacModule } from '../../shared/rbac/rbac.module';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';

@Module({
  imports: [HttpModule, RbacModule],
  controllers: [ConversationsController],
  providers: [ConversationsService],
  exports: [ConversationsService],
})
export class ConversationModule {}
