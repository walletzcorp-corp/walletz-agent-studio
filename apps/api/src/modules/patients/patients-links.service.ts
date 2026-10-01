import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { randomUUID } from 'crypto';
import { PatientsService } from './patients.service';

@Injectable()
export class PatientsLinksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly patientsService: PatientsService,
  ) {}

  private assertOrgAccess(organizationId: string, user: AuthenticatedUser) {
    if (!user.isWalletzAdmin && !user.organizationIds.includes(organizationId)) {
      throw new ForbiddenException('Sem acesso a esta organização');
    }
  }

  // RF-PAC-013: Verifica se o dependente é menor de idade e exige responsável legal
  private async validateGuardianForMinor(dependentId: string, organizationId: string) {
    const dependent = await this.prisma.patient.findFirst({
      where: { id: dependentId, organizationId },
      select: { dataNasc: true, name: true },
    });
    if (!dependent) throw new NotFoundException('Dependente não encontrado na organização');
    if (dependent.dataNasc) {
      const age = (Date.now() - dependent.dataNasc.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      if (age < 18) return true; // é menor
    }
    return false;
  }

  async create(organizationId: string, dto: {
    guardianId: string;
    dependentId: string;
    linkType: string;
    validUntil?: string;
    notes?: string;
  }, user: AuthenticatedUser) {
    this.assertOrgAccess(organizationId, user);

    if (dto.guardianId === dto.dependentId) {
      throw new BadRequestException('Um paciente não pode ser responsável por si mesmo');
    }

    const guardian = await this.prisma.patient.findFirst({ where: { id: dto.guardianId, organizationId } });
    if (!guardian) throw new NotFoundException('Responsável não encontrado nesta organização');

    const isMinor = await this.validateGuardianForMinor(dto.dependentId, organizationId);
    const legalTypes = ['RESPONSAVEL_LEGAL', 'PAI', 'MAE', 'TUTOR'];
    if (isMinor && !legalTypes.includes(dto.linkType)) {
      throw new BadRequestException(
        'Dependente menor de idade requer vínculo do tipo RESPONSAVEL_LEGAL, PAI, MAE ou TUTOR',
      );
    }

    const link = await this.prisma.patientLink.create({
      data: {
        id: randomUUID(),
        organizationId,
        guardianId: dto.guardianId,
        dependentId: dto.dependentId,
        linkType: dto.linkType as any,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        notes: dto.notes,
        createdBy: user.sub,
      },
      include: {
        guardian: { select: { id: true, name: true, cpf: true } },
        dependent: { select: { id: true, name: true, cpf: true, dataNasc: true } },
      },
    });

    await this.patientsService.writeAudit(dto.dependentId, organizationId, user, 'LINK_CREATE', 'link', link.id);
    return link;
  }

  async findForPatient(patientId: string, organizationId: string, user: AuthenticatedUser) {
    this.assertOrgAccess(organizationId, user);

    const [asDependent, asGuardian] = await Promise.all([
      this.prisma.patientLink.findMany({
        where: { dependentId: patientId, organizationId, active: true },
        include: { guardian: { select: { id: true, name: true, cpf: true } } },
      }),
      this.prisma.patientLink.findMany({
        where: { guardianId: patientId, organizationId, active: true },
        include: { dependent: { select: { id: true, name: true, cpf: true, dataNasc: true } } },
      }),
    ]);
    return { asDependent, asGuardian };
  }

  async deactivate(linkId: string, organizationId: string, user: AuthenticatedUser) {
    const link = await this.prisma.patientLink.findFirst({ where: { id: linkId, organizationId } });
    if (!link) throw new NotFoundException('Vínculo não encontrado');
    this.assertOrgAccess(organizationId, user);

    return this.prisma.patientLink.update({ where: { id: linkId }, data: { active: false } });
  }
}
