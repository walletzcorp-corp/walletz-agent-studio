import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { MedicalRecordsService } from './medical-records.service';
import { EntryStatus, PepAuditAction } from '@prisma/client';

interface CreateEntryDto {
  recordId: string;
  organizationId?: string;
  unitId?: string;
  appointmentId?: string;
  templateId?: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  extraFields?: Record<string, unknown>;
  copiedFromId?: string;
}

interface UpdateEntryDto {
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  extraFields?: Record<string, unknown>;
  rowVersion: number;
}

interface VitalSignsDto {
  temperatureC?: number;
  systolicBp?: number;
  diastolicBp?: number;
  heartRate?: number;
  respiratoryRate?: number;
  oxygenSatPct?: number;
  weightKg?: number;
  heightCm?: number;
  bmi?: number;
  painScale?: number;
  extra?: Record<string, unknown>;
}

interface AddendumDto {
  content: string;
  reason: string;
}

@Injectable()
export class ClinicalEntriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly recordsService: MedicalRecordsService,
  ) {}

  private async assertEntryAccess(entryId: string, user: AuthenticatedUser) {
    const entry = await this.prisma.clinicalEntry.findUnique({
      where: { id: entryId },
      select: { id: true, recordId: true, status: true, rowVersion: true, record: { select: { organizationId: true } } },
    });
    if (!entry) throw new NotFoundException('Entrada clínica não encontrada');
    if (!user.isWalletzAdmin && !user.organizationIds.includes(entry.record.organizationId)) {
      throw new ForbiddenException('Sem acesso a esta organização');
    }
    return entry;
  }

  async create(dto: CreateEntryDto, user: AuthenticatedUser) {
    const record = await this.prisma.medicalRecord.findUnique({ where: { id: dto.recordId } });
    if (!record) throw new NotFoundException('Prontuário não encontrado');

    const organizationId = dto.organizationId ?? record.organizationId;

    if (!user.isWalletzAdmin && !user.organizationIds.includes(organizationId)) {
      throw new ForbiddenException('Sem acesso a esta organização');
    }
    if (record.organizationId !== organizationId) throw new ForbiddenException('Prontuário não pertence a esta organização');

    // Resolve unitId: use provided or fall back to first active unit of the organization
    let unitId = dto.unitId;
    if (!unitId) {
      const unit = await this.prisma.unit.findFirst({ where: { organizationId, status: 'ATIVA' as any } });
      if (!unit) throw new NotFoundException('Nenhuma unidade ativa encontrada na organização');
      unitId = unit.id;
    }

    if (dto.appointmentId) {
      const appt = await this.prisma.appointment.findFirst({
        where: { id: dto.appointmentId, organizationId },
      });
      if (!appt) throw new NotFoundException('Atendimento não encontrado nesta organização');
    }

    const entry = await this.prisma.clinicalEntry.create({
      data: {
        recordId: dto.recordId,
        organizationId,
        unitId,
        professionalId: user.sub,
        appointmentId: dto.appointmentId,
        templateId: dto.templateId,
        subjective: dto.subjective,
        objective: dto.objective,
        assessment: dto.assessment,
        plan: dto.plan,
        extraFields: (dto.extraFields ?? undefined) as any,
        copiedFromId: dto.copiedFromId,
        status: EntryStatus.RASCUNHO,
      },
      include: { vitalSigns: true, signature: true, addenda: true },
    });

    await this.recordsService.writeAudit(record.id, entry.id, user, PepAuditAction.INCLUSAO, 'entry', entry.id);
    return entry;
  }

  async findByRecord(recordId: string, user: AuthenticatedUser) {
    const record = await this.prisma.medicalRecord.findUnique({ where: { id: recordId } });
    if (!record) throw new NotFoundException('Prontuário não encontrado');
    if (!user.isWalletzAdmin && !user.organizationIds.includes(record.organizationId)) {
      throw new ForbiddenException('Sem acesso a esta organização');
    }

    const entries = await this.prisma.clinicalEntry.findMany({
      where: { recordId },
      orderBy: { createdAt: 'desc' },
      include: {
        vitalSigns: true,
        signature: true,
        addenda: true,
        attachments: { select: { id: true, fileName: true, mimeType: true, sizeBytes: true, description: true, createdAt: true } },
      },
    });

    await this.recordsService.writeAudit(recordId, null, user, PepAuditAction.LEITURA, 'record', recordId);
    return entries;
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const meta = await this.assertEntryAccess(id, user);

    const entry = await this.prisma.clinicalEntry.findUnique({
      where: { id },
      include: {
        vitalSigns: true,
        signature: true,
        addenda: true,
        attachments: { select: { id: true, fileName: true, mimeType: true, sizeBytes: true, description: true, createdAt: true } },
        appointment: { select: { id: true, startsAt: true, endsAt: true, type: true, status: true } },
        copiedFrom: { select: { id: true, createdAt: true, professionalId: true } },
      },
    });

    await this.recordsService.writeAudit(meta.recordId, id, user, PepAuditAction.LEITURA, 'entry', id);
    return entry;
  }

  async update(id: string, dto: UpdateEntryDto, user: AuthenticatedUser) {
    const entry = await this.assertEntryAccess(id, user);

    if (entry.status === EntryStatus.ASSINADO) {
      throw new ForbiddenException('Entrada assinada não pode ser editada. Use um adendo.');
    }
    if (entry.status === EntryStatus.CANCELADO) {
      throw new ForbiddenException('Entrada cancelada não pode ser editada');
    }
    if (entry.rowVersion !== dto.rowVersion) {
      throw new ConflictException('Conflito de versão — recarregue e tente novamente');
    }

    const updated = await this.prisma.clinicalEntry.update({
      where: { id },
      data: {
        subjective: dto.subjective,
        objective: dto.objective,
        assessment: dto.assessment,
        plan: dto.plan,
        extraFields: (dto.extraFields ?? undefined) as any,
        rowVersion: { increment: 1 },
      },
      include: { vitalSigns: true, signature: true, addenda: true },
    });

    await this.recordsService.writeAudit(entry.recordId, id, user, PepAuditAction.EDICAO_RASCUNHO, 'entry', id);
    return updated;
  }

  async upsertVitalSigns(entryId: string, dto: VitalSignsDto, user: AuthenticatedUser) {
    const entry = await this.assertEntryAccess(entryId, user);

    if (entry.status === EntryStatus.ASSINADO) {
      throw new ForbiddenException('Entrada assinada não pode ser editada');
    }

    const bmi =
      dto.bmi ??
      (dto.weightKg && dto.heightCm
        ? Math.round((dto.weightKg / Math.pow(dto.heightCm / 100, 2)) * 10) / 10
        : undefined);

    return this.prisma.vitalSigns.upsert({
      where: { entryId },
      create: {
        entryId,
        temperatureC: dto.temperatureC,
        systolicBp: dto.systolicBp,
        diastolicBp: dto.diastolicBp,
        heartRate: dto.heartRate,
        respiratoryRate: dto.respiratoryRate,
        oxygenSatPct: dto.oxygenSatPct,
        weightKg: dto.weightKg,
        heightCm: dto.heightCm,
        bmi: bmi,
        painScale: dto.painScale,
        extra: (dto.extra ?? undefined) as any,
      },
      update: {
        temperatureC: dto.temperatureC,
        systolicBp: dto.systolicBp,
        diastolicBp: dto.diastolicBp,
        heartRate: dto.heartRate,
        respiratoryRate: dto.respiratoryRate,
        oxygenSatPct: dto.oxygenSatPct,
        weightKg: dto.weightKg,
        heightCm: dto.heightCm,
        bmi: bmi,
        painScale: dto.painScale,
        extra: (dto.extra ?? undefined) as any,
      },
    });
  }

  // RF-PEP-010/011: addendum — immutable correction record
  async createAddendum(entryId: string, dto: AddendumDto, user: AuthenticatedUser) {
    const entry = await this.assertEntryAccess(entryId, user);

    if (entry.status === EntryStatus.RASCUNHO) {
      throw new BadRequestException('Rascunho pode ser editado diretamente. Adendo é somente para entradas finalizadas/assinadas.');
    }

    const addendum = await this.prisma.clinicalEntryAddendum.create({
      data: {
        entryId,
        content: dto.content,
        reason: dto.reason,
        authorSub: user.sub,
        authorName: user.name ?? user.email,
      },
    });

    await this.recordsService.writeAudit(entry.recordId, entryId, user, PepAuditAction.ADENDO, 'addendum', addendum.id);
    return addendum;
  }

  async requestSignature(entryId: string, user: AuthenticatedUser) {
    const entry = await this.assertEntryAccess(entryId, user);

    if (entry.status !== EntryStatus.RASCUNHO) {
      throw new BadRequestException(`Não é possível solicitar assinatura no status ${entry.status}`);
    }

    const updated = await this.prisma.clinicalEntry.update({
      where: { id: entryId },
      data: { status: EntryStatus.AGUARDANDO_ASSINATURA, rowVersion: { increment: 1 } },
    });

    await this.recordsService.writeAudit(entry.recordId, entryId, user, PepAuditAction.ASSINATURA, 'entry', entryId);
    return updated;
  }

  async logPrint(entryId: string, user: AuthenticatedUser) {
    const entry = await this.assertEntryAccess(entryId, user);
    await this.recordsService.writeAudit(entry.recordId, entryId, user, PepAuditAction.IMPRESSAO, 'entry', entryId);
    return { logged: true };
  }
}
