import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { PepAuditAction } from '@prisma/client';

@Injectable()
export class MedicalRecordsService {
  constructor(private readonly prisma: PrismaService) {}

  private assertAccess(organizationId: string, user: AuthenticatedUser) {
    if (!user.isWalletzAdmin && !user.organizationIds.includes(organizationId)) {
      throw new ForbiddenException('Sem acesso a esta organização');
    }
  }

  async getOrCreate(patientId: string, organizationId: string, user: AuthenticatedUser) {
    this.assertAccess(organizationId, user);

    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, organizationId },
    });
    if (!patient) throw new NotFoundException('Paciente não encontrado nesta organização');

    const fullIncludes = {
      patient: true,
      entries: {
        orderBy: { createdAt: 'desc' as const },
        include: {
          vitalSigns: true,
          signature: true,
          addenda: true,
          attachments: { select: { id: true, fileName: true, mimeType: true, sizeBytes: true, description: true, createdAt: true } },
        },
      },
      allergies: { orderBy: { createdAt: 'desc' as const } },
      medications: { orderBy: { createdAt: 'desc' as const } },
      diagnoses: { orderBy: { diagnosedAt: 'desc' as const } },
      medicalHistory: { orderBy: { createdAt: 'desc' as const } },
    };

    const existing = await this.prisma.medicalRecord.findUnique({ where: { patientId }, include: fullIncludes });
    if (existing) {
      await this.writeAudit(existing.id, null, user, PepAuditAction.LEITURA, 'record', existing.id);
      return existing;
    }

    const created = await this.prisma.medicalRecord.create({ data: { patientId, organizationId } });
    const record = await this.prisma.medicalRecord.findUnique({ where: { id: created.id }, include: fullIncludes });
    await this.writeAudit(created.id, null, user, PepAuditAction.INCLUSAO, 'record', created.id);
    return record!;
  }

  async getRecord(recordId: string, user: AuthenticatedUser) {
    const record = await this.prisma.medicalRecord.findUnique({
      where: { id: recordId },
      include: {
        patient: true,
        entries: {
          orderBy: { createdAt: 'desc' },
          include: {
            vitalSigns: true,
            signature: true,
            addenda: true,
            attachments: { select: { id: true, fileName: true, mimeType: true, sizeBytes: true, description: true, createdAt: true } },
          },
        },
        allergies: { orderBy: { createdAt: 'desc' } },
        medications: { orderBy: { createdAt: 'desc' } },
        diagnoses: { orderBy: { diagnosedAt: 'desc' } },
        medicalHistory: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!record) throw new NotFoundException('Prontuário não encontrado');
    this.assertAccess(record.organizationId, user);
    await this.writeAudit(record.id, null, user, PepAuditAction.LEITURA, 'record', record.id);
    return record;
  }

  async logExport(recordId: string, user: AuthenticatedUser) {
    const record = await this.prisma.medicalRecord.findUnique({ where: { id: recordId } });
    if (!record) throw new NotFoundException('Prontuário não encontrado');
    this.assertAccess(record.organizationId, user);
    await this.writeAudit(record.id, null, user, PepAuditAction.EXPORTACAO, 'record', record.id);
    return record;
  }

  async writeAudit(
    recordId: string | null,
    entryId: string | null,
    user: AuthenticatedUser,
    action: PepAuditAction,
    resourceType: string,
    resourceId: string,
  ) {
    await this.prisma.pepAuditLog.create({
      data: {
        recordId: recordId ?? undefined,
        entryId: entryId ?? undefined,
        actorSub: user.sub,
        actorName: user.name ?? user.email,
        action,
        resourceType,
        resourceId,
      },
    });
  }
}
