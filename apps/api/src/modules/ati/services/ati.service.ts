import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import {
  AssetStatus,
  AssetMaintenanceType,
  AssetMaintenanceStatus,
  Prisma,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Segurança M16 ATI:
// - Equipamento bloqueado/calibração vencida não pode ser reservado quando regra exige
// - Temperatura não é monitorada automaticamente sem sensor configurado
// - Excursão de temperatura exige avaliação humana; não libera nem descarta automaticamente
// - Esterilização segue procedimento aprovado; não substitui validação profissional
// - Rastreabilidade até paciente/procedimento requer acesso restrito

@Injectable()
export class AtiService {
  constructor(private prisma: PrismaService) {}

  private assertAccess(organizationId: string, user: AuthenticatedUser): void {
    if (user.isWalletzAdmin) return;
    if (!user.organizationIds.includes(organizationId)) {
      throw new ForbiddenException('Acesso negado a esta organização.');
    }
  }

  // RF-ATI-001: Listar ativos
  async listAssets(
    organizationId: string,
    user: AuthenticatedUser,
    filters?: { status?: AssetStatus; category?: string; unitId?: string },
  ) {
    this.assertAccess(organizationId, user);
    return this.prisma.asset.findMany({
      where: {
        organizationId,
        status: filters?.status,
        category: filters?.category,
        unitId: filters?.unitId,
        active: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  // RF-ATI-001: Criar ativo
  async createAsset(
    organizationId: string,
    user: AuthenticatedUser,
    dto: {
      tag?: string;
      name: string;
      category?: string;
      manufacturer?: string;
      model?: string;
      serialNumber?: string;
      unitId?: string;
      acquisitionDate?: Date;
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
    this.assertAccess(organizationId, user);
    if (dto.tag) {
      const existing = await this.prisma.asset.findFirst({
        where: { organizationId, tag: dto.tag },
      });
      if (existing) throw new BadRequestException('Tag de ativo já existe nesta organização.');
    }
    return this.prisma.asset.create({
      data: {
        organizationId,
        unitId: dto.unitId,
        tag: dto.tag,
        name: dto.name,
        category: dto.category,
        manufacturer: dto.manufacturer,
        model: dto.model,
        serialNumber: dto.serialNumber,
        acquisitionDate: dto.acquisitionDate,
        acquisitionValue: dto.acquisitionValue ? new Decimal(dto.acquisitionValue) : undefined,
        requiresCalibration: dto.requiresCalibration ?? false,
        calibrationPeriodDays: dto.calibrationPeriodDays,
        requiresSterilization: dto.requiresSterilization ?? false,
        requiresColdChain: dto.requiresColdChain ?? false,
        minTempC: dto.minTempC ? new Decimal(dto.minTempC) : undefined,
        maxTempC: dto.maxTempC ? new Decimal(dto.maxTempC) : undefined,
        notes: dto.notes,
        createdBy: user.sub,
      },
    });
  }

  // RF-ATI-002: Bloquear ativo
  async blockAsset(
    organizationId: string,
    user: AuthenticatedUser,
    assetId: string,
    dto: { reason: string },
  ) {
    this.assertAccess(organizationId, user);
    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, organizationId },
    });
    if (!asset) throw new NotFoundException('Ativo não encontrado.');
    if (asset.status === AssetStatus.BLOQUEADO) {
      throw new BadRequestException('Ativo já está bloqueado.');
    }
    return this.prisma.asset.update({
      where: { id: assetId },
      data: {
        status: AssetStatus.BLOQUEADO,
        blockedReason: dto.reason,
        blockedAt: new Date(),
        blockedBy: user.sub,
      },
    });
  }

  // RF-ATI-002: Liberar ativo bloqueado
  async unblockAsset(organizationId: string, user: AuthenticatedUser, assetId: string) {
    this.assertAccess(organizationId, user);
    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, organizationId },
    });
    if (!asset) throw new NotFoundException('Ativo não encontrado.');
    if (asset.status !== AssetStatus.BLOQUEADO) {
      throw new BadRequestException('Ativo não está bloqueado.');
    }
    return this.prisma.asset.update({
      where: { id: assetId },
      data: {
        status: AssetStatus.DISPONIVEL,
        blockedReason: null,
        blockedAt: null,
        blockedBy: null,
      },
    });
  }

  // RF-ATI-003: Ordens de manutenção — criar
  async createMaintenanceOrder(
    organizationId: string,
    user: AuthenticatedUser,
    dto: {
      assetId: string;
      maintenanceType: AssetMaintenanceType;
      title: string;
      description?: string;
      scheduledAt?: Date;
    },
  ) {
    this.assertAccess(organizationId, user);
    const asset = await this.prisma.asset.findFirst({
      where: { id: dto.assetId, organizationId },
    });
    if (!asset) throw new NotFoundException('Ativo não encontrado.');
    return this.prisma.assetMaintenanceOrder.create({
      data: {
        organizationId,
        assetId: dto.assetId,
        maintenanceType: dto.maintenanceType,
        title: dto.title,
        description: dto.description,
        scheduledAt: dto.scheduledAt,
        requestedBy: user.sub,
      },
    });
  }

  // RF-ATI-003: Ordens de manutenção — listar
  async listMaintenanceOrders(
    organizationId: string,
    user: AuthenticatedUser,
    filters?: { assetId?: string; status?: AssetMaintenanceStatus },
  ) {
    this.assertAccess(organizationId, user);
    return this.prisma.assetMaintenanceOrder.findMany({
      where: { organizationId, assetId: filters?.assetId, status: filters?.status },
      include: { asset: { select: { id: true, name: true, tag: true } } },
      orderBy: { requestedAt: 'desc' },
    });
  }

  // RF-ATI-003: Avançar status da manutenção
  async updateMaintenanceStatus(
    organizationId: string,
    user: AuthenticatedUser,
    orderId: string,
    dto: {
      status: AssetMaintenanceStatus;
      executedBy?: string;
      cost?: number;
      findings?: string;
      nextDueAt?: Date;
    },
  ) {
    this.assertAccess(organizationId, user);
    const order = await this.prisma.assetMaintenanceOrder.findFirst({
      where: { id: orderId, organizationId },
    });
    if (!order) throw new NotFoundException('Ordem de manutenção não encontrada.');
    if (order.status === AssetMaintenanceStatus.CANCELADA) {
      throw new BadRequestException('Ordem cancelada não pode ser atualizada.');
    }
    const data: Prisma.AssetMaintenanceOrderUpdateInput = {
      status: dto.status,
      executedBy: dto.executedBy,
      cost: dto.cost ? new Decimal(dto.cost) : undefined,
      findings: dto.findings,
      nextDueAt: dto.nextDueAt,
    };
    if (dto.status === AssetMaintenanceStatus.APROVADA) {
      data.approvedBy = user.sub;
      data.approvedAt = new Date();
    }
    if (dto.status === AssetMaintenanceStatus.EM_EXECUCAO) {
      data.startedAt = new Date();
      // Bloqueia o ativo durante manutenção
      await this.prisma.asset.update({
        where: { id: order.assetId },
        data: { status: AssetStatus.EM_MANUTENCAO },
      });
    }
    if (dto.status === AssetMaintenanceStatus.CONCLUIDA) {
      data.completedAt = new Date();
      // Libera o ativo após manutenção concluída
      await this.prisma.asset.update({
        where: { id: order.assetId },
        data: {
          status: AssetStatus.DISPONIVEL,
          lastCalibratedAt:
            order.maintenanceType === AssetMaintenanceType.CALIBRACAO ? new Date() : undefined,
        },
      });
    }
    return this.prisma.assetMaintenanceOrder.update({ where: { id: orderId }, data });
  }

  // RF-ATI-004: Ciclos de esterilização
  async createSterilizationCycle(
    organizationId: string,
    user: AuthenticatedUser,
    dto: {
      assetId: string;
      cycleNumber?: string;
      method: string;
      processStart: Date;
      temperature?: number;
      pressure?: number;
      batchItems?: Record<string, unknown>[];
      notes?: string;
    },
  ) {
    this.assertAccess(organizationId, user);
    const asset = await this.prisma.asset.findFirst({
      where: { id: dto.assetId, organizationId },
    });
    if (!asset) throw new NotFoundException('Ativo não encontrado.');
    return this.prisma.assetSterilizationCycle.create({
      data: {
        organizationId,
        assetId: dto.assetId,
        cycleNumber: dto.cycleNumber,
        method: dto.method,
        processStart: dto.processStart,
        temperature: dto.temperature ? new Decimal(dto.temperature) : undefined,
        pressure: dto.pressure ? new Decimal(dto.pressure) : undefined,
        batchItems: dto.batchItems ? (dto.batchItems as Prisma.InputJsonValue) : Prisma.JsonNull,
        operatorId: user.sub,
        notes: dto.notes,
      },
    });
  }

  async validateSterilizationCycle(
    organizationId: string,
    user: AuthenticatedUser,
    cycleId: string,
    dto: { passed: boolean; processEnd: Date; notes?: string },
  ) {
    this.assertAccess(organizationId, user);
    const cycle = await this.prisma.assetSterilizationCycle.findFirst({
      where: { id: cycleId, organizationId },
    });
    if (!cycle) throw new NotFoundException('Ciclo não encontrado.');
    return this.prisma.assetSterilizationCycle.update({
      where: { id: cycleId },
      data: {
        passed: dto.passed,
        processEnd: dto.processEnd,
        validatedBy: user.sub,
        validatedAt: new Date(),
        notes: dto.notes ?? cycle.notes,
      },
    });
  }

  async listSterilizationCycles(
    organizationId: string,
    user: AuthenticatedUser,
    filters?: { assetId?: string; from?: Date; to?: Date },
  ) {
    this.assertAccess(organizationId, user);
    return this.prisma.assetSterilizationCycle.findMany({
      where: {
        organizationId,
        assetId: filters?.assetId,
        processStart: { gte: filters?.from, lte: filters?.to },
      },
      include: { asset: { select: { id: true, name: true, tag: true } } },
      orderBy: { processStart: 'desc' },
      take: 200,
    });
  }

  // RF-ATI-005: Cadeia do frio — registrar leitura (fonte manual ou importação)
  async recordColdChainReading(
    organizationId: string,
    user: AuthenticatedUser,
    dto: {
      assetId: string;
      readingAt: Date;
      temperatureC: number;
      humidityPct?: number;
      source?: string;
    },
  ) {
    this.assertAccess(organizationId, user);
    const asset = await this.prisma.asset.findFirst({
      where: { id: dto.assetId, organizationId, requiresColdChain: true },
    });
    if (!asset) throw new NotFoundException('Ativo não encontrado ou não requer cadeia do frio.');
    const tempC = new Decimal(dto.temperatureC);
    const isExcursion =
      (asset.minTempC !== null && tempC.lessThan(asset.minTempC!)) ||
      (asset.maxTempC !== null && tempC.greaterThan(asset.maxTempC!));
    const log = await this.prisma.assetColdChainLog.create({
      data: {
        organizationId,
        assetId: dto.assetId,
        readingAt: dto.readingAt,
        temperatureC: tempC,
        humidityPct: dto.humidityPct ? new Decimal(dto.humidityPct) : undefined,
        source: dto.source ?? 'MANUAL',
        recordedBy: user.sub,
        isExcursion,
      },
    });
    // Se excursão, cria registro de excursão (exige avaliação humana)
    if (isExcursion) {
      await this.prisma.assetColdChainExcursion.create({
        data: {
          organizationId,
          assetId: dto.assetId,
          startedAt: dto.readingAt,
          minTempC: tempC.lessThan(asset.minTempC ?? 99) ? tempC : null,
          maxTempC: tempC.greaterThan(asset.maxTempC ?? -99) ? tempC : null,
        },
      });
    }
    return log;
  }

  // RF-ATI-005: Resolver excursão de temperatura (decisão humana obrigatória)
  async resolveExcursion(
    organizationId: string,
    user: AuthenticatedUser,
    excursionId: string,
    dto: {
      endedAt: Date;
      assessment: string;
      decision: string; // LIBERAR | QUARENTENA | DESCARTAR
      affectedItems?: Record<string, unknown>[];
    },
  ) {
    this.assertAccess(organizationId, user);
    const excursion = await this.prisma.assetColdChainExcursion.findFirst({
      where: { id: excursionId, organizationId },
    });
    if (!excursion) throw new NotFoundException('Excursão não encontrada.');
    if (excursion.decidedAt) throw new BadRequestException('Excursão já resolvida.');
    return this.prisma.assetColdChainExcursion.update({
      where: { id: excursionId },
      data: {
        endedAt: dto.endedAt,
        assessment: dto.assessment,
        decision: dto.decision,
        decidedBy: user.sub,
        decidedAt: new Date(),
        affectedItems: dto.affectedItems ? (dto.affectedItems as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    });
  }

  async listColdChainLogs(
    organizationId: string,
    user: AuthenticatedUser,
    assetId: string,
    filters?: { from?: Date; to?: Date },
  ) {
    this.assertAccess(organizationId, user);
    return this.prisma.assetColdChainLog.findMany({
      where: {
        organizationId,
        assetId,
        readingAt: { gte: filters?.from, lte: filters?.to },
      },
      orderBy: { readingAt: 'desc' },
      take: 500,
    });
  }

  async listExcursions(
    organizationId: string,
    user: AuthenticatedUser,
    filters?: { assetId?: string; resolved?: boolean },
  ) {
    this.assertAccess(organizationId, user);
    return this.prisma.assetColdChainExcursion.findMany({
      where: {
        organizationId,
        assetId: filters?.assetId,
        decidedAt: filters?.resolved === true ? { not: null } : filters?.resolved === false ? null : undefined,
      },
      orderBy: { startedAt: 'desc' },
    });
  }

  // RF-ATI-006: Dashboard de ativos
  async getDashboard(organizationId: string, user: AuthenticatedUser) {
    this.assertAccess(organizationId, user);
    const [byStatus, pendingCalibration, openMaintenances] = await Promise.all([
      this.prisma.asset.groupBy({
        by: ['status'],
        where: { organizationId, active: true },
        _count: { id: true },
      }),
      this.prisma.asset.count({
        where: {
          organizationId,
          active: true,
          requiresCalibration: true,
          nextCalibrationAt: { lte: new Date() },
        },
      }),
      this.prisma.assetMaintenanceOrder.count({
        where: {
          organizationId,
          status: { in: [AssetMaintenanceStatus.SOLICITADA, AssetMaintenanceStatus.APROVADA, AssetMaintenanceStatus.EM_EXECUCAO] },
        },
      }),
    ]);
    return { byStatus, pendingCalibration, openMaintenances };
  }
}
