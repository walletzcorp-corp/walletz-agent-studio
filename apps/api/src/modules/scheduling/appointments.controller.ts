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
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AppointmentsService } from './services/appointments.service';
import { NotificationService } from './services/notification.service';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { AppointmentStatus } from '@prisma/client';

@Controller({ path: 'appointments', version: '1' })
export class AppointmentsController {
  constructor(
    private readonly service: AppointmentsService,
    private readonly notificationService: NotificationService,
  ) {}

  // RF-AGE-007: Public endpoint — patient follows secure link to confirm/cancel
  // This route must be BEFORE @UseGuards so it's unauthenticated
  @Post('action-link/:token')
  @HttpCode(HttpStatus.OK)
  async handleTokenAction(@Param('token') token: string) {
    const payload = await this.notificationService.validateToken(token);
    if (!payload) throw new NotFoundException('Link inválido, expirado ou já utilizado');

    if (payload.action === 'CONFIRMAR') {
      // Fetch current rowVersion then confirm
      const appt = await this.service.findOneInternal(payload.appointmentId);
      if (!appt) throw new NotFoundException('Agendamento não encontrado');
      await this.service.transition(
        payload.appointmentId,
        'CONFIRMADO',
        { rowVersion: appt.rowVersion },
        { sub: 'patient-link', email: '', isWalletzAdmin: false, organizationIds: [payload.organizationId], tenantIds: [] },
      );
    } else if (payload.action === 'CANCELAR') {
      const appt = await this.service.findOneInternal(payload.appointmentId);
      if (!appt) throw new NotFoundException('Agendamento não encontrado');
      await this.service.transition(
        payload.appointmentId,
        'CANCELADO',
        { rowVersion: appt.rowVersion, reason: 'Cancelado pelo paciente via link' },
        { sub: 'patient-link', email: '', isWalletzAdmin: false, organizationIds: [payload.organizationId], tenantIds: [] },
      );
    } else {
      throw new BadRequestException('Ação de link não suportada; use o aplicativo para reagendar');
    }

    await this.notificationService.consumeToken(token);
    return { ok: true, action: payload.action };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() body: any, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(body, user);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.findOne(id, user);
  }

  // RF-AGE-009: Check-in
  @Patch(':id/checkin')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  checkIn(@Param('id', ParseUUIDPipe) id: string, @Body() body: any, @CurrentUser() user: AuthenticatedUser) {
    return this.service.transition(id, 'AGUARDANDO', { rowVersion: body.rowVersion }, user);
  }

  // RF-AGE-009: Confirmar agendamento
  @Patch(':id/confirm')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  confirm(@Param('id', ParseUUIDPipe) id: string, @Body() body: any, @CurrentUser() user: AuthenticatedUser) {
    return this.service.transition(id, 'CONFIRMADO', { rowVersion: body.rowVersion }, user);
  }

  // RF-AGE-009: Iniciar atendimento
  @Patch(':id/start')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  start(@Param('id', ParseUUIDPipe) id: string, @Body() body: any, @CurrentUser() user: AuthenticatedUser) {
    return this.service.transition(id, 'EM_ATENDIMENTO', { rowVersion: body.rowVersion }, user);
  }

  // RF-AGE-009: Finalizar atendimento
  @Patch(':id/finish')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  finish(@Param('id', ParseUUIDPipe) id: string, @Body() body: any, @CurrentUser() user: AuthenticatedUser) {
    return this.service.transition(id, 'FINALIZADO', { rowVersion: body.rowVersion }, user);
  }

  // RF-AGE-006/007: Cancelar
  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  cancel(@Param('id', ParseUUIDPipe) id: string, @Body() body: any, @CurrentUser() user: AuthenticatedUser) {
    return this.service.transition(id, 'CANCELADO', { reason: body.reason, rowVersion: body.rowVersion }, user);
  }

  // RF-AGE-012: No-show
  @Patch(':id/no-show')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  noShow(@Param('id', ParseUUIDPipe) id: string, @Body() body: any, @CurrentUser() user: AuthenticatedUser) {
    return this.service.transition(id, 'NAO_COMPARECEU', { rowVersion: body.rowVersion }, user);
  }

  // RF-AGE-007: Reagendar
  @Post(':id/reschedule')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  reschedule(@Param('id', ParseUUIDPipe) id: string, @Body() body: any, @CurrentUser() user: AuthenticatedUser) {
    return this.service.reschedule(id, body, user);
  }
}
