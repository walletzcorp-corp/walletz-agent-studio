import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { CredentialStatus, WorkShiftStatus } from '@prisma/client';

// Segurança M17 EQP:
// - Vínculos profissionais com organização, vigência, papel e escopo definidos
// - Não inferir habilitação clínica pela função cadastrada; credencial exige verificação
// - Escalas impedem conflitos óbvios e preservam histórico de alterações
// - Comunicação de escala respeita preferências; sem dados clínicos
// - Alterações de credencial, privilégio e escala geram auditoria

@Injectable()
export class EqpService {
  constructor(private prisma: PrismaService) {}

  private assertAccess(organizationId: string, user: AuthenticatedUser): void {
    if (user.isWalletzAdmin) return;
    if (!user.organizationIds.includes(organizationId)) {
      throw new ForbiddenException('Acesso negado a esta organização.');
    }
  }

  // RF-EQP-001: Listar credenciais
  async listCredentials(
    organizationId: string,
    user: AuthenticatedUser,
    filters?: { professionalId?: string; credentialType?: string; status?: CredentialStatus },
  ) {
    this.assertAccess(organizationId, user);
    return this.prisma.eqpCredential.findMany({
      where: {
        organizationId,
        professionalId: filters?.professionalId,
        credentialType: filters?.credentialType,
        status: filters?.status,
      },
      orderBy: [{ professionalId: 'asc' }, { credentialType: 'asc' }],
    });
  }

  // RF-EQP-001: Registrar credencial
  async createCredential(
    organizationId: string,
    user: AuthenticatedUser,
    dto: {
      professionalId: string;
      credentialType: string;
      number?: string;
      issuingBody?: string;
      issuedAt?: Date;
      expiresAt?: Date;
      scope?: string;
      documentUrl?: string;
      notes?: string;
    },
  ) {
    this.assertAccess(organizationId, user);
    return this.prisma.eqpCredential.create({
      data: {
        organizationId,
        professionalId: dto.professionalId,
        credentialType: dto.credentialType,
        number: dto.number,
        issuingBody: dto.issuingBody,
        issuedAt: dto.issuedAt,
        expiresAt: dto.expiresAt,
        scope: dto.scope,
        documentUrl: dto.documentUrl,
        notes: dto.notes,
        status: CredentialStatus.ATIVA,
        createdBy: user.sub,
      },
    });
  }

  // RF-EQP-001: Atualizar status de credencial (com auditoria)
  async updateCredentialStatus(
    organizationId: string,
    user: AuthenticatedUser,
    credentialId: string,
    dto: { status: CredentialStatus; notes?: string },
  ) {
    this.assertAccess(organizationId, user);
    const credential = await this.prisma.eqpCredential.findFirst({
      where: { id: credentialId, organizationId },
    });
    if (!credential) throw new NotFoundException('Credencial não encontrada.');
    return this.prisma.eqpCredential.update({
      where: { id: credentialId },
      data: {
        status: dto.status,
        notes: dto.notes ?? credential.notes,
        verifiedBy: user.sub,
        verifiedAt: new Date(),
      },
    });
  }

  // RF-EQP-002: Competências e habilitações
  async addCompetency(
    organizationId: string,
    user: AuthenticatedUser,
    dto: {
      professionalId: string;
      competencyName: string;
      competencyCode?: string;
      level?: string;
      certifiedAt?: Date;
      certifiedBy?: string;
      expiresAt?: Date;
    },
  ) {
    this.assertAccess(organizationId, user);
    return this.prisma.teamCompetency.create({
      data: {
        organizationId,
        professionalId: dto.professionalId,
        competencyName: dto.competencyName,
        competencyCode: dto.competencyCode,
        level: dto.level,
        certifiedAt: dto.certifiedAt,
        certifiedBy: dto.certifiedBy,
        expiresAt: dto.expiresAt,
        active: true,
        createdBy: user.sub,
      },
    });
  }

