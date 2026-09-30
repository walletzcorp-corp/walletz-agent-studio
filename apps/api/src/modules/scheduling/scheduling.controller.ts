import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AvailabilityService } from './services/availability.service';
import { WaitListService } from './services/wait-list.service';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@Controller({ path: 'scheduling', version: '1' })
@UseGuards(JwtAuthGuard)
export class SchedulingController {
  constructor(
    private readonly availabilityService: AvailabilityService,
    private readonly waitListService: WaitListService,
  ) {}

  // RF-AGE-005: Available slots
  @Get('availability')
  getFreeSlots(
    @Query('unitId') unitId: string,
    @Query('date') date: string,
    @Query('professionalId') professionalId?: string,
    @Query('serviceId') serviceId?: string,
    @Query('durationMin') durationMin?: string,
  ) {
    return this.availabilityService.getFreeSlots({
      unitId,
      date,
      professionalId,
      serviceId,
      durationMin: durationMin ? +durationMin : 30,
    });
  }

  @Post('availability/rules')
  createRule(@Body() body: any) {
    return this.availabilityService.createRule(body);
  }

  @Get('availability/rules')
  listRules(
    @Query('unitId') unitId: string,
    @Query('professionalId') professionalId?: string,
  ) {
    return this.availabilityService.listRules(unitId, professionalId);
  }

  @Delete('availability/rules/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteRule(@Param('id', ParseUUIDPipe) id: string) {
    return this.availabilityService.deleteRule(id);
  }

  // RF-AGE-008: Wait list
  @Post('wait-list')
  createWaitListEntry(@Body() body: any, @CurrentUser() user: AuthenticatedUser) {
    return this.waitListService.create(body, user);
  }

  @Get('wait-list')
  findWaitList(
    @CurrentUser() user: AuthenticatedUser,
    @Query('organizationId') organizationId?: string,
    @Query('unitId') unitId?: string,
    @Query('status') status?: string,
  ) {
    return this.waitListService.findAll({ organizationId, unitId, status }, user);
  }

  @Post('wait-list/:id/promote')
  @HttpCode(HttpStatus.OK)
  promoteWaitListEntry(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { appointmentId: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.waitListService.promoteToAppointment(id, body.appointmentId, user);
  }

  @Post('wait-list/:id/notify')
  @HttpCode(HttpStatus.OK)
  notifyWaitListEntry(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.waitListService.notify(id, user);
  }

  @Post('wait-list/:id/cancel')
  @HttpCode(HttpStatus.OK)
  cancelWaitListEntry(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.waitListService.cancel(id, user);
  }
}
