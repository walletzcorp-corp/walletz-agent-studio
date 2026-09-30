import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AppointmentsService } from './services/appointments.service';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { AppointmentStatus } from '@prisma/client';

@Controller({ path: 'appointments', version: '1' })
@UseGuards(JwtAuthGuard)
export class AppointmentsController {
  constructor(private readonly service: AppointmentsService) {}

  @Post()
  create(@Body() body: any, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(body, user);
  }

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('organizationId') organizationId?: string,
    @Query('unitId') unitId?: string,
    @Query('professionalId') professionalId?: string,
    @Query('patientId') patientId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('status') status?: AppointmentStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll(
      {
        organizationId,
        unitId,
        professionalId,
        patientId,
        dateFrom,
        dateTo,
        status,
        page: page ? +page : 1,
        limit: limit ? +limit : 20,
      },
      user,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.findOne(id, user);
  }

  // RF-AGE-009: Check-in
  @Patch(':id/checkin')
  @HttpCode(HttpStatus.OK)
  checkIn(@Param('id', ParseUUIDPipe) id: string, @Body() body: any, @CurrentUser() user: AuthenticatedUser) {
    return this.service.transition(id, 'AGUARDANDO', { rowVersion: body.rowVersion }, user);
  }

  // RF-AGE-009: Confirmar agendamento
  @Patch(':id/confirm')
  @HttpCode(HttpStatus.OK)
  confirm(@Param('id', ParseUUIDPipe) id: string, @Body() body: any, @CurrentUser() user: AuthenticatedUser) {
    return this.service.transition(id, 'CONFIRMADO', { rowVersion: body.rowVersion }, user);
  }

  // RF-AGE-009: Iniciar atendimento
  @Patch(':id/start')
  @HttpCode(HttpStatus.OK)
  start(@Param('id', ParseUUIDPipe) id: string, @Body() body: any, @CurrentUser() user: AuthenticatedUser) {
    return this.service.transition(id, 'EM_ATENDIMENTO', { rowVersion: body.rowVersion }, user);
  }

  // RF-AGE-009: Finalizar atendimento
  @Patch(':id/finish')
  @HttpCode(HttpStatus.OK)
  finish(@Param('id', ParseUUIDPipe) id: string, @Body() body: any, @CurrentUser() user: AuthenticatedUser) {
    return this.service.transition(id, 'FINALIZADO', { rowVersion: body.rowVersion }, user);
  }

  // RF-AGE-006/007: Cancelar
  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(@Param('id', ParseUUIDPipe) id: string, @Body() body: any, @CurrentUser() user: AuthenticatedUser) {
    return this.service.transition(id, 'CANCELADO', { reason: body.reason, rowVersion: body.rowVersion }, user);
  }

  // RF-AGE-012: No-show
  @Patch(':id/no-show')
  @HttpCode(HttpStatus.OK)
  noShow(@Param('id', ParseUUIDPipe) id: string, @Body() body: any, @CurrentUser() user: AuthenticatedUser) {
    return this.service.transition(id, 'NAO_COMPARECEU', { rowVersion: body.rowVersion }, user);
  }

  // RF-AGE-007: Reagendar
  @Post(':id/reschedule')
  @HttpCode(HttpStatus.OK)
  reschedule(@Param('id', ParseUUIDPipe) id: string, @Body() body: any, @CurrentUser() user: AuthenticatedUser) {
    return this.service.reschedule(id, body, user);
  }
}
