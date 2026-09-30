import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { AllergyStatus, MedicationStatus, DiagnosisType } from '@prisma/client';

@Injectable()
export class ClinicalDataService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertRecordAccess(recordId: string, user: AuthenticatedUser) {
    const record = await this.prisma.medicalRecord.findUnique({ where: { id: recordId } });
    if (!record) throw new NotFoundException('Prontuário não encontrado');
    if (!user.isWalletzAdmin && !user.organizationIds.includes(record.organizationId)) {
      throw new ForbiddenException('Sem acesso a esta organização');
    }
    return record;
  }

  // ---- Allergies ----
  async createAllergy(recordId: string, body: any, user: AuthenticatedUser) {
    await this.assertRecordAccess(recordId, user);
    return this.prisma.allergyRecord.create({
      data: {
        recordId,
        substance: body.substance,
        reaction: body.reaction,
        severity: body.severity,
        status: body.status ?? AllergyStatus.ATIVO,
        onsetDate: body.onsetDate ? new Date(body.onsetDate) : undefined,
        notes: body.notes,
        reportedBy: user.sub,
      },
    });
  }

  async listAllergies(recordId: string, user: AuthenticatedUser) {
    await this.assertRecordAccess(recordId, user);
    return this.prisma.allergyRecord.findMany({ where: { recordId }, orderBy: { createdAt: 'desc' } });
  }

  async updateAllergy(id: string, body: any, user: AuthenticatedUser) {
    const allergy = await this.prisma.allergyRecord.findUnique({ where: { id }, select: { recordId: true } });
    if (!allergy) throw new NotFoundException('Alergia não encontrada');
    await this.assertRecordAccess(allergy.recordId, user);
    return this.prisma.allergyRecord.update({
      where: { id },
      data: {
        substance: body.substance,
        reaction: body.reaction,
        severity: body.severity,
        status: body.status,
        notes: body.notes,
      },
    });
  }

  // ---- Medications ----
  async createMedication(recordId: string, body: any, user: AuthenticatedUser) {
    await this.assertRecordAccess(recordId, user);
    return this.prisma.medicationRecord.create({
      data: {
        recordId,
        name: body.name,
        dosage: body.dosage,
        frequency: body.frequency,
        route: body.route,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        status: body.status ?? MedicationStatus.EM_USO,
        indication: body.indication,
        notes: body.notes,
        prescribedBy: user.sub,
      },
    });
  }

  async listMedications(recordId: string, user: AuthenticatedUser) {
    await this.assertRecordAccess(recordId, user);
    return this.prisma.medicationRecord.findMany({ where: { recordId }, orderBy: { createdAt: 'desc' } });
  }

  async updateMedication(id: string, body: any, user: AuthenticatedUser) {
    const med = await this.prisma.medicationRecord.findUnique({ where: { id }, select: { recordId: true } });
    if (!med) throw new NotFoundException('Medicamento não encontrado');
    await this.assertRecordAccess(med.recordId, user);
    return this.prisma.medicationRecord.update({
      where: { id },
      data: {
        name: body.name,
        dosage: body.dosage,
        frequency: body.frequency,
        route: body.route,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        status: body.status,
        indication: body.indication,
        notes: body.notes,
      },
    });
  }

  // ---- Diagnoses ----
  async createDiagnosis(recordId: string, body: any, user: AuthenticatedUser) {
    await this.assertRecordAccess(recordId, user);
    return this.prisma.diagnosisRecord.create({
      data: {
        recordId,
        cidCode: body.cidCode,
        description: body.description,
        type: body.type ?? DiagnosisType.PRINCIPAL,
        notes: body.notes,
        diagnosedBy: user.sub,
        resolvedAt: body.resolvedAt ? new Date(body.resolvedAt) : undefined,
      },
    });
  }

  async listDiagnoses(recordId: string, user: AuthenticatedUser) {
    await this.assertRecordAccess(recordId, user);
    return this.prisma.diagnosisRecord.findMany({ where: { recordId }, orderBy: { diagnosedAt: 'desc' } });
  }

  // ---- Medical History ----
  async createHistory(recordId: string, body: any, user: AuthenticatedUser) {
    await this.assertRecordAccess(recordId, user);
    return this.prisma.medicalHistoryRecord.create({
      data: {
        recordId,
        category: body.category,
        description: body.description,
        date: body.date ? new Date(body.date) : undefined,
        notes: body.notes,
        reportedBy: user.sub,
      },
    });
  }

  async listHistory(recordId: string, user: AuthenticatedUser) {
    await this.assertRecordAccess(recordId, user);
    return this.prisma.medicalHistoryRecord.findMany({ where: { recordId }, orderBy: { createdAt: 'desc' } });
  }
}
