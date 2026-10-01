import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  MigJobStatus,
  MigTicketStatus,
  MigTicketPriority,
  Prisma,
} from '@prisma/client';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';

@Injectable()
export class MigService {
  constructor(private readonly prisma: PrismaService) {}

  private assertAccess(organizationId: string, user: AuthenticatedUser) {
    if (user.isWalletzAdmin) return;
    if (!user.organizationIds.includes(organizationId)) {
      throw new ForbiddenException('Acesso negado à organização');
    }
  }

  // ── RF-MIG-001/002/003/004: Jobs de migração ────────────────────────────────

  async createJob(
    organizationId: string,
    user: AuthenticatedUser,
    data: { name: string; sourceFormat: string; targetModule: string; mapping?: Record<string, unknown>; notes?: string },
  ) {
    this.assertAccess(organizationId, user);
    return this.prisma.migJob.create({
      data: {
        organizationId,
        name: data.name,
        sourceFormat: data.sourceFormat,
        targetModule: data.targetModule,
        mapping: (data.mapping ?? {}) as Prisma.InputJsonValue,
        notes: data.notes,
        createdBy: user.sub,
      },
    });
  }

  async listJobs(
    organizationId: string,
    user: AuthenticatedUser,
    filters?: { status?: MigJobStatus; targetModule?: string },
  ) {
    this.assertAccess(organizationId, user);
    return this.prisma.migJob.findMany({
      where: { organizationId, ...filters },
      orderBy: { createdAt: 'desc' },
    });
  }

