import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { randomUUID } from 'crypto';

@Injectable()
export class PatientsInsuranceService {
  constructor(private readonly prisma: PrismaService) {}

  private assertOrgAccess(organizationId: string, user: AuthenticatedUser) {
    if (!user.isWalletzAdmin && !user.organizationIds.includes(organizationId)) {
      throw new ForbiddenException('Sem acesso a esta organização');
    }
  }

  async create(patientId: string, organizationId: string, dto: any, user: AuthenticatedUser) {
    this.assertOrgAccess(organizationId, user);
    const patient = await this.prisma.patient.findFirst({ where: { id: patientId, organizationId } });
    if (!patient) throw new NotFoundException('Paciente não encontrado');

    return this.prisma.patientInsurance.create({
      data: {
        id: randomUUID(),
        patientId,
        organizationId,
        operator: dto.operator,
        planName: dto.planName,
        cardNumber: dto.cardNumber,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        planType: dto.planType,
        notes: dto.notes,
        active: true,
      },
    });
  }

  async findAll(patientId: string, organizationId: string, user: AuthenticatedUser) {
    this.assertOrgAccess(organizationId, user);
    return this.prisma.patientInsurance.findMany({
      where: { patientId, organizationId },
      orderBy: [{ active: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async update(insuranceId: string, organizationId: string, dto: any, user: AuthenticatedUser) {
    const insurance = await this.prisma.patientInsurance.findFirst({ where: { id: insuranceId, organizationId } });
    if (!insurance) throw new NotFoundException('Convênio não encontrado');
    this.assertOrgAccess(organizationId, user);

    return this.prisma.patientInsurance.update({
      where: { id: insuranceId },
      data: {
        operator: dto.operator,
        planName: dto.planName,
        cardNumber: dto.cardNumber,
        validUntil: dto.validUntil !== undefined ? (dto.validUntil ? new Date(dto.validUntil) : null) : undefined,
        planType: dto.planType,
        notes: dto.notes,
        active: dto.active,
      },
    });
  }
}
