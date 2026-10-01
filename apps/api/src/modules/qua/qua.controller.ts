import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { QuaService } from './services/qua.service';
import { QualityIncidentStatus, QualityIncidentType, QualityActionStatus, QualityProtocolStatus } from '@prisma/client';

@Controller({ path: 'qua', version: '1' })
@UseGuards(JwtAuthGuard)
export class QuaController {
  constructor(private readonly quaService: QuaService) {}

  // Incidentes
  @Get(':organizationId/incidentes')
  listIncidents(
    @Param('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: QualityIncidentStatus,
    @Query('incidentType') incidentType?: QualityIncidentType,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.quaService.listIncidents(orgId, user, {
      status,
      incidentType,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }

  @Post(':organizationId/incidentes')
  reportIncident(
    @Param('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: {
      incidentType: QualityIncidentType;
      title: string;
      description: string;
      occurredAt: string;
      location?: string;
      unitId?: string;
      patientId?: string;
      isAnonymous?: boolean;
      riskClassification?: string;
      immediateActions?: string;
    },
  ) {
    return this.quaService.reportIncident(orgId, user, {
      ...body,
      occurredAt: new Date(body.occurredAt),
    });
  }

  @Post(':organizationId/incidentes/:id/adendos')
  addAddendum(
    @Param('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { content: string },
  ) {
    return this.quaService.addAddendum(orgId, user, id, body);
  }

  @Patch(':organizationId/incidentes/:id/analise')
  startAnalysis(
    @Param('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { rootCause?: string; contributingFactors?: Record<string, unknown> },
  ) {
    return this.quaService.startAnalysis(orgId, user, id, body);
  }

  @Patch(':organizationId/incidentes/:id/encerrar')
  closeIncident(
    @Param('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { notes?: string },
  ) {
    return this.quaService.closeIncident(orgId, user, id, body);
  }

  @Patch(':organizationId/incidentes/:id/notificacao-regulatoria')
  prepareRegulatoryNotification(
    @Param('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.quaService.prepareRegulatoryNotification(orgId, user, id);
  }

  @Patch(':organizationId/incidentes/:id/notificacao-regulatoria/confirmar')
  confirmRegulatoryNotification(
    @Param('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.quaService.confirmRegulatoryNotification(orgId, user, id);
  }

  // Planos de ação
  @Get(':organizationId/acoes')
  listActionPlans(
    @Param('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: QualityActionStatus,
    @Query('incidentId') incidentId?: string,
  ) {
    return this.quaService.listActionPlans(orgId, user, { status, incidentId });
  }

  @Post(':organizationId/acoes')
  createActionPlan(
    @Param('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: {
      incidentId?: string;
      title: string;
      description: string;
      actionType?: string;
      responsibleId: string;
      dueDate: string;
    },
  ) {
    return this.quaService.createActionPlan(orgId, user, {
      ...body,
      dueDate: new Date(body.dueDate),
    });
  }

  @Patch(':organizationId/acoes/:id')
  updateActionPlan(
    @Param('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { status?: QualityActionStatus; evidence?: string; notes?: string },
  ) {
    return this.quaService.updateActionPlan(orgId, user, id, body);
  }

  @Patch(':organizationId/acoes/:id/verificar')
  verifyActionPlan(
    @Param('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { verificationNote: string },
  ) {
    return this.quaService.verifyActionPlan(orgId, user, id, body);
  }

  // Protocolos
  @Get(':organizationId/protocolos')
  listProtocols(
    @Param('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: QualityProtocolStatus,
  ) {
    return this.quaService.listProtocols(orgId, user, status);
  }

  @Post(':organizationId/protocolos')
  createProtocol(
    @Param('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: {
      code?: string;
      title: string;
      category?: string;
      version?: string;
      content: string;
      policyOwner?: string;
      nextReviewDate?: string;
    },
  ) {
    return this.quaService.createProtocol(orgId, user, {
      ...body,
      nextReviewDate: body.nextReviewDate ? new Date(body.nextReviewDate) : undefined,
    });
  }

  @Patch(':organizationId/protocolos/:id/publicar')
  publishProtocol(
    @Param('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.quaService.publishProtocol(orgId, user, id);
  }

  // Indicadores
  @Get(':organizationId/indicadores')
  listIndicators(@Param('organizationId') orgId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.quaService.listIndicators(orgId, user);
  }

  @Post(':organizationId/indicadores')
  createIndicator(
    @Param('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { name: string; code?: string; formula?: string; unit?: string; targetValue?: number },
  ) {
    return this.quaService.createIndicator(orgId, user, body);
  }

  @Post(':organizationId/indicadores/:id/medicoes')
  recordMeasurement(
    @Param('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { periodStart: string; periodEnd: string; value: number; notes?: string },
  ) {
    return this.quaService.recordMeasurement(orgId, user, id, {
      ...body,
      periodStart: new Date(body.periodStart),
      periodEnd: new Date(body.periodEnd),
    });
  }

  @Get(':organizationId/dashboard')
  getDashboard(@Param('organizationId') orgId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.quaService.getDashboard(orgId, user);
  }
}
