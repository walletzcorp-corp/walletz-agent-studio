import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, Res, UseGuards,
  HttpCode, HttpStatus, BadRequestException, Logger,
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

  /**
   * Devolve a URL de consentimento do provedor; o front chama com o token e
   * depois leva o navegador até ela (navegação direta não envia o Bearer).
   */
  @Get(':provider/authorize')
  @Roles('admin')
  @ApiOperation({ summary: 'Gerar URL de autorização OAuth (Google ou Microsoft)' })
  async authorize(
    @Param('tenantId') tenantId: string,
    @Param('provider') provider: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ url: string }> {
    return { url: await this.svc.createAuthUrl(tenantId, parseProvider(provider), user.sub) };
  }
}

function parseProvider(value: string): 'google' | 'microsoft' {
  if (value !== 'google' && value !== 'microsoft') {
    throw new BadRequestException('Provedor de agenda inválido.');
  }
  return value;
}

/** Página de Agendas do app (APP_URL já inclui o basePath em produção). */
function agendasUrl(query: string): string {
  const appUrl = (process.env['APP_URL'] ?? 'http://localhost:3000').replace(/\/$/, '');
  return `${appUrl}/agendas?${query}`;
}

/* ── OAuth callback controller (no tenantId in path — uses state param) ── */
@ApiTags('calendars')
@Controller('tenants/callback')
export class CalendarsCallbackController {
  private readonly logger = new Logger(CalendarsCallbackController.name);

  constructor(private readonly svc: CalendarsService) {}

  @Get(':provider')
  @HttpCode(HttpStatus.FOUND)
  @ApiOperation({ summary: 'Callback OAuth (Google/Microsoft)' })
  async callback(
    @Param('provider') provider: string,
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Res() res: Response,
  ) {
    if (provider !== 'google' && provider !== 'microsoft') {
      return res.redirect(agendasUrl(`error=${encodeURIComponent('Provedor de agenda inválido.')}`));
    }
    if (error) {
      // Ex.: usuário clicou em "Cancelar" na tela do Google (access_denied).
      const msg = error === 'access_denied' ? 'A conexão foi cancelada.' : 'O provedor recusou a conexão.';
      return res.redirect(agendasUrl(`error=${encodeURIComponent(msg)}`));
    }
    try {
      await this.svc.handleCallback(provider, code ?? '', state ?? '');
      return res.redirect(agendasUrl(`connected=${provider}`));
    } catch (err) {
      this.logger.warn(`Falha no retorno OAuth (${provider}): ${err instanceof Error ? err.message : String(err)}`);
      const msg = err instanceof BadRequestException
        ? err.message
        : 'Não foi possível conectar a agenda. Tente de novo.';
      return res.redirect(agendasUrl(`error=${encodeURIComponent(msg)}`));
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
