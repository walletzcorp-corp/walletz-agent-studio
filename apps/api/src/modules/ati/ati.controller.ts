import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { AtiService } from './services/ati.service';
import { AssetStatus, AssetMaintenanceType, AssetMaintenanceStatus } from '@prisma/client';

@Controller({ path: 'ati', version: '1' })
@UseGuards(JwtAuthGuard)
export class AtiController {
  constructor(private readonly atiService: AtiService) {}

  // Ativos
  @Get(':organizationId/ativos')
  listAssets(
    @Param('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: AssetStatus,
    @Query('category') category?: string,
    @Query('unitId') unitId?: string,
  ) {
    return this.atiService.listAssets(orgId, user, { status, category, unitId });
  }

  @Post(':organizationId/ativos')
  createAsset(
    @Param('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: {
      tag?: string;
      name: string;
      category?: string;
      manufacturer?: string;
      model?: string;
      serialNumber?: string;
      unitId?: string;
      acquisitionDate?: string;
      acquisitionValue?: number;
      requiresCalibration?: boolean;
      calibrationPeriodDays?: number;
      requiresSterilization?: boolean;
      requiresColdChain?: boolean;
      minTempC?: number;
      maxTempC?: number;
      notes?: string;
    },
  ) {
    return this.atiService.createAsset(orgId, user, {
      ...body,
      acquisitionDate: body.acquisitionDate ? new Date(body.acquisitionDate) : undefined,
    });
  }

  @Patch(':organizationId/ativos/:id/bloquear')
  blockAsset(
    @Param('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    return this.atiService.blockAsset(orgId, user, id, body);
  }

  @Patch(':organizationId/ativos/:id/liberar')
  unblockAsset(
    @Param('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.atiService.unblockAsset(orgId, user, id);
  }

  @Get(':organizationId/dashboard')
  getDashboard(@Param('organizationId') orgId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.atiService.getDashboard(orgId, user);
  }

  // Manutenção
  @Get(':organizationId/manutencoes')
  listMaintenanceOrders(
    @Param('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('assetId') assetId?: string,
    @Query('status') status?: AssetMaintenanceStatus,
  ) {
    return this.atiService.listMaintenanceOrders(orgId, user, { assetId, status });
  }

  @Post(':organizationId/manutencoes')
  createMaintenanceOrder(
    @Param('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: {
      assetId: string;
      maintenanceType: AssetMaintenanceType;
      title: string;
      description?: string;
      scheduledAt?: string;
    },
  ) {
    return this.atiService.createMaintenanceOrder(orgId, user, {
      ...body,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
    });
  }

  @Patch(':organizationId/manutencoes/:id/status')
  updateMaintenanceStatus(
    @Param('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: {
      status: AssetMaintenanceStatus;
      executedBy?: string;
      cost?: number;
      findings?: string;
      nextDueAt?: string;
    },
  ) {
    return this.atiService.updateMaintenanceStatus(orgId, user, id, {
      ...body,
      nextDueAt: body.nextDueAt ? new Date(body.nextDueAt) : undefined,
    });
  }

  // Esterilização
  @Get(':organizationId/esterilizacao')
  listSterilizationCycles(
    @Param('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('assetId') assetId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.atiService.listSterilizationCycles(orgId, user, {
      assetId,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }

  @Post(':organizationId/esterilizacao')
  createSterilizationCycle(
    @Param('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: {
      assetId: string;
      cycleNumber?: string;
      method: string;
      processStart: string;
      temperature?: number;
      pressure?: number;
      batchItems?: Record<string, unknown>[];
      notes?: string;
    },
  ) {
    return this.atiService.createSterilizationCycle(orgId, user, {
      ...body,
      processStart: new Date(body.processStart),
    });
  }

  @Patch(':organizationId/esterilizacao/:id/validar')
  validateSterilizationCycle(
    @Param('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { passed: boolean; processEnd: string; notes?: string },
  ) {
    return this.atiService.validateSterilizationCycle(orgId, user, id, {
      ...body,
      processEnd: new Date(body.processEnd),
    });
  }

  // Cadeia do frio
  @Get(':organizationId/cadeia-frio/:assetId/leituras')
  listColdChainLogs(
    @Param('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('assetId') assetId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.atiService.listColdChainLogs(orgId, user, assetId, {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }

  @Post(':organizationId/cadeia-frio/leituras')
  recordColdChainReading(
    @Param('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: {
      assetId: string;
      readingAt: string;
      temperatureC: number;
      humidityPct?: number;
      source?: string;
    },
  ) {
    return this.atiService.recordColdChainReading(orgId, user, {
      ...body,
      readingAt: new Date(body.readingAt),
    });
  }

  @Get(':organizationId/cadeia-frio/excursoes')
  listExcursions(
    @Param('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('assetId') assetId?: string,
    @Query('resolved') resolved?: string,
  ) {
    return this.atiService.listExcursions(orgId, user, {
      assetId,
      resolved: resolved === 'true' ? true : resolved === 'false' ? false : undefined,
    });
  }

  @Patch(':organizationId/cadeia-frio/excursoes/:id/resolver')
  resolveExcursion(
    @Param('organizationId') orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: {
      endedAt: string;
      assessment: string;
      decision: string;
      affectedItems?: Record<string, unknown>[];
    },
  ) {
    return this.atiService.resolveExcursion(orgId, user, id, {
      ...body,
      endedAt: new Date(body.endedAt),
    });
  }
}
