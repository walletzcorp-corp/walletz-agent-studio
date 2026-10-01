import { Module } from '@nestjs/common';
import { AvailabilityService } from './services/availability.service';
import { ConflictService } from './services/conflict.service';
import { AppointmentsService } from './services/appointments.service';
import { WaitListService } from './services/wait-list.service';
import { QueueService } from './services/queue.service';
import { NotificationService } from './services/notification.service';
import { AppointmentsController } from './appointments.controller';
import { SchedulingController } from './scheduling.controller';
import { QueueController } from './queue.controller';

@Module({
  providers: [
    AvailabilityService,
    ConflictService,
    AppointmentsService,
    WaitListService,
    QueueService,
    NotificationService,
  ],
  controllers: [AppointmentsController, SchedulingController, QueueController],
  exports: [AppointmentsService, WaitListService, QueueService, NotificationService],
})
export class SchedulingModule {}
