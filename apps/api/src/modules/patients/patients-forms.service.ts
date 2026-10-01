import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { randomUUID } from 'crypto';
import { PatientsService } from './patients.service';

@Injectable()
export class PatientsFormsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly patientsService: PatientsService,
  ) {}

  private assertOrgAccess(organizationId: string, user: AuthenticatedUser) {
    if (!user.isWalletzAdmin && !user.organizationIds.includes(organizationId)) {
      throw new ForbiddenException('Sem acesso a esta organização');
    }
  }

  // RF-PAC-014: Criação de formulário de pré-admissão com versionamento
  async createForm(organizationId: string, dto: any, user: AuthenticatedUser) {
    this.assertOrgAccess(organizationId, user);

    return this.prisma.preAdmissionForm.create({
      data: {
        id: randomUUID(),
        organizationId,
        name: dto.name,
        version: dto.version ?? '1.0',
        fields: dto.fields as any,
        active: true,
        createdBy: user.sub,
      },
    });
  }

  async listForms(organizationId: string, user: AuthenticatedUser) {
    this.assertOrgAccess(organizationId, user);
    return this.prisma.preAdmissionForm.findMany({
      where: { organizationId, active: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async submitResponse(patientId: string, organizationId: string, dto: any, user: AuthenticatedUser) {
    this.assertOrgAccess(organizationId, user);

    const patient = await this.prisma.patient.findFirst({ where: { id: patientId, organizationId } });
    if (!patient) throw new NotFoundException('Paciente não encontrado');

    const form = await this.prisma.preAdmissionForm.findFirst({
      where: { id: dto.formId, organizationId },
    });
    if (!form) throw new NotFoundException('Formulário não encontrado');

    const response = await this.prisma.preAdmissionFormResponse.create({
      data: {
        id: randomUUID(),
        formId: dto.formId,
        patientId,
        organizationId,
        answers: dto.answers as any,
        formVersion: form.version,
        submittedBy: user.sub,
        notes: dto.notes,
      },
      include: { form: { select: { id: true, name: true, version: true } } },
    });

    await this.patientsService.writeAudit(patientId, organizationId, user, 'FORM_SUBMIT', 'form_response', response.id);
    return response;
  }

  async listResponses(patientId: string, organizationId: string, user: AuthenticatedUser) {
    this.assertOrgAccess(organizationId, user);
    return this.prisma.preAdmissionFormResponse.findMany({
      where: { patientId, organizationId },
      orderBy: { submittedAt: 'desc' },
      include: { form: { select: { id: true, name: true, version: true } } },
    });
  }
}
