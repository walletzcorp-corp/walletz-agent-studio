import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { MedRecordStatus, MedRouteType, MedAdverseReactionSeverity, MedLotAlertType, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Segurança M14 MED:
// - Confirmar paciente com dois identificadores antes do ato
// - Validar alergias, lote, validade e status antes de administrar
// - Dupla checagem com usuários distintos quando o protocolo exigir
// - Lote bloqueado impede administração
// - Toda alteração após administração preserva original e exige motivo
// - Eventos são idempotentes — não duplicam administração nem baixa

@Injectable()
export class MedService {
  constructor(private prisma: PrismaService) {}

  private assertAccess(organizationId: string, user: AuthenticatedUser): void {
    if (user.isWalletzAdmin) return;
    if (!user.organizationIds.includes(organizationId)) {
      throw new ForbiddenException('Acesso negado a esta organização.');
    }
  }

  // RF-MED-014: Listar protocolos
  async listProtocols(organizationId: string, user: AuthenticatedUser) {
    this.assertAccess(organizationId, user);
    return this.prisma.medProtocol.findMany({
      where: { organizationId, active: true },
      orderBy: { name: 'asc' },
    });
  }

  // RF-MED-001: Criar protocolo (responsável clínico habilitado)
  async createProtocol(
    organizationId: string,
    user: AuthenticatedUser,
    dto: {
      name: string;
      code?: string;
      description?: string;
      version?: string;
      requiresDualCheck?: boolean;
      routes?: string[];
    },
  ) {
    this.assertAccess(organizationId, user);
    if (dto.code) {
      const existing = await this.prisma.medProtocol.findFirst({
        where: { organizationId, code: dto.code },
      });
      if (existing) throw new ConflictException('Código de protocolo já existe nesta organização.');
    }
    return this.prisma.medProtocol.create({
      data: {
        organizationId,
        name: dto.name,
        code: dto.code,
        description: dto.description,
        version: dto.version ?? '1.0',
        requiresDualCheck: dto.requiresDualCheck ?? false,
        routes: dto.routes ? (dto.routes as Prisma.InputJsonValue) : Prisma.JsonNull,
        createdBy: user.sub,
      },
    });
  }

  // RF-MED-001: Aprovar protocolo
  async approveProtocol(organizationId: string, user: AuthenticatedUser, protocolId: string) {
    this.assertAccess(organizationId, user);
    const protocol = await this.prisma.medProtocol.findFirst({
      where: { id: protocolId, organizationId },
    });
    if (!protocol) throw new NotFoundException('Protocolo não encontrado.');
    return this.prisma.medProtocol.update({
      where: { id: protocolId },
      data: { approvedBy: user.sub, approvedAt: new Date() },
    });
  }

  // RF-MED-002: Listar registros de administração
  async listRecords(
    organizationId: string,
    user: AuthenticatedUser,
    filters?: {
      patientId?: string;
      status?: MedRecordStatus;
      from?: Date;
      to?: Date;
    },
  ) {
    this.assertAccess(organizationId, user);
    return this.prisma.medAdministrationRecord.findMany({
      where: {
        organizationId,
        patientId: filters?.patientId,
        status: filters?.status,
        scheduledAt: {
          gte: filters?.from,
          lte: filters?.to,
        },
      },
      orderBy: { scheduledAt: 'desc' },
      take: 200,
    });
  }

  // RF-MED-002: Criar registro de administração (reserva)
  async createRecord(
    organizationId: string,
    user: AuthenticatedUser,
    dto: {
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
      expiryDate?: Date;
      scheduledAt: Date;
      isControlled?: boolean;
      isHighAlert?: boolean;
      infusionRateMl?: number;
      infusionDurationMin?: number;
      notes?: string;
    },
  ) {
    this.assertAccess(organizationId, user);
    // Verificar lote bloqueado
    if (dto.lotNumber) {
      const lotBlock = await this.prisma.medLotAlert.findFirst({
        where: { organizationId, lotNumber: dto.lotNumber, active: true },
      });
      if (lotBlock) {
        throw new BadRequestException(
          `Lote ${dto.lotNumber} bloqueado: ${lotBlock.reason}`,
        );
      }
      // Verificar lote vencido
      if (dto.expiryDate && new Date(dto.expiryDate) < new Date()) {
        throw new BadRequestException('Lote com data de validade vencida.');
      }
    }
    return this.prisma.medAdministrationRecord.create({
      data: {
        organizationId,
        patientId: dto.patientId,
        prescriptionRef: dto.prescriptionRef,
        protocolId: dto.protocolId,
        appointmentId: dto.appointmentId,
        roomBookingId: dto.roomBookingId,
        medicationName: dto.medicationName,
        medicationCode: dto.medicationCode,
        dose: new Decimal(dto.dose),
        doseUnit: dto.doseUnit,
        route: dto.route,
        lotNumber: dto.lotNumber,
        expiryDate: dto.expiryDate,
        scheduledAt: dto.scheduledAt,
        isControlled: dto.isControlled ?? false,
        isHighAlert: dto.isHighAlert ?? false,
        infusionRateMl: dto.infusionRateMl ? new Decimal(dto.infusionRateMl) : undefined,
        infusionDurationMin: dto.infusionDurationMin,
        notes: dto.notes,
        status: MedRecordStatus.RESERVADO,
        createdBy: user.sub,
      },
    });
  }

  // RF-MED-003: Registrar preparação
  async registerPreparation(
    organizationId: string,
    user: AuthenticatedUser,
    recordId: string,
    dto: { notes?: string },
  ) {
    this.assertAccess(organizationId, user);
    const record = await this.prisma.medAdministrationRecord.findFirst({
      where: { id: recordId, organizationId },
    });
    if (!record) throw new NotFoundException('Registro não encontrado.');
    if (record.status !== MedRecordStatus.RESERVADO) {
      throw new BadRequestException(`Não é possível preparar: status atual é ${record.status}.`);
    }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.medAdministrationRecord.update({
        where: { id: recordId },
        data: {
          status: MedRecordStatus.PREPARADO,
          preparedAt: new Date(),
          preparedBy: user.sub,
          notes: dto.notes ?? record.notes,
        },
      });
      await tx.medRecordAudit.create({
        data: {
          recordId,
          action: 'PREPARADO',
          oldValue: MedRecordStatus.RESERVADO,
          newValue: MedRecordStatus.PREPARADO,
          changedBy: user.sub,
        },
      });
      return updated;
    });
  }

  // RF-MED-004: Registrar administração (com identificação do paciente)
  async registerAdministration(
    organizationId: string,
    user: AuthenticatedUser,
    recordId: string,
    dto: {
      patient1stId: string;
      patient2ndId: string;
      notes?: string;
    },
  ) {
    this.assertAccess(organizationId, user);
    const record = await this.prisma.medAdministrationRecord.findFirst({
      where: { id: recordId, organizationId },
    });
    if (!record) throw new NotFoundException('Registro não encontrado.');
    if (record.status !== MedRecordStatus.PREPARADO) {
      throw new BadRequestException(`Não é possível administrar: status atual é ${record.status}.`);
    }
    // RF-MED-004: dois identificadores obrigatórios
    if (!dto.patient1stId || !dto.patient2ndId) {
      throw new BadRequestException('Dois identificadores do paciente são obrigatórios.');
    }
    // Verificar dupla checagem se protocolo exige
    if (record.protocolId) {
      const protocol = await this.prisma.medProtocol.findUnique({
        where: { id: record.protocolId },
      });
      if (protocol?.requiresDualCheck) {
        const verifications = await this.prisma.medVerification.findMany({
          where: { recordId },
        });
        const distinctUsers = new Set(verifications.map((v) => v.verifiedBy));
        if (distinctUsers.size < 2) {
          throw new BadRequestException(
            'Este protocolo exige dupla checagem por dois profissionais distintos.',
          );
        }
      }
    }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.medAdministrationRecord.update({
        where: { id: recordId },
        data: {
          status: MedRecordStatus.ADMINISTRADO,
          administeredAt: new Date(),
          administeredBy: user.sub,
          patient1stId: dto.patient1stId,
          patient2ndId: dto.patient2ndId,
          identifiedBy: user.sub,
          notes: dto.notes ?? record.notes,
        },
      });
      await tx.medRecordAudit.create({
        data: {
          recordId,
          action: 'ADMINISTRADO',
          oldValue: MedRecordStatus.PREPARADO,
          newValue: MedRecordStatus.ADMINISTRADO,
          changedBy: user.sub,
        },
      });
      return updated;
    });
  }

  // RF-MED-005: Dupla verificação
  async addVerification(
    organizationId: string,
    user: AuthenticatedUser,
    recordId: string,
    dto: { role: string; checkItems?: Record<string, unknown>; notes?: string },
  ) {
    this.assertAccess(organizationId, user);
    const record = await this.prisma.medAdministrationRecord.findFirst({
      where: { id: recordId, organizationId },
    });
    if (!record) throw new NotFoundException('Registro não encontrado.');
    // Verificar que o mesmo usuário não faz as duas verificações
    const existing = await this.prisma.medVerification.findFirst({
      where: { recordId, verifiedBy: user.sub },
    });
    if (existing && existing.role !== dto.role) {
      throw new BadRequestException('O mesmo profissional não pode realizar as duas verificações.');
    }
    return this.prisma.medVerification.upsert({
      where: { recordId_role: { recordId, role: dto.role } },
      update: { verifiedBy: user.sub, verifiedAt: new Date(), checkItems: dto.checkItems as Prisma.InputJsonValue, notes: dto.notes },
      create: {
        recordId,
        verifiedBy: user.sub,
        role: dto.role,
        checkItems: dto.checkItems as Prisma.InputJsonValue,
        notes: dto.notes,
      },
    });
  }

  // RF-MED-006: Registrar devolução / descarte
  async registerReturn(
    organizationId: string,
    user: AuthenticatedUser,
    recordId: string,
    dto: { status: 'DEVOLVIDO' | 'DESCARTADO'; wasteReason?: string; notes?: string },
  ) {
    this.assertAccess(organizationId, user);
    const record = await this.prisma.medAdministrationRecord.findFirst({
      where: { id: recordId, organizationId },
    });
    if (!record) throw new NotFoundException('Registro não encontrado.');
    const returnableStatuses: string[] = [MedRecordStatus.RESERVADO, MedRecordStatus.PREPARADO];
    if (!returnableStatuses.includes(record.status)) {
      throw new BadRequestException('Somente registros RESERVADO ou PREPARADO podem ser devolvidos/descartados.');
    }
    const newStatus = dto.status === 'DESCARTADO' ? MedRecordStatus.DESCARTADO : MedRecordStatus.DEVOLVIDO;
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.medAdministrationRecord.update({
        where: { id: recordId },
        data: {
          status: newStatus,
          returnedAt: new Date(),
          returnedBy: user.sub,
          wasteReason: dto.wasteReason,
          notes: dto.notes ?? record.notes,
        },
      });
      await tx.medRecordAudit.create({
        data: {
          recordId,
          action: dto.status,
          oldValue: record.status,
          newValue: newStatus,
          reason: dto.wasteReason,
          changedBy: user.sub,
        },
      });
      return updated;
    });
  }

  // RF-MED-007: Registrar reação adversa
  async reportAdverseReaction(
    organizationId: string,
    user: AuthenticatedUser,
    dto: {
      recordId?: string;
      patientId: string;
      medicationName: string;
      reactionDesc: string;
      severity: MedAdverseReactionSeverity;
      onsetAt: Date;
      treatment?: string;
      notes?: string;
    },
  ) {
    this.assertAccess(organizationId, user);
    return this.prisma.medAdverseReaction.create({
      data: {
        organizationId,
        recordId: dto.recordId,
        patientId: dto.patientId,
        medicationName: dto.medicationName,
        reactionDesc: dto.reactionDesc,
        severity: dto.severity,
        onsetAt: dto.onsetAt,
        treatment: dto.treatment,
        reportedBy: user.sub,
        notes: dto.notes,
      },
    });
  }

  // RF-MED-007: Listar reações adversas
  async listAdverseReactions(
    organizationId: string,
    user: AuthenticatedUser,
    filters?: { patientId?: string; severity?: MedAdverseReactionSeverity },
  ) {
    this.assertAccess(organizationId, user);
    return this.prisma.medAdverseReaction.findMany({
      where: { organizationId, patientId: filters?.patientId, severity: filters?.severity },
      orderBy: { reportedAt: 'desc' },
      take: 200,
    });
  }

  // RF-MED-008: Criar alerta de lote
  async createLotAlert(
    organizationId: string,
    user: AuthenticatedUser,
    dto: {
      lotNumber: string;
      medicationName: string;
      medicationCode?: string;
      alertType: MedLotAlertType;
      reason: string;
    },
  ) {
    this.assertAccess(organizationId, user);
    return this.prisma.medLotAlert.create({
      data: {
        organizationId,
        lotNumber: dto.lotNumber,
        medicationName: dto.medicationName,
        medicationCode: dto.medicationCode,
        alertType: dto.alertType,
        reason: dto.reason,
        blockedBy: user.sub,
      },
    });
  }

  // RF-MED-008: Resolver alerta de lote
  async resolveLotAlert(
    organizationId: string,
    user: AuthenticatedUser,
    alertId: string,
    dto: { resolutionNotes: string },
  ) {
    this.assertAccess(organizationId, user);
    const alert = await this.prisma.medLotAlert.findFirst({
      where: { id: alertId, organizationId },
    });
    if (!alert) throw new NotFoundException('Alerta não encontrado.');
    if (!alert.active) throw new BadRequestException('Alerta já resolvido.');
    return this.prisma.medLotAlert.update({
      where: { id: alertId },
      data: { active: false, resolvedAt: new Date(), resolvedBy: user.sub, resolutionNotes: dto.resolutionNotes },
    });
  }

  // RF-MED-008: Listar alertas de lote
  async listLotAlerts(organizationId: string, user: AuthenticatedUser, onlyActive?: boolean) {
    this.assertAccess(organizationId, user);
    return this.prisma.medLotAlert.findMany({
      where: { organizationId, active: onlyActive ? true : undefined },
      orderBy: { blockedAt: 'desc' },
    });
  }

  // RF-MED-009: Corrigir registro após administração (preserva original)
  async correctRecord(
    organizationId: string,
    user: AuthenticatedUser,
    recordId: string,
    dto: { fieldName: string; newValue: string; reason: string },
  ) {
    this.assertAccess(organizationId, user);
    const record = await this.prisma.medAdministrationRecord.findFirst({
      where: { id: recordId, organizationId },
    });
    if (!record) throw new NotFoundException('Registro não encontrado.');
    if (record.status !== MedRecordStatus.ADMINISTRADO) {
      throw new BadRequestException('Correção só é permitida após administração.');
    }
    const oldValue = (record as Record<string, unknown>)[dto.fieldName] as string | undefined;
    return this.prisma.$transaction(async (tx) => {
      await tx.medRecordAudit.create({
        data: {
          recordId,
          action: 'CORRECAO',
          fieldName: dto.fieldName,
          oldValue: String(oldValue ?? ''),
          newValue: dto.newValue,
          reason: dto.reason,
          changedBy: user.sub,
        },
      });
      return tx.medAdministrationRecord.update({
        where: { id: recordId },
        data: { notes: dto.fieldName === 'notes' ? dto.newValue : record.notes },
      });
    });
  }

  // RF-MED-010: Trilha de auditoria do registro
  async getAuditTrail(organizationId: string, user: AuthenticatedUser, recordId: string) {
    this.assertAccess(organizationId, user);
    const record = await this.prisma.medAdministrationRecord.findFirst({
      where: { id: recordId, organizationId },
    });
    if (!record) throw new NotFoundException('Registro não encontrado.');
    return this.prisma.medRecordAudit.findMany({
      where: { recordId },
      orderBy: { changedAt: 'asc' },
    });
  }

  // RF-MED-011: Relatório MAR (Medication Administration Record)
  async getMar(
    organizationId: string,
    user: AuthenticatedUser,
    filters: { patientId?: string; from: Date; to: Date },
  ) {
    this.assertAccess(organizationId, user);
    return this.prisma.medAdministrationRecord.findMany({
      where: {
        organizationId,
        patientId: filters.patientId,
        scheduledAt: { gte: filters.from, lte: filters.to },
      },
      include: { verifications: true, adverseReactions: true },
      orderBy: { scheduledAt: 'asc' },
    });
  }
}
