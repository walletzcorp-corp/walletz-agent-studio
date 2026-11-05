import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { RbacModule } from '../../shared/rbac/rbac.module';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeService } from './knowledge.service';
import { KnowledgeRepository } from './knowledge.repository';
import { KnowledgeProcessor, KNOWLEDGE_QUEUE } from './knowledge.processor';
import { queueConsumers } from '../../shared/queue/queue-role';

@Module({
  imports: [
    RbacModule,
    BullModule.registerQueue({
      name: KNOWLEDGE_QUEUE,
    }),
  ],
  controllers: [KnowledgeController],
  providers: [KnowledgeService, KnowledgeRepository, ...queueConsumers(KnowledgeProcessor)],
  exports: [KnowledgeService],
})
export class KnowledgeModule {}
