import { Module } from '@nestjs/common';
import { RbacModule } from '../../shared/rbac/rbac.module';
import { CalendarsModule } from '../calendars/calendars.module';
import { PcConnectorModule } from '../pc-connector/pc-connector.module';
import { AiProvidersModule } from '../ai-providers/ai-providers.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { LabController } from './lab.controller';
import { LabService } from './lab.service';

@Module({
  imports: [RbacModule, CalendarsModule, PcConnectorModule, AiProvidersModule, KnowledgeModule],
  controllers: [LabController],
  providers: [LabService],
  exports: [LabService],
})
export class LabModule {}
