import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { RbacModule } from '../../shared/rbac/rbac.module';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeService } from './knowledge.service';
import { KnowledgeRepository } from './knowledge.repository';
import { KnowledgeProcessor, KNOWLEDGE_QUEUE } from './knowledge.processor';

@Module({
  imports: [
    RbacModule,
    BullModule.registerQueue({
      name: KNOWLEDGE_QUEUE,
    }),
  ],
  controllers: [KnowledgeController],
  providers: [KnowledgeService, KnowledgeRepository, KnowledgeProcessor],
  exports: [KnowledgeService],
})
export class KnowledgeModule {}
