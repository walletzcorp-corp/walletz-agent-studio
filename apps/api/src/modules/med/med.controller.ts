import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { MedService } from './services/med.service';
import { MedRecordStatus, MedRouteType, MedAdverseReactionSeverity, MedLotAlertType } from '@prisma/client';

@Controller({ path: 'med', version: '1' })
@UseGuards(JwtAuthGuard)
export class MedController {
  constructor(private readonly medService: MedService) {}

  // Protocolos
  @Get(':organizationId/protocolos')
  listProtocols(@Param('organizationId') orgId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.medService.listProtocols(orgId, user);
  }

  @Post(':organizationId/protocolos')
  createProtocol(
    @Param('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { name: string; code?: string; description?: string; version?: string; requiresDualCheck?: boolean; routes?: string[] },
  ) {
    return this.medService.createProtocol(orgId, user, body);
  }

  @Patch(':organizationId/protocolos/:id/aprovar')
  approveProtocol(
    @Param('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.medService.approveProtocol(orgId, user, id);
  }

  // Registros de administração
  @Get(':organizationId/registros')
  listRecords(
    @Param('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('patientId') patientId?: string,
    @Query('status') status?: MedRecordStatus,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.medService.listRecords(orgId, user, {
      patientId,
      status,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }

  @Post(':organizationId/registros')
  createRecord(
    @Param('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: {
      patientId: string;
      prescriptionRef?: string;
      protocolId?: string;
      appointmentId?: string;
      roomBookingId?: string;
      medicationName: string;
      medicationCode?: string;
      dose: number;
      doseUnit: string;
      route: MedRouteType;
      lotNumber?: string;
      expiryDate?: string;
      scheduledAt: string;
      isControlled?: boolean;
      isHighAlert?: boolean;
      infusionRateMl?: number;
      infusionDurationMin?: number;
      notes?: string;
    },
  ) {
    return this.medService.createRecord(orgId, user, {
      ...body,
      expiryDate: body.expiryDate ? new Date(body.expiryDate) : undefined,
      scheduledAt: new Date(body.scheduledAt),
    });
  }

  @Patch(':organizationId/registros/:id/preparar')
  registerPreparation(
    @Param('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { notes?: string },
  ) {
    return this.medService.registerPreparation(orgId, user, id, body);
  }

  @Patch(':organizationId/registros/:id/administrar')
  registerAdministration(
    @Param('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { patient1stId: string; patient2ndId: string; notes?: string },
  ) {
    return this.medService.registerAdministration(orgId, user, id, body);
  }

  @Post(':organizationId/registros/:id/verificacoes')
  addVerification(
    @Param('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { role: string; checkItems?: Record<string, unknown>; notes?: string },
  ) {
    return this.medService.addVerification(orgId, user, id, body);
  }

  @Patch(':organizationId/registros/:id/devolver')
  registerReturn(
    @Param('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { status: 'DEVOLVIDO' | 'DESCARTADO'; wasteReason?: string; notes?: string },
  ) {
    return this.medService.registerReturn(orgId, user, id, body);
  }

  @Patch(':organizationId/registros/:id/corrigir')
  correctRecord(
    @Param('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { fieldName: string; newValue: string; reason: string },
  ) {
    return this.medService.correctRecord(orgId, user, id, body);
  }

  @Get(':organizationId/registros/:id/auditoria')
  getAuditTrail(
    @Param('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.medService.getAuditTrail(orgId, user, id);
  }

  @Get(':organizationId/mar')
  getMar(
    @Param('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('patientId') patientId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.medService.getMar(orgId, user, {
      patientId,
      from: from ? new Date(from) : new Date(new Date().setDate(new Date().getDate() - 1)),
      to: to ? new Date(to) : new Date(),
    });
  }

  // Reações adversas
  @Get(':organizationId/reacoes')
  listAdverseReactions(
    @Param('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('patientId') patientId?: string,
    @Query('severity') severity?: MedAdverseReactionSeverity,
  ) {
    return this.medService.listAdverseReactions(orgId, user, { patientId, severity });
  }

  @Post(':organizationId/reacoes')
  reportAdverseReaction(
    @Param('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: {
      recordId?: string;
      patientId: string;
      medicationName: string;
      reactionDesc: string;
      severity: MedAdverseReactionSeverity;
      onsetAt: string;
      treatment?: string;
      notes?: string;
    },
  ) {
    return this.medService.reportAdverseReaction(orgId, user, {
      ...body,
      onsetAt: new Date(body.onsetAt),
    });
  }

  // Alertas de lote
  @Get(':organizationId/lotes/alertas')
  listLotAlerts(
    @Param('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('onlyActive') onlyActive?: string,
  ) {
    return this.medService.listLotAlerts(orgId, user, onlyActive === 'true');
  }

  @Post(':organizationId/lotes/alertas')
  createLotAlert(
    @Param('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { lotNumber: string; medicationName: string; medicationCode?: string; alertType: MedLotAlertType; reason: string },
  ) {
    return this.medService.createLotAlert(orgId, user, body);
  }

  @Patch(':organizationId/lotes/alertas/:id/resolver')
  resolveLotAlert(
    @Param('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { resolutionNotes: string },
  ) {
    return this.medService.resolveLotAlert(orgId, user, id, body);
  }
}
