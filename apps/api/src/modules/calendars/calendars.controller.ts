import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, Req, Res, UseGuards,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader, ApiQuery } from '@nestjs/swagger';
import type { Response } from 'express';
import { CalendarsService } from './calendars.service';
import { CreateMeetingDto, RescheduleMeetingDto, CancelMeetingDto } from './dto/create-meeting.dto';
import { UpdateAgentCalendarSettingsDto } from './dto/update-agent-settings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../../shared/rbac/rbac.guard';
import { Roles } from '../../shared/rbac/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/auth.service';

@ApiTags('calendars')
@Controller('tenants/:tenantId/calendars')
@UseGuards(JwtAuthGuard, RbacGuard)
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-slug', required: false })
export class CalendarsController {
  constructor(private readonly svc: CalendarsService) {}

  /* ── Connections ── */

  @Get('connections')
  @Roles('viewer')
  @ApiOperation({ summary: 'Listar conexões de calendário do tenant' })
  listConnections(@Param('tenantId') tenantId: string) {
    return this.svc.listConnections(tenantId);
  }

  @Delete('connections/:connectionId')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desconectar calendário' })
  async disconnect(
    @Param('tenantId') tenantId: string,
    @Param('connectionId') connectionId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.svc.disconnect(tenantId, connectionId, user.sub);
  }

  @Post('sync')
  @Roles('agent_operator')
  @ApiOperation({ summary: 'Disparar sincronização manual' })
  triggerSync(@Param('tenantId') tenantId: string) {
    return this.svc.triggerSync(tenantId);
  }

  /* ── OAuth flow ── */

  @Get(':provider/authorize')
  @Roles('admin')
  @ApiOperation({ summary: 'Iniciar OAuth com Google ou Microsoft' })
  authorize(
    @Param('tenantId') tenantId: string,
    @Param('provider') provider: 'google' | 'microsoft',
    @Res() res: Response,
  ) {
    const url = this.svc.buildAuthUrl(tenantId, provider);
    res.redirect(url);
  }
}

/* ── OAuth callback controller (no tenantId in path — uses state param) ── */
@ApiTags('calendars')
@Controller('tenants/callback')
export class CalendarsCallbackController {
  constructor(private readonly svc: CalendarsService) {}

  @Get(':provider')
  @HttpCode(HttpStatus.FOUND)
  @ApiOperation({ summary: 'Callback OAuth (Google/Microsoft)' })
  async callback(
    @Param('provider') provider: 'google' | 'microsoft',
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string | undefined,
    @Req() req: { user?: JwtPayload },
    @Res() res: Response,
  ) {
    if (error) {
      return res.redirect(`/agendas?error=${encodeURIComponent(error)}`);
    }
    try {
      await this.svc.handleCallback(
        code,
        state,
        req.user?.sub ?? 'system',
      );
      const appUrl = process.env['APP_URL'] ?? 'http://localhost:3000';
      return res.redirect(`${appUrl}/agendas?connected=${provider}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown';
      const appUrl = process.env['APP_URL'] ?? 'http://localhost:3000';
      return res.redirect(`${appUrl}/agendas?error=${encodeURIComponent(msg)}`);
    }
  }
}

/* ── Availability ── */
@ApiTags('calendars')
@Controller('tenants/:tenantId/calendars')
@UseGuards(JwtAuthGuard, RbacGuard)
@ApiBearerAuth()
export class CalendarsAvailabilityController {
  constructor(private readonly svc: CalendarsService) {}

  @Get('availability')
  @Roles('viewer')
  @ApiQuery({ name: 'agentId', required: true })
  @ApiQuery({ name: 'days', required: false, type: Number })
  @ApiOperation({ summary: 'Obter slots disponíveis para agendamento' })
  getAvailability(
    @Param('tenantId') tenantId: string,
    @Query('agentId') agentId: string,
    @Query('days') days?: string,
  ) {
    return this.svc.getAvailableSlots(tenantId, agentId, days ? parseInt(days, 10) : 7);
  }

  /* ── Meetings ── */

  @Get('meetings')
  @Roles('viewer')
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiOperation({ summary: 'Listar reuniões' })
  listMeetings(
    @Param('tenantId') tenantId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.svc.listMeetings(
      tenantId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

  @Post('meetings')
  @Roles('agent_operator')
  @ApiOperation({ summary: 'Criar reunião' })
  createMeeting(
    @Param('tenantId') tenantId: string,
    @Body() dto: CreateMeetingDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.createMeeting(tenantId, user.sub, dto);
  }

  @Patch('meetings/:meetingId/reschedule')
  @Roles('agent_operator')
  @ApiOperation({ summary: 'Reagendar reunião' })
  rescheduleMeeting(
    @Param('tenantId') tenantId: string,
    @Param('meetingId') meetingId: string,
    @Body() dto: RescheduleMeetingDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.rescheduleMeeting(tenantId, meetingId, user.sub, dto);
  }

  @Delete('meetings/:meetingId')
  @Roles('agent_operator')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancelar reunião' })
  async cancelMeeting(
    @Param('tenantId') tenantId: string,
    @Param('meetingId') meetingId: string,
    @Body() dto: CancelMeetingDto,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.svc.cancelMeeting(tenantId, meetingId, user.sub, dto.reason);
  }

  /* ── Agent settings ── */

  @Get('agents/:agentId/settings')
  @Roles('viewer')
  @ApiOperation({ summary: 'Obter configurações de agendamento do agente' })
  getAgentSettings(
    @Param('tenantId') tenantId: string,
    @Param('agentId') agentId: string,
  ) {
    return this.svc.getAgentSettings(tenantId, agentId);
  }

  @Patch('agents/:agentId/settings')
  @Roles('admin')
  @ApiOperation({ summary: 'Atualizar configurações de agendamento do agente' })
  upsertAgentSettings(
    @Param('tenantId') tenantId: string,
    @Param('agentId') agentId: string,
    @Body() dto: UpdateAgentCalendarSettingsDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.upsertAgentSettings(tenantId, agentId, user.sub, dto);
  }
}
