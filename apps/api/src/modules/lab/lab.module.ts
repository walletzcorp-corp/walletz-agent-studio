import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RbacModule } from '../../shared/rbac/rbac.module';
import { CalendarsModule } from '../calendars/calendars.module';
import { PcConnectorModule } from '../pc-connector/pc-connector.module';
import { LabController } from './lab.controller';
import { LabService } from './lab.service';
import { LLM_PROVIDER } from './llm/llm-provider';
import { createLlmProvider } from './llm/llm-provider.factory';

@Module({
  imports: [RbacModule, CalendarsModule, PcConnectorModule],
  controllers: [LabController],
  providers: [
    LabService,
    {
      provide: LLM_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => createLlmProvider(config),
    },
  ],
  exports: [LabService],
})
export class LabModule {}
