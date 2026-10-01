import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { AiRiskLevel, AiDraftStatus, Prisma } from '@prisma/client';

// IA é apoio; não substitui decisão clínica, não assina, não prescreve e não finaliza prontuário autonomamente.
// Todo conteúdo gerado para uso clínico deve ser rascunho até revisão humana explícita.
// Não fabrique fontes, dados clínicos, exames, citações ou grau de certeza.

@Injectable()
export class IaService {
  constructor(private prisma: PrismaService) {}

  private assertAccess(organizationId: string, user: AuthenticatedUser): void {
    if (user.isWalletzAdmin) return;
    if (!user.organizationIds.includes(organizationId)) {
      throw new ForbiddenException('Acesso negado a esta organização.');
    }
  }

  // RF-IA-001: Listar configurações de IA por organização
  async listConfigs(organizationId: string, user: AuthenticatedUser) {
    this.assertAccess(organizationId, user);
    return this.prisma.aiConfig.findMany({
      where: { organizationId },
      orderBy: { useCase: 'asc' },
    });
  }

  // RF-IA-002: Criar/atualizar configuração de caso de uso
  async upsertConfig(
    organizationId: string,
    dto: {
      useCase: string;
      enabled?: boolean;
      provider?: string;
      modelId?: string;
      riskLevel?: AiRiskLevel;
      riskClassification: string;
      purpose: string;
      limitations?: string;
      validatedPopulation?: string;
      scientificRef?: string;
      requiresConsent?: boolean;
      allowedSpecialties?: string[];
    },
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);
    return this.prisma.aiConfig.upsert({
      where: { organizationId_useCase: { organizationId, useCase: dto.useCase } },
      create: {
        organizationId,
        useCase: dto.useCase,
        enabled: dto.enabled ?? false,
        provider: dto.provider ?? 'simulated',
        modelId: dto.modelId,
        riskLevel: dto.riskLevel ?? AiRiskLevel.MEDIO,
        riskClassification: dto.riskClassification,
        purpose: dto.purpose,
        limitations: dto.limitations,
        validatedPopulation: dto.validatedPopulation,
        scientificRef: dto.scientificRef,
        requiresConsent: dto.requiresConsent ?? true,
        allowedSpecialties: dto.allowedSpecialties ?? [],
        updatedBy: user.sub,
      },
      update: {
        enabled: dto.enabled,
        provider: dto.provider,
        modelId: dto.modelId,
        riskLevel: dto.riskLevel,
        riskClassification: dto.riskClassification,
        purpose: dto.purpose,
        limitations: dto.limitations,
        validatedPopulation: dto.validatedPopulation,
        scientificRef: dto.scientificRef,
        requiresConsent: dto.requiresConsent,
        allowedSpecialties: dto.allowedSpecialties,
        updatedBy: user.sub,
        approvedBy: null,
        approvedAt: null,
      },
    });
  }

  // RF-IA-003: Aprovar configuração de IA (exige papel específico)
  async approveConfig(
    organizationId: string,
    useCase: string,
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);
    const config = await this.prisma.aiConfig.findUnique({
      where: { organizationId_useCase: { organizationId, useCase } },
    });
    if (!config) throw new NotFoundException('Configuração de IA não encontrada.');
    return this.prisma.aiConfig.update({
      where: { id: config.id },
      data: { approvedBy: user.sub, approvedAt: new Date() },
    });
  }

  // RF-IA-004: Desativar caso de uso de IA por organização
  async disableConfig(
    organizationId: string,
    useCase: string,
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);
    const config = await this.prisma.aiConfig.findUnique({
      where: { organizationId_useCase: { organizationId, useCase } },
    });
    if (!config) throw new NotFoundException('Configuração de IA não encontrada.');
    return this.prisma.aiConfig.update({
      where: { id: config.id },
      data: { enabled: false, updatedBy: user.sub },
    });
  }

  // RF-IA-005: Gerar rascunho (SEMPRE simulado — provider padrão = 'simulated')
  // Nenhuma chamada a API externa é feita sem configuração real validada.
  async generateDraft(
    organizationId: string,
    dto: {
      useCase: string;
      patientId?: string;
      entryId?: string;
      inputSummary: string;
      context?: Record<string, unknown>;
    },
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);

    const config = await this.prisma.aiConfig.findUnique({
      where: { organizationId_useCase: { organizationId, useCase: dto.useCase } },
    });
    if (!config) throw new NotFoundException('Caso de uso de IA não configurado.');
    if (!config.enabled) {
      throw new BadRequestException(`Caso de uso '${dto.useCase}' está desativado para esta organização.`);
    }

    // Simulação: gera rascunho com conteúdo placeholder claramente marcado
    const simulatedOutput = {
      _notice: 'SIMULAÇÃO — Este conteúdo não foi gerado por IA real e não deve ser usado clinicamente.',
      useCase: dto.useCase,
      draft: `[RASCUNHO SIMULADO] Sugestão para: ${dto.inputSummary.substring(0, 100)}`,
      disclaimer: 'IA é apoio; não substitui decisão clínica. Revise antes de usar.',
    };

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    return this.prisma.$transaction(async (tx) => {
      const draft = await tx.aiDraft.create({
        data: {
          organizationId,
          patientId: dto.patientId,
          entryId: dto.entryId,
          useCase: dto.useCase,
          status: AiDraftStatus.PENDENTE,
          inputSummary: dto.inputSummary,
          output: simulatedOutput,
          sources: Prisma.JsonNull,
          modelId: config.modelId ?? 'simulated',
          modelVersion: config.modelVersion ?? '0.0.0-sim',
          promptVersion: config.promptVersion,
          expiresAt,
          createdBy: user.sub,
        },
      });

      await tx.aiUsageLog.create({
        data: {
          organizationId,
          userId: user.sub,
          useCase: dto.useCase,
          draftId: draft.id,
          action: 'generate',
          modelId: draft.modelId,
        },
      });

      return draft;
    });
  }

  // RF-IA-006: Listar rascunhos pendentes de revisão
  async listPendingDrafts(
    organizationId: string,
    user: AuthenticatedUser,
    filters?: { useCase?: string; patientId?: string },
  ) {
    this.assertAccess(organizationId, user);
    return this.prisma.aiDraft.findMany({
      where: {
        organizationId,
        status: AiDraftStatus.PENDENTE,
        useCase: filters?.useCase,
        patientId: filters?.patientId,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // RF-IA-007: Revisor humano aceita rascunho
  async acceptDraft(
    organizationId: string,
    draftId: string,
    reviewNotes: string | undefined,
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);
    const draft = await this.prisma.aiDraft.findFirst({
      where: { id: draftId, organizationId },
    });
    if (!draft) throw new NotFoundException('Rascunho não encontrado.');
    if (draft.status !== AiDraftStatus.PENDENTE) {
      throw new BadRequestException('Apenas rascunhos pendentes podem ser aceitos.');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.aiDraft.update({
        where: { id: draftId },
        data: {
          status: AiDraftStatus.ACEITO,
          reviewedBy: user.sub,
          reviewedAt: new Date(),
          reviewNotes,
        },
      });

      await tx.aiUsageLog.create({
        data: {
          organizationId,
          userId: user.sub,
          useCase: draft.useCase,
          draftId: draft.id,
          action: 'accept',
        },
      });

      return updated;
    });
  }

  // RF-IA-008: Revisor humano rejeita rascunho
  async rejectDraft(
    organizationId: string,
    draftId: string,
    reviewNotes: string,
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);
    const draft = await this.prisma.aiDraft.findFirst({
      where: { id: draftId, organizationId },
    });
    if (!draft) throw new NotFoundException('Rascunho não encontrado.');
    if (draft.status !== AiDraftStatus.PENDENTE) {
      throw new BadRequestException('Apenas rascunhos pendentes podem ser rejeitados.');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.aiDraft.update({
        where: { id: draftId },
        data: {
          status: AiDraftStatus.REJEITADO,
          reviewedBy: user.sub,
          reviewedAt: new Date(),
          reviewNotes,
        },
      });

      await tx.aiUsageLog.create({
        data: {
          organizationId,
          userId: user.sub,
          useCase: draft.useCase,
          draftId: draft.id,
          action: 'reject',
        },
      });

      return updated;
    });
  }

  // RF-IA-009: Expirar rascunhos vencidos
  async expireOldDrafts(organizationId: string, user: AuthenticatedUser) {
    this.assertAccess(organizationId, user);
    const now = new Date();
    return this.prisma.aiDraft.updateMany({
      where: {
        organizationId,
        status: AiDraftStatus.PENDENTE,
        expiresAt: { lt: now },
      },
      data: { status: AiDraftStatus.EXPIRADO },
    });
  }

  // RF-IA-010: Registrar métrica de qualidade
  async recordQualityMetric(
    organizationId: string,
    dto: {
      useCase: string;
      modelId: string;
      periodStart: Date;
      periodEnd: Date;
      totalRequests: number;
      acceptedCount: number;
      rejectedCount: number;
      avgLatencyMs?: number;
      errorCount?: number;
      driftDetected?: boolean;
      incidentCount?: number;
      notes?: string;
    },
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);
    return this.prisma.aiQualityMetric.create({
      data: {
        organizationId,
        useCase: dto.useCase,
        modelId: dto.modelId,
        periodStart: dto.periodStart,
        periodEnd: dto.periodEnd,
        totalRequests: dto.totalRequests,
        acceptedCount: dto.acceptedCount,
        rejectedCount: dto.rejectedCount,
        avgLatencyMs: dto.avgLatencyMs,
        errorCount: dto.errorCount ?? 0,
        driftDetected: dto.driftDetected ?? false,
        incidentCount: dto.incidentCount ?? 0,
        notes: dto.notes,
        recordedBy: user.sub,
      },
    });
  }

  // RF-IA-011: Listar métricas de qualidade
  async listQualityMetrics(
    organizationId: string,
    user: AuthenticatedUser,
    filters?: { useCase?: string },
  ) {
    this.assertAccess(organizationId, user);
    return this.prisma.aiQualityMetric.findMany({
      where: { organizationId, useCase: filters?.useCase },
      orderBy: { periodStart: 'desc' },
    });
  }

  // RF-IA-012: Listar logs de uso
  async listUsageLogs(
    organizationId: string,
    user: AuthenticatedUser,
    filters?: { useCase?: string },
  ) {
    this.assertAccess(organizationId, user);
    return this.prisma.aiUsageLog.findMany({
      where: { organizationId, useCase: filters?.useCase },
      orderBy: { occurredAt: 'desc' },
      take: 200,
    });
  }
}
