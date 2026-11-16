import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { RbacModule } from '../../shared/rbac/rbac.module';
import { AiProvidersModule } from '../ai-providers/ai-providers.module';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeService } from './knowledge.service';
import { KnowledgeRepository } from './knowledge.repository';
import { KnowledgeProcessor, KNOWLEDGE_QUEUE } from './knowledge.processor';
import { KnowledgeRetrievalService } from './knowledge-retrieval.service';

@Module({
  imports: [
    RbacModule,
    AiProvidersModule,
    BullModule.registerQueue({
      name: KNOWLEDGE_QUEUE,
    }),
  ],
  controllers: [KnowledgeController],
  providers: [KnowledgeService, KnowledgeRepository, KnowledgeProcessor, KnowledgeRetrievalService],
  exports: [KnowledgeService, KnowledgeRetrievalService],
})
export class KnowledgeModule {}
