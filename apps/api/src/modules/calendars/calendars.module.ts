import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { RbacModule } from '../../shared/rbac/rbac.module';
import { AuditModule } from '../../shared/audit/audit.module';
import {
  CalendarsController,
  CalendarsCallbackController,
  CalendarsAvailabilityController,
} from './calendars.controller';
import { CalendarsService } from './calendars.service';
import { GoogleCalendarService } from './google.service';
import { MicrosoftCalendarService } from './microsoft.service';
import { MicrosoftGraphAuthService } from './ms-graph-auth.service';
import { AvailabilityService } from './availability.service';
import { SchedulingToolsService } from './scheduling-tools.service';

@Module({
  imports: [HttpModule.register({ timeout: 15000 }), RbacModule, AuditModule],
  controllers: [CalendarsController, CalendarsCallbackController, CalendarsAvailabilityController],
  providers: [
    CalendarsService,
    GoogleCalendarService,
    MicrosoftCalendarService,
    MicrosoftGraphAuthService,
    AvailabilityService,
    SchedulingToolsService,
  ],
  exports: [
    CalendarsService,
    AvailabilityService,
    SchedulingToolsService,
    MicrosoftGraphAuthService,
  ],
})
export class CalendarsModule {}
