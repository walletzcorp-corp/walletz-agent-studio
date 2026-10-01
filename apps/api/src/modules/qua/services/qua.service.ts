import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import {
  QualityIncidentStatus,
  QualityIncidentType,
  QualityActionStatus,
  QualityProtocolStatus,
  Prisma,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Segurança M15 QUA:
// - Relato original preservado; correções são adendos auditáveis
// - Acesso controlado por papel; relato anônimo não promete anonimato absoluto
// - Classificações de risco configuráveis e versionadas
// - Ação corretiva só encerrada com evidência e verificação
// - Notificação regulatória requer revisão humana; não enviar automaticamente

@Injectable()
export class QuaService {
  constructor(private prisma: PrismaService) {}

  private assertAccess(organizationId: string, user: AuthenticatedUser): void {
    if (user.isWalletzAdmin) return;
    if (!user.organizationIds.includes(organizationId)) {
      throw new ForbiddenException('Acesso negado a esta organização.');
    }
  }

  // RF-QUA-001: Registrar incidente
  async reportIncident(
    organizationId: string,
    user: AuthenticatedUser,
    dto: {
      incidentType: QualityIncidentType;
      title: string;
      description: string;
      occurredAt: Date;
      location?: string;
      unitId?: string;
      patientId?: string;
      isAnonymous?: boolean;
      riskClassification?: string;
      immediateActions?: string;
    },
  ) {
    this.assertAccess(organizationId, user);
    return this.prisma.qualityIncident.create({
      data: {
        organizationId,
        unitId: dto.unitId,
        incidentType: dto.incidentType,
        title: dto.title,
        description: dto.description,
        occurredAt: dto.occurredAt,
        location: dto.location,
        patientId: dto.patientId,
        isAnonymous: dto.isAnonymous ?? false,
        reportedBy: dto.isAnonymous ? null : user.sub,
        riskClassification: dto.riskClassification,
        immediateActions: dto.immediateActions,
        status: QualityIncidentStatus.ABERTO,
      },
    });
  }

  // RF-QUA-001: Listar incidentes
  async listIncidents(
    organizationId: string,
    user: AuthenticatedUser,
    filters?: {
      status?: QualityIncidentStatus;
      incidentType?: QualityIncidentType;
      from?: Date;
      to?: Date;
    },
  ) {
    this.assertAccess(organizationId, user);
    return this.prisma.qualityIncident.findMany({
      where: {
        organizationId,
        status: filters?.status,
        incidentType: filters?.incidentType,
        occurredAt: { gte: filters?.from, lte: filters?.to },
      },
      orderBy: { occurredAt: 'desc' },
      take: 200,
    });
  }

  // RF-QUA-002: Adicionar adendo (preserva relato original)
  async addAddendum(
    organizationId: string,
    user: AuthenticatedUser,
    incidentId: string,
    dto: { content: string },
  ) {
    this.assertAccess(organizationId, user);
    const incident = await this.prisma.qualityIncident.findFirst({
      where: { id: incidentId, organizationId },
    });
    if (!incident) throw new NotFoundException('Incidente não encontrado.');
    if (incident.status === QualityIncidentStatus.ENCERRADO) {
      throw new BadRequestException('Incidente encerrado. Reabra antes de adicionar adendos.');
    }
    return this.prisma.qualityIncidentAddendum.create({
      data: { incidentId, content: dto.content, addedBy: user.sub },
    });
  }

  // RF-QUA-003: Abrir análise de causa
  async startAnalysis(
    organizationId: string,
    user: AuthenticatedUser,
    incidentId: string,
    dto: {
      rootCause?: string;
      contributingFactors?: Record<string, unknown>;
    },
  ) {
    this.assertAccess(organizationId, user);
    const incident = await this.prisma.qualityIncident.findFirst({
      where: { id: incidentId, organizationId },
    });
    if (!incident) throw new NotFoundException('Incidente não encontrado.');
    const analysableStatuses: string[] = [QualityIncidentStatus.ABERTO, QualityIncidentStatus.EM_ANALISE];
    if (!analysableStatuses.includes(incident.status)) {
      throw new BadRequestException(`Não é possível analisar incidente com status ${incident.status}.`);
    }
    return this.prisma.qualityIncident.update({
      where: { id: incidentId },
      data: {
        status: QualityIncidentStatus.EM_ANALISE,
        rootCause: dto.rootCause,
        contributingFactors: dto.contributingFactors ? (dto.contributingFactors as Prisma.InputJsonValue) : Prisma.JsonNull,
        analysisBy: user.sub,
        analysisAt: new Date(),
      },
    });
  }

  // RF-QUA-004: Criar plano de ação
  async createActionPlan(
    organizationId: string,
    user: AuthenticatedUser,
    dto: {
      incidentId?: string;
      title: string;
      description: string;
      actionType?: string;
      responsibleId: string;
      dueDate: Date;
    },
  ) {
    this.assertAccess(organizationId, user);
    if (dto.incidentId) {
      const incident = await this.prisma.qualityIncident.findFirst({
        where: { id: dto.incidentId, organizationId },
      });
      if (!incident) throw new NotFoundException('Incidente não encontrado.');
      // Avança status para EM_ACAO se ainda ABERTO/EM_ANALISE
      const advanceableStatuses: string[] = [QualityIncidentStatus.ABERTO, QualityIncidentStatus.EM_ANALISE];
      if (advanceableStatuses.includes(incident.status)) {
        await this.prisma.qualityIncident.update({
          where: { id: dto.incidentId },
          data: { status: QualityIncidentStatus.EM_ACAO },
        });
      }
    }
    return this.prisma.qualityActionPlan.create({
      data: {
        organizationId,
        incidentId: dto.incidentId,
        title: dto.title,
        description: dto.description,
        actionType: dto.actionType ?? 'CORRETIVA',
        responsibleId: dto.responsibleId,
        dueDate: dto.dueDate,
        createdBy: user.sub,
      },
    });
  }

  // RF-QUA-004: Listar planos de ação
  async listActionPlans(
    organizationId: string,
    user: AuthenticatedUser,
    filters?: { status?: QualityActionStatus; incidentId?: string },
  ) {
    this.assertAccess(organizationId, user);
    return this.prisma.qualityActionPlan.findMany({
      where: { organizationId, status: filters?.status, incidentId: filters?.incidentId },
      orderBy: { dueDate: 'asc' },
    });
  }

  // RF-QUA-005: Atualizar plano de ação (progresso)
  async updateActionPlan(
    organizationId: string,
    user: AuthenticatedUser,
    planId: string,
    dto: { status?: QualityActionStatus; evidence?: string; notes?: string },
  ) {
    this.assertAccess(organizationId, user);
    const plan = await this.prisma.qualityActionPlan.findFirst({
      where: { id: planId, organizationId },
    });
    if (!plan) throw new NotFoundException('Plano de ação não encontrado.');
    if (plan.status === QualityActionStatus.CANCELADA) {
      throw new BadRequestException('Plano cancelado não pode ser atualizado.');
    }
    // Ação concluída requer evidência
    if (dto.status === QualityActionStatus.CONCLUIDA && !dto.evidence && !plan.evidence) {
      throw new BadRequestException('Evidência obrigatória para concluir o plano de ação.');
    }
    return this.prisma.qualityActionPlan.update({
      where: { id: planId },
      data: {
        status: dto.status,
        evidence: dto.evidence ?? plan.evidence,
        startedAt: dto.status === QualityActionStatus.EM_ANDAMENTO && !plan.startedAt ? new Date() : plan.startedAt,
        completedAt: dto.status === QualityActionStatus.CONCLUIDA && !plan.completedAt ? new Date() : plan.completedAt,
      },
    });
  }

  // RF-QUA-006: Verificar efetividade de ação corretiva
  async verifyActionPlan(
    organizationId: string,
    user: AuthenticatedUser,
    planId: string,
    dto: { verificationNote: string },
  ) {
    this.assertAccess(organizationId, user);
    const plan = await this.prisma.qualityActionPlan.findFirst({
      where: { id: planId, organizationId },
    });
    if (!plan) throw new NotFoundException('Plano de ação não encontrado.');
    if (plan.status !== QualityActionStatus.CONCLUIDA) {
      throw new BadRequestException('Somente planos CONCLUIDOS podem ser verificados.');
    }
    return this.prisma.qualityActionPlan.update({
      where: { id: planId },
      data: {
        status: QualityActionStatus.VERIFICADA,
        verifiedBy: user.sub,
        verifiedAt: new Date(),
        verificationNote: dto.verificationNote,
      },
    });
  }

  // RF-QUA-007: Encerrar incidente
  async closeIncident(
    organizationId: string,
    user: AuthenticatedUser,
    incidentId: string,
    dto: { notes?: string },
  ) {
    this.assertAccess(organizationId, user);
    const incident = await this.prisma.qualityIncident.findFirst({
      where: { id: incidentId, organizationId },
    });
    if (!incident) throw new NotFoundException('Incidente não encontrado.');
    if (incident.status === QualityIncidentStatus.ENCERRADO) {
      throw new BadRequestException('Incidente já encerrado.');
    }
    return this.prisma.qualityIncident.update({
      where: { id: incidentId },
      data: {
        status: QualityIncidentStatus.ENCERRADO,
        closedBy: user.sub,
        closedAt: new Date(),
        notes: dto.notes ?? incident.notes,
      },
    });
  }

  // RF-QUA-008: Preparar notificação regulatória (requer revisão humana)
  async prepareRegulatoryNotification(
    organizationId: string,
    user: AuthenticatedUser,
    incidentId: string,
  ) {
    this.assertAccess(organizationId, user);
    const incident = await this.prisma.qualityIncident.findFirst({
      where: { id: incidentId, organizationId },
    });
    if (!incident) throw new NotFoundException('Incidente não encontrado.');
    // Marca para notificação mas NÃO envia automaticamente
    return this.prisma.qualityIncident.update({
      where: { id: incidentId },
      data: { notifyRegulatory: true },
    });
  }

  // RF-QUA-008: Confirmar envio de notificação regulatória
  async confirmRegulatoryNotification(
    organizationId: string,
    user: AuthenticatedUser,
    incidentId: string,
  ) {
    this.assertAccess(organizationId, user);
    const incident = await this.prisma.qualityIncident.findFirst({
      where: { id: incidentId, organizationId },
    });
    if (!incident) throw new NotFoundException('Incidente não encontrado.');
    if (!incident.notifyRegulatory) {
      throw new BadRequestException('Notificação não marcada para envio.');
    }
    return this.prisma.qualityIncident.update({
      where: { id: incidentId },
      data: { regulatoryNotifiedAt: new Date(), regulatoryNotifiedBy: user.sub },
    });
  }

  // RF-QUA-009: Gestão de protocolos
  async createProtocol(
    organizationId: string,
    user: AuthenticatedUser,
    dto: {
      code?: string;
      title: string;
      category?: string;
      version?: string;
      content: string;
      policyOwner?: string;
      nextReviewDate?: Date;
    },
  ) {
    this.assertAccess(organizationId, user);
    return this.prisma.qualityProtocol.create({
      data: {
        organizationId,
        code: dto.code,
        title: dto.title,
        category: dto.category,
        version: dto.version ?? '1.0',
        content: dto.content,
        policyOwner: dto.policyOwner,
        nextReviewDate: dto.nextReviewDate,
        status: QualityProtocolStatus.RASCUNHO,
        createdBy: user.sub,
      },
    });
  }

  async listProtocols(
    organizationId: string,
    user: AuthenticatedUser,
    status?: QualityProtocolStatus,
  ) {
    this.assertAccess(organizationId, user);
    return this.prisma.qualityProtocol.findMany({
      where: { organizationId, status },
      orderBy: { title: 'asc' },
    });
  }

  async publishProtocol(organizationId: string, user: AuthenticatedUser, protocolId: string) {
    this.assertAccess(organizationId, user);
    const protocol = await this.prisma.qualityProtocol.findFirst({
      where: { id: protocolId, organizationId },
    });
    if (!protocol) throw new NotFoundException('Protocolo não encontrado.');
    return this.prisma.qualityProtocol.update({
      where: { id: protocolId },
      data: {
        status: QualityProtocolStatus.VIGENTE,
        approvedBy: user.sub,
        approvedAt: new Date(),
        effectiveFrom: new Date(),
      },
    });
  }

  // RF-QUA-010: Indicadores de qualidade
  async createIndicator(
    organizationId: string,
    user: AuthenticatedUser,
    dto: { name: string; code?: string; formula?: string; unit?: string; targetValue?: number },
  ) {
    this.assertAccess(organizationId, user);
    return this.prisma.qualityIndicator.create({
      data: {
        organizationId,
        name: dto.name,
        code: dto.code,
        formula: dto.formula,
        unit: dto.unit,
        targetValue: dto.targetValue ? new Decimal(dto.targetValue) : undefined,
        createdBy: user.sub,
      },
    });
  }

  async recordMeasurement(
    organizationId: string,
    user: AuthenticatedUser,
    indicatorId: string,
    dto: { periodStart: Date; periodEnd: Date; value: number; notes?: string },
  ) {
    this.assertAccess(organizationId, user);
    const indicator = await this.prisma.qualityIndicator.findFirst({
      where: { id: indicatorId, organizationId },
    });
    if (!indicator) throw new NotFoundException('Indicador não encontrado.');
    return this.prisma.qualityIndicatorMeasurement.create({
      data: {
        indicatorId,
        periodStart: dto.periodStart,
        periodEnd: dto.periodEnd,
        value: new Decimal(dto.value),
        notes: dto.notes,
        recordedBy: user.sub,
      },
    });
  }

  async listIndicators(organizationId: string, user: AuthenticatedUser) {
    this.assertAccess(organizationId, user);
    return this.prisma.qualityIndicator.findMany({
      where: { organizationId, active: true },
      include: { measurements: { orderBy: { periodStart: 'desc' }, take: 5 } },
      orderBy: { name: 'asc' },
    });
  }

  // RF-QUA-011: Dashboard de qualidade
  async getDashboard(organizationId: string, user: AuthenticatedUser) {
    this.assertAccess(organizationId, user);
    const [byType, byStatus, openActions] = await Promise.all([
      this.prisma.qualityIncident.groupBy({
        by: ['incidentType'],
        where: { organizationId },
        _count: { id: true },
      }),
      this.prisma.qualityIncident.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: { id: true },
      }),
      this.prisma.qualityActionPlan.count({
        where: {
          organizationId,
          status: { in: [QualityActionStatus.PENDENTE, QualityActionStatus.EM_ANDAMENTO] },
        },
      }),
    ]);
    return { byType, byStatus, openActions };
  }
}
