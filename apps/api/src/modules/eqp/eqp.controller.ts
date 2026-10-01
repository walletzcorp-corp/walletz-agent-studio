import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { EqpService } from './services/eqp.service';
import { CredentialStatus, WorkShiftStatus } from '@prisma/client';

@Controller({ path: 'eqp', version: '1' })
@UseGuards(JwtAuthGuard)
export class EqpController {
  constructor(private readonly eqpService: EqpService) {}

  // Credenciais
  @Get(':organizationId/credenciais')
  listCredentials(
    @Param('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('professionalId') professionalId?: string,
    @Query('credentialType') credentialType?: string,
    @Query('status') status?: CredentialStatus,
  ) {
    return this.eqpService.listCredentials(orgId, user, { professionalId, credentialType, status });
  }

  @Post(':organizationId/credenciais')
  createCredential(
    @Param('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: {
      professionalId: string;
      credentialType: string;
      number?: string;
      issuingBody?: string;
      issuedAt?: string;
      expiresAt?: string;
      scope?: string;
      documentUrl?: string;
      notes?: string;
    },
  ) {
    return this.eqpService.createCredential(orgId, user, {
      ...body,
      issuedAt: body.issuedAt ? new Date(body.issuedAt) : undefined,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
    });
  }

  @Patch(':organizationId/credenciais/:id/status')
  updateCredentialStatus(
    @Param('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { status: CredentialStatus; notes?: string },
  ) {
    return this.eqpService.updateCredentialStatus(orgId, user, id, body);
  }

  @Get(':organizationId/credenciais/vencendo')
  listExpiringCredentials(
    @Param('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('daysAhead') daysAhead?: string,
  ) {
    return this.eqpService.listExpiringCredentials(orgId, user, daysAhead ? parseInt(daysAhead) : 30);
  }

  // Competências
  @Get(':organizationId/competencias')
  listCompetencies(
    @Param('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('professionalId') professionalId?: string,
    @Query('competencyName') competencyName?: string,
  ) {
    return this.eqpService.listCompetencies(orgId, user, { professionalId, competencyName });
  }

  @Post(':organizationId/competencias')
  addCompetency(
    @Param('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: {
      professionalId: string;
      competencyName: string;
      competencyCode?: string;
      level?: string;
      certifiedAt?: string;
      certifiedBy?: string;
      expiresAt?: string;
    },
  ) {
    return this.eqpService.addCompetency(orgId, user, {
      ...body,
      certifiedAt: body.certifiedAt ? new Date(body.certifiedAt) : undefined,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
    });
  }

  // Escalas
  @Get(':organizationId/escalas')
  listSchedules(@Param('organizationId') orgId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.eqpService.listSchedules(orgId, user);
  }

  @Post(':organizationId/escalas')
  createSchedule(
    @Param('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: {
      unitId?: string;
      name: string;
      description?: string;
      startDate: string;
      endDate?: string;
    },
  ) {
    return this.eqpService.createSchedule(orgId, user, {
      ...body,
      startDate: new Date(body.startDate),
      endDate: body.endDate ? new Date(body.endDate) : undefined,
    });
  }

  // Turnos
  @Get(':organizationId/turnos')
  listShifts(
    @Param('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('scheduleId') scheduleId?: string,
    @Query('professionalId') professionalId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: WorkShiftStatus,
  ) {
    return this.eqpService.listShifts(orgId, user, {
      scheduleId,
      professionalId,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      status,
    });
  }

  @Post(':organizationId/turnos')
  createShift(
    @Param('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: {
      scheduleId: string;
      professionalId: string;
      role?: string;
      shiftStart: string;
      shiftEnd: string;
      breakMinutes?: number;
    },
  ) {
    return this.eqpService.createShift(orgId, user, {
      ...body,
      shiftStart: new Date(body.shiftStart),
      shiftEnd: new Date(body.shiftEnd),
    });
  }

  @Patch(':organizationId/turnos/:id/status')
  updateShiftStatus(
    @Param('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: {
      status: WorkShiftStatus;
      actualStart?: string;
      actualEnd?: string;
      substituteId?: string;
      cancelReason?: string;
    },
  ) {
    return this.eqpService.updateShiftStatus(orgId, user, id, {
      ...body,
      actualStart: body.actualStart ? new Date(body.actualStart) : undefined,
      actualEnd: body.actualEnd ? new Date(body.actualEnd) : undefined,
    });
  }

  // Dashboard e relatórios
  @Get(':organizationId/dashboard')
  getDashboard(@Param('organizationId') orgId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.eqpService.getDashboard(orgId, user);
  }

  @Get(':organizationId/relatorio-equipe')
  getTeamReport(
    @Param('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('unitId') unitId?: string,
  ) {
    return this.eqpService.getTeamReport(orgId, user, {
      from: new Date(from),
      to: new Date(to),
      unitId,
    });
  }
}