  async validateJob(
    organizationId: string,
    user: AuthenticatedUser,
    jobId: string,
    data: {
      totalRows: number;
      validRows: number;
      rejectedRows: number;
      duplicateRows: number;
      inputHash: string;
      rejectionReport?: Record<string, unknown>;
    },
  ) {
    this.assertAccess(organizationId, user);
    const job = await this.prisma.migJob.findFirst({ where: { id: jobId, organizationId } });
    if (!job) throw new NotFoundException('Job não encontrado');
    if (job.status !== MigJobStatus.RASCUNHO && job.status !== MigJobStatus.VALIDANDO) {
      throw new BadRequestException('Job não pode ser validado neste estado');
    }
    return this.prisma.migJob.update({
      where: { id: jobId },
      data: {
        status: MigJobStatus.VALIDADO,
        totalRows: data.totalRows,
        validRows: data.validRows,
        rejectedRows: data.rejectedRows,
        duplicateRows: data.duplicateRows,
        inputHash: data.inputHash,
        rejectionReport: data.rejectionReport ? (data.rejectionReport as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    });
  }

  // ── RF-MIG-005: Carga piloto, aprovação e rollback ─────────────────────────

  async approveJob(
    organizationId: string,
    user: AuthenticatedUser,
    jobId: string,
  ) {
    this.assertAccess(organizationId, user);
    const job = await this.prisma.migJob.findFirst({ where: { id: jobId, organizationId } });
    if (!job) throw new NotFoundException('Job não encontrado');
    if (job.status !== MigJobStatus.VALIDADO && job.status !== MigJobStatus.PILOTO) {
      throw new BadRequestException('Job precisa estar validado ou em piloto para ser aprovado');
    }
    return this.prisma.migJob.update({
      where: { id: jobId },
      data: { status: MigJobStatus.APROVADO, approvedBy: user.sub, approvedAt: new Date() },
    });
  }

  async executeJob(
    organizationId: string,
    user: AuthenticatedUser,
    jobId: string,
  ) {
    this.assertAccess(organizationId, user);
    const job = await this.prisma.migJob.findFirst({ where: { id: jobId, organizationId } });
    if (!job) throw new NotFoundException('Job não encontrado');
    if (job.status !== MigJobStatus.APROVADO) {
      throw new BadRequestException('Job precisa estar aprovado para execução');
    }
    return this.prisma.migJob.update({
      where: { id: jobId },
      data: { status: MigJobStatus.EXECUTANDO, rollbackAvailable: true },
    });
  }

  async formalAccept(
    organizationId: string,
    user: AuthenticatedUser,
    jobId: string,
  ) {
    this.assertAccess(organizationId, user);
    const job = await this.prisma.migJob.findFirst({ where: { id: jobId, organizationId } });
    if (!job) throw new NotFoundException('Job não encontrado');
    if (job.status !== MigJobStatus.EXECUTANDO && job.status !== MigJobStatus.CONCLUIDO) {
      throw new BadRequestException('Job precisa ter sido executado para aceite formal');
    }
    return this.prisma.migJob.update({
      where: { id: jobId },
      data: { status: MigJobStatus.CONCLUIDO, formalAcceptedAt: new Date() },
    });
  }

  async rollbackJob(
    organizationId: string,
    user: AuthenticatedUser,
    jobId: string,
    data: { notes?: string },
  ) {
    this.assertAccess(organizationId, user);
    const job = await this.prisma.migJob.findFirst({ where: { id: jobId, organizationId } });
    if (!job) throw new NotFoundException('Job não encontrado');
    if (!job.rollbackAvailable) throw new BadRequestException('Rollback não disponível para este job');
    const finalStates: string[] = [MigJobStatus.CONCLUIDO, MigJobStatus.CANCELADO, MigJobStatus.REVERTIDO];
    if (finalStates.includes(job.status)) throw new BadRequestException('Job já finalizado');
    return this.prisma.migJob.update({
      where: { id: jobId },
      data: { status: MigJobStatus.REVERTIDO, notes: data.notes, rollbackAvailable: false },
    });
  }

  // ── RF-MIG-008: Health score ────────────────────────────────────────────────

  async recordHealthScore(
    organizationId: string,
    user: AuthenticatedUser,
    data: {
      scoreDate: Date;
      implantationScore: number;
      adoptionScore: number;
      securityScore: number;
      operationScore: number;
      criteria: Record<string, unknown>;
    },
  ) {
    this.assertAccess(organizationId, user);
    const overallScore = Math.round(
      (data.implantationScore + data.adoptionScore + data.securityScore + data.operationScore) / 4,
    );
    return this.prisma.migHealthScore.upsert({
      where: { organizationId_scoreDate: { organizationId, scoreDate: data.scoreDate } },
      create: {
        organizationId,
        scoreDate: data.scoreDate,
        implantationScore: data.implantationScore,
        adoptionScore: data.adoptionScore,
        securityScore: data.securityScore,
        operationScore: data.operationScore,
        overallScore,
        criteria: data.criteria as Prisma.InputJsonValue,
        calculatedBy: user.sub,
      },
      update: {
        implantationScore: data.implantationScore,
        adoptionScore: data.adoptionScore,
        securityScore: data.securityScore,
        operationScore: data.operationScore,
        overallScore,
        criteria: data.criteria as Prisma.InputJsonValue,
        calculatedBy: user.sub,
      },
    });
  }

  async listHealthScores(organizationId: string, user: AuthenticatedUser) {
    this.assertAccess(organizationId, user);
    return this.prisma.migHealthScore.findMany({
      where: { organizationId },
      orderBy: { scoreDate: 'desc' },
      take: 30,
    });
  }

  // ── RF-MIG-009: Tickets de suporte ─────────────────────────────────────────

  async createTicket(
    organizationId: string,
    user: AuthenticatedUser,
    data: { title: string; description: string; priority?: MigTicketPriority; category?: string; slaDeadline?: Date },
  ) {
    this.assertAccess(organizationId, user);
    return this.prisma.migTicket.create({
      data: {
        organizationId,
        title: data.title,
        description: data.description,
        priority: data.priority ?? MigTicketPriority.MEDIA,
        category: data.category,
        slaDeadline: data.slaDeadline,
        createdBy: user.sub,
      },
    });
  }

  async listTickets(
    organizationId: string,
    user: AuthenticatedUser,
    filters?: { status?: MigTicketStatus; priority?: MigTicketPriority },
  ) {
    this.assertAccess(organizationId, user);
    return this.prisma.migTicket.findMany({
      where: { organizationId, ...filters },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async updateTicketStatus(
    organizationId: string,
    user: AuthenticatedUser,
    ticketId: string,
    data: { status: MigTicketStatus; resolutionNote?: string; assignedTo?: string },
  ) {
    this.assertAccess(organizationId, user);
    const ticket = await this.prisma.migTicket.findFirst({ where: { id: ticketId, organizationId } });
    if (!ticket) throw new NotFoundException('Ticket não encontrado');
    if (ticket.status === MigTicketStatus.FECHADO) {
      throw new BadRequestException('Ticket já fechado');
    }

    const timestamps: Record<string, Date | undefined> = {};
    if (data.status === MigTicketStatus.RESOLVIDO) timestamps.resolvedAt = new Date();
    if (data.status === MigTicketStatus.FECHADO) timestamps.closedAt = new Date();

    return this.prisma.migTicket.update({
      where: { id: ticketId },
      data: { status: data.status, resolutionNote: data.resolutionNote, assignedTo: data.assignedTo, ...timestamps },
    });
  }

  // ── RF-MIG-010: Acesso de suporte temporário ────────────────────────────────

  async grantTemporaryAccess(
    organizationId: string,
    user: AuthenticatedUser,
    data: { grantedTo: string; scope: string; reason: string; expiresAt: Date; maskingEnabled?: boolean },
  ) {
    this.assertAccess(organizationId, user);
    if (data.expiresAt <= new Date()) {
      throw new BadRequestException('Data de expiração deve ser no futuro');
    }
    return this.prisma.migAccessGrant.create({
      data: {
        organizationId,
        grantedTo: data.grantedTo,
        scope: data.scope,
        reason: data.reason,
        expiresAt: data.expiresAt,
        maskingEnabled: data.maskingEnabled ?? true,
        approvedBy: user.sub,
        createdBy: user.sub,
        auditLog: [{ action: 'GRANTED', by: user.sub, at: new Date().toISOString() }] as Prisma.InputJsonValue,
      },
    });
  }

  async revokeAccess(
    organizationId: string,
    user: AuthenticatedUser,
    grantId: string,
  ) {
    this.assertAccess(organizationId, user);
    const grant = await this.prisma.migAccessGrant.findFirst({ where: { id: grantId, organizationId } });
    if (!grant) throw new NotFoundException('Acesso não encontrado');
    if (grant.revokedAt) throw new BadRequestException('Acesso já revogado');

    const existingLog = Array.isArray(grant.auditLog) ? grant.auditLog : [];
    return this.prisma.migAccessGrant.update({
      where: { id: grantId },
      data: {
        revokedAt: new Date(),
        revokedBy: user.sub,
        auditLog: [...existingLog, { action: 'REVOKED', by: user.sub, at: new Date().toISOString() }] as Prisma.InputJsonValue,
      },
    });
  }

  async listActiveGrants(organizationId: string, user: AuthenticatedUser) {
    this.assertAccess(organizationId, user);
    return this.prisma.migAccessGrant.findMany({
      where: { organizationId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { expiresAt: 'asc' },
    });
  }

  // ── RF-MIG-006: Onboarding ──────────────────────────────────────────────────

  async upsertOnboarding(
    organizationId: string,
    user: AuthenticatedUser,
    data: { orgSize?: string; specialty?: string; checklistItems?: unknown[]; completedItems?: unknown[] },
  ) {
    this.assertAccess(organizationId, user);
    return this.prisma.migOnboardingConfig.upsert({
      where: { organizationId },
      create: {
        organizationId,
        orgSize: data.orgSize,
        specialty: data.specialty,
        checklistItems: (data.checklistItems ?? []) as Prisma.InputJsonValue,
        completedItems: (data.completedItems ?? []) as Prisma.InputJsonValue,
        createdBy: user.sub,
      },
      update: {
        orgSize: data.orgSize,
        specialty: data.specialty,
        checklistItems: data.checklistItems ? (data.checklistItems as Prisma.InputJsonValue) : undefined,
        completedItems: data.completedItems ? (data.completedItems as Prisma.InputJsonValue) : undefined,
      },
    });
  }

  // ── Dashboard ───────────────────────────────────────────────────────────────

  async getDashboard(organizationId: string, user: AuthenticatedUser) {
    this.assertAccess(organizationId, user);
    const [totalJobs, activeJobs, openTickets, criticalTickets, activeGrants] = await Promise.all([
      this.prisma.migJob.count({ where: { organizationId } }),
      this.prisma.migJob.count({ where: { organizationId, status: { notIn: [MigJobStatus.CONCLUIDO, MigJobStatus.CANCELADO, MigJobStatus.REVERTIDO] } } }),
      this.prisma.migTicket.count({ where: { organizationId, status: { notIn: [MigTicketStatus.RESOLVIDO, MigTicketStatus.FECHADO] } } }),
      this.prisma.migTicket.count({ where: { organizationId, priority: MigTicketPriority.CRITICA, status: { notIn: [MigTicketStatus.RESOLVIDO, MigTicketStatus.FECHADO] } } }),
      this.prisma.migAccessGrant.count({ where: { organizationId, revokedAt: null, expiresAt: { gt: new Date() } } }),
    ]);
    return { totalJobs, activeJobs, openTickets, criticalTickets, activeGrants };
  }
}