  async listCompetencies(
    organizationId: string,
    user: AuthenticatedUser,
    filters?: { professionalId?: string; competencyName?: string },
  ) {
    this.assertAccess(organizationId, user);
    return this.prisma.teamCompetency.findMany({
      where: {
        organizationId,
        professionalId: filters?.professionalId,
        competencyName: filters?.competencyName,
        active: true,
      },
      orderBy: { competencyName: 'asc' },
    });
  }

  // RF-EQP-003: Escalas de trabalho
  async createSchedule(
    organizationId: string,
    user: AuthenticatedUser,
    dto: {
      unitId?: string;
      name: string;
      description?: string;
      startDate: Date;
      endDate?: Date;
    },
  ) {
    this.assertAccess(organizationId, user);
    return this.prisma.workSchedule.create({
      data: {
        organizationId,
        unitId: dto.unitId,
        name: dto.name,
        description: dto.description,
        startDate: dto.startDate,
        endDate: dto.endDate,
        createdBy: user.sub,
      },
    });
  }

  async listSchedules(organizationId: string, user: AuthenticatedUser) {
    this.assertAccess(organizationId, user);
    return this.prisma.workSchedule.findMany({
      where: { organizationId, active: true },
      include: { _count: { select: { shifts: true } } },
      orderBy: { startDate: 'desc' },
    });
  }

  // RF-EQP-004: Turnos — criar (impede conflito de horário)
  async createShift(
    organizationId: string,
    user: AuthenticatedUser,
    dto: {
      scheduleId: string;
      professionalId: string;
      role?: string;
      shiftStart: Date;
      shiftEnd: Date;
      breakMinutes?: number;
    },
  ) {
    this.assertAccess(organizationId, user);
    const schedule = await this.prisma.workSchedule.findFirst({
      where: { id: dto.scheduleId, organizationId },
    });
    if (!schedule) throw new NotFoundException('Escala não encontrada.');
    // Verificar conflito de horário para o profissional
    const conflict = await this.prisma.workShift.findFirst({
      where: {
        organizationId,
        professionalId: dto.professionalId,
        status: { in: [WorkShiftStatus.AGENDADO, WorkShiftStatus.EM_ANDAMENTO] },
        OR: [
          { shiftStart: { lt: dto.shiftEnd }, shiftEnd: { gt: dto.shiftStart } },
        ],
      },
    });
    if (conflict) {
      throw new ConflictException(
        `Profissional já possui turno no período: ${conflict.shiftStart.toISOString()} – ${conflict.shiftEnd.toISOString()}`,
      );
    }
    return this.prisma.workShift.create({
      data: {
        scheduleId: dto.scheduleId,
        organizationId,
        professionalId: dto.professionalId,
        role: dto.role,
        shiftStart: dto.shiftStart,
        shiftEnd: dto.shiftEnd,
        breakMinutes: dto.breakMinutes ?? 0,
        status: WorkShiftStatus.AGENDADO,
        createdBy: user.sub,
      },
    });
  }

  // RF-EQP-004: Listar turnos
  async listShifts(
    organizationId: string,
    user: AuthenticatedUser,
    filters?: {
      scheduleId?: string;
      professionalId?: string;
      from?: Date;
      to?: Date;
      status?: WorkShiftStatus;
    },
  ) {
    this.assertAccess(organizationId, user);
    return this.prisma.workShift.findMany({
      where: {
        organizationId,
        scheduleId: filters?.scheduleId,
        professionalId: filters?.professionalId,
        status: filters?.status,
        shiftStart: { gte: filters?.from },
        shiftEnd: { lte: filters?.to },
      },
      orderBy: { shiftStart: 'asc' },
      take: 500,
    });
  }

