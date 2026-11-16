import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { RbacModule } from '../../shared/rbac/rbac.module';
import { StorageModule } from '../../shared/storage/storage.module';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeService } from './knowledge.service';
import { KnowledgeRepository } from './knowledge.repository';
import { KnowledgeProcessor, KNOWLEDGE_QUEUE } from './knowledge.processor';
import { EmbeddingService } from './embedding.service';
import { queueConsumers } from '../../shared/queue/queue-role';

@Module({
  imports: [
    RbacModule,
    StorageModule,
    BullModule.registerQueue({
      name: KNOWLEDGE_QUEUE,
    }),
  ],
  controllers: [KnowledgeController],
  providers: [KnowledgeService, KnowledgeRepository, EmbeddingService, ...queueConsumers(KnowledgeProcessor)],
  exports: [KnowledgeService],
})
export class KnowledgeModule {}
