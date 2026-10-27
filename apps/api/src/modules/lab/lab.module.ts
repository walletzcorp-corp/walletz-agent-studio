import { Module } from '@nestjs/common';
import { RbacModule } from '../../shared/rbac/rbac.module';
import { CalendarsModule } from '../calendars/calendars.module';
import { PcConnectorModule } from '../pc-connector/pc-connector.module';
import { LabController } from './lab.controller';
import { LabService } from './lab.service';

@Module({
  imports: [RbacModule, CalendarsModule, PcConnectorModule],
  controllers: [LabController],
  providers: [LabService],
  exports: [LabService],
})
export class LabModule {}