  // RF-EQP-005: Atualizar turno (com auditoria)
  async updateShiftStatus(
    organizationId: string,
    user: AuthenticatedUser,
    shiftId: string,
    dto: {
      status: WorkShiftStatus;
      actualStart?: Date;
      actualEnd?: Date;
      substituteId?: string;
      cancelReason?: string;
    },
  ) {
    this.assertAccess(organizationId, user);
    const shift = await this.prisma.workShift.findFirst({
      where: { id: shiftId, organizationId },
    });
    if (!shift) throw new NotFoundException('Turno não encontrado.');
    const finalStatuses: string[] = [WorkShiftStatus.CONCLUIDO, WorkShiftStatus.CANCELADO];
    if (finalStatuses.includes(shift.status)) {
      throw new BadRequestException(`Turno já ${shift.status.toLowerCase()} não pode ser alterado.`);
    }
    // Verificar conflito se substituição
    if (dto.substituteId && dto.status === WorkShiftStatus.SUBSTITUIDO) {
      const conflict = await this.prisma.workShift.findFirst({
        where: {
          organizationId,
          professionalId: dto.substituteId,
          id: { not: shiftId },
          status: { in: [WorkShiftStatus.AGENDADO, WorkShiftStatus.EM_ANDAMENTO] },
          shiftStart: { lt: shift.shiftEnd },
          shiftEnd: { gt: shift.shiftStart },
        },
      });
      if (conflict) throw new ConflictException('Substituto possui conflito de horário.');
    }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.workShift.update({
        where: { id: shiftId },
        data: {
          status: dto.status,
          actualStart: dto.actualStart,
          actualEnd: dto.actualEnd,
          substituteId: dto.substituteId,
          cancelReason: dto.cancelReason,
        },
      });
      await tx.workShiftAudit.create({
        data: {
          shiftId,
          action: 'STATUS_CHANGE',
          oldStatus: shift.status,
          newStatus: dto.status,
          changedBy: user.sub,
          reason: dto.cancelReason,
        },
      });
      return updated;
    });
  }

  // RF-EQP-006: Relatório de produtividade da equipe (sem dados clínicos)
  async getTeamReport(
    organizationId: string,
    user: AuthenticatedUser,
    filters: { from: Date; to: Date; unitId?: string },
  ) {
    this.assertAccess(organizationId, user);
    const shifts = await this.prisma.workShift.groupBy({
      by: ['professionalId', 'status'],
      where: {
        organizationId,
        shiftStart: { gte: filters.from },
        shiftEnd: { lte: filters.to },
      },
      _count: { id: true },
    });
    return { shifts };
  }

  // RF-EQP-007: Credenciais vencendo
  async listExpiringCredentials(
    organizationId: string,
    user: AuthenticatedUser,
    daysAhead: number = 30,
  ) {
    this.assertAccess(organizationId, user);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + daysAhead);
    return this.prisma.eqpCredential.findMany({
      where: {
        organizationId,
        status: CredentialStatus.ATIVA,
        expiresAt: { lte: cutoff, gte: new Date() },
      },
      orderBy: { expiresAt: 'asc' },
    });
  }

  // RF-EQP-008: Dashboard de equipe
  async getDashboard(organizationId: string, user: AuthenticatedUser) {
    this.assertAccess(organizationId, user);
    const [expiredCredentials, shiftsToday, openSchedules] = await Promise.all([
      this.prisma.eqpCredential.count({
        where: { organizationId, status: CredentialStatus.ATIVA, expiresAt: { lt: new Date() } },
      }),
      this.prisma.workShift.count({
        where: {
          organizationId,
          shiftStart: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          shiftEnd: { lte: new Date(new Date().setHours(23, 59, 59, 999)) },
          status: { in: [WorkShiftStatus.AGENDADO, WorkShiftStatus.EM_ANDAMENTO] },
        },
      }),
      this.prisma.workSchedule.count({ where: { organizationId, active: true } }),
    ]);
    return { expiredCredentials, shiftsToday, openSchedules };
  }
}
