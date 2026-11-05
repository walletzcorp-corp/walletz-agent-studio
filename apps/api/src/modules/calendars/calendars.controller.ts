import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader, ApiQuery } from '@nestjs/swagger';
import type { Response } from 'express';
import { CalendarsService } from './calendars.service';
import { CreateMeetingDto, RescheduleMeetingDto, CancelMeetingDto } from './dto/create-meeting.dto';
import { UpdateAgentCalendarSettingsDto } from './dto/update-agent-settings.dto';
import { Roles } from '../../shared/rbac/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/auth.service';
import { CurrentTenant } from '../../shared/rbac/tenant-context';
import { Public } from '../../shared/rbac/access-policy.decorators';

@ApiTags('calendars')
@Controller('tenants/:tenantId/calendars')
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-slug', required: false })
export class CalendarsController {
  constructor(private readonly svc: CalendarsService) {}

  /* ── Connections ── */

  @Get('connections')
  @Roles('viewer')
  @ApiOperation({ summary: 'Listar conexões de calendário do tenant' })
  listConnections(@CurrentTenant('tenantId') tenantId: string) {
    return this.svc.listConnections(tenantId);
  }

  @Delete('connections/:connectionId')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desconectar calendário' })
  async disconnect(
    @CurrentTenant('tenantId') tenantId: string,
    @Param('connectionId') connectionId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.svc.disconnect(tenantId, connectionId, user.sub);
  }

  @Post('sync')
  @Roles('agent_operator')
  @ApiOperation({ summary: 'Disparar sincronização manual' })
  triggerSync(@CurrentTenant('tenantId') tenantId: string) {
    return this.svc.triggerSync(tenantId);
  }

  /* ── OAuth flow ── */

  @Get(':provider/authorize')
  @Roles('admin')
  @ApiOperation({ summary: 'Iniciar OAuth com Google ou Microsoft' })
  authorize(
    @CurrentTenant('tenantId') tenantId: string,
    @Param('provider') provider: string,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    if (provider !== 'google' && provider !== 'microsoft') {
      throw new BadRequestException('Unsupported calendar provider');
    }
    const url = this.svc.buildAuthUrl(tenantId, provider, user.sub);
    res.redirect(url);
  }
}

/* ── OAuth callback controller (no tenantId in path — uses state param) ── */
@ApiTags('calendars')
@Controller('tenants/callback')
export class CalendarsCallbackController {
  constructor(private readonly svc: CalendarsService) {}

  @Get(':provider')
  @Public('State OAuth assinado (HMAC), expira em 10 min e carrega tenant e usuário')
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
    const appUrl = process.env['APP_URL'] ?? 'http://localhost:3000';
    if (error) {
      return res.redirect(`${appUrl}/agendas?error=${encodeURIComponent(error)}`);
    }
    try {
      await this.svc.handleCallback(code, state, req.user?.sub ?? null);
      return res.redirect(`${appUrl}/agendas?connected=${provider}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown';
      return res.redirect(`${appUrl}/agendas?error=${encodeURIComponent(msg)}`);
    }
  }
}

/* ── Availability ── */
@ApiTags('calendars')
@Controller('tenants/:tenantId/calendars')
@ApiBearerAuth()
export class CalendarsAvailabilityController {
  constructor(private readonly svc: CalendarsService) {}

  @Get('availability')
  @Roles('viewer')
  @ApiQuery({ name: 'agentId', required: true })
  @ApiQuery({ name: 'days', required: false, type: Number })
  @ApiOperation({ summary: 'Obter slots disponíveis para agendamento' })
  getAvailability(
    @CurrentTenant('tenantId') tenantId: string,
    @Query('agentId') agentId: string,
    @Query('days') days?: string,
  ) {
    const daysAhead = days === undefined ? 7 : Number.parseInt(days, 10);
    if (!Number.isInteger(daysAhead) || daysAhead < 1 || daysAhead > 60) {
      throw new BadRequestException('days must be an integer between 1 and 60');
    }
    return this.svc.getAvailableSlots(tenantId, agentId, daysAhead);
  }

  /* ── Meetings ── */

  @Get('meetings')
  @Roles('viewer')
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiOperation({ summary: 'Listar reuniões' })
  listMeetings(
    @CurrentTenant('tenantId') tenantId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.svc.listMeetings(tenantId, parseDateParam('from', from), parseDateParam('to', to));
  }

  @Post('meetings')
  @Roles('agent_operator')
  @ApiOperation({ summary: 'Criar reunião' })
  createMeeting(
    @CurrentTenant('tenantId') tenantId: string,
    @Body() dto: CreateMeetingDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.createMeeting(tenantId, user.sub, dto);
  }

  @Patch('meetings/:meetingId/reschedule')
  @Roles('agent_operator')
  @ApiOperation({ summary: 'Reagendar reunião' })
  rescheduleMeeting(
    @CurrentTenant('tenantId') tenantId: string,
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
    @CurrentTenant('tenantId') tenantId: string,
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
  getAgentSettings(@CurrentTenant('tenantId') tenantId: string, @Param('agentId') agentId: string) {
    return this.svc.getAgentSettings(tenantId, agentId);
  }

  @Patch('agents/:agentId/settings')
  @Roles('admin')
  @ApiOperation({ summary: 'Atualizar configurações de agendamento do agente' })
  upsertAgentSettings(
    @CurrentTenant('tenantId') tenantId: string,
    @Param('agentId') agentId: string,
    @Body() dto: UpdateAgentCalendarSettingsDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.upsertAgentSettings(tenantId, agentId, user.sub, dto);
  }
}

function parseDateParam(name: string, value: string | undefined): Date | undefined {
  if (value === undefined) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime()))
    throw new BadRequestException(`${name} must be an ISO 8601 date`);
  return date;
}
