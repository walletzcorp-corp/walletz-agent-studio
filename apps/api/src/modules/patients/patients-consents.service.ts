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
export class PatientsConsentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly patientsService: PatientsService,
  ) {}

  private async assertAccess(patientId: string, organizationId: string, user: AuthenticatedUser) {
    if (!user.isWalletzAdmin && !user.organizationIds.includes(organizationId)) {
      throw new ForbiddenException('Sem acesso a esta organização');
    }
    const patient = await this.prisma.patient.findFirst({ where: { id: patientId, organizationId } });
    if (!patient) throw new NotFoundException('Paciente não encontrado nesta organização');
    return patient;
  }

  async create(patientId: string, organizationId: string, dto: any, user: AuthenticatedUser) {
    await this.assertAccess(patientId, organizationId, user);

    const consent = await this.prisma.patientConsent.create({
      data: {
        id: randomUUID(),
        patientId,
        organizationId,
        type: dto.type,
        status: 'VIGENTE',
        channel: dto.channel,
        version: dto.version,
        documentUrl: dto.documentUrl,
        signedBy: user.sub,
        signedByName: user.name ?? user.email,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        ipAddress: dto.ipAddress,
        notes: dto.notes,
      },
    });

    await this.patientsService.writeAudit(patientId, organizationId, user, 'CONSENT_SIGN', 'consent', consent.id);
    return consent;
  }

  async findAll(patientId: string, organizationId: string, user: AuthenticatedUser) {
    await this.assertAccess(patientId, organizationId, user);
    return this.prisma.patientConsent.findMany({
      where: { patientId, organizationId },
      orderBy: { signedAt: 'desc' },
    });
  }

  async revoke(consentId: string, organizationId: string, dto: { reason: string }, user: AuthenticatedUser) {
    const consent = await this.prisma.patientConsent.findFirst({
      where: { id: consentId, organizationId },
    });
    if (!consent) throw new NotFoundException('Consentimento não encontrado');
    if (!user.isWalletzAdmin && !user.organizationIds.includes(organizationId)) {
      throw new ForbiddenException('Sem acesso');
    }
    if (consent.status !== 'VIGENTE') {
      throw new BadRequestException('Apenas consentimentos vigentes podem ser revogados');
    }
    if (!dto.reason?.trim()) {
      throw new BadRequestException('Motivo de revogação é obrigatório');
    }

    const updated = await this.prisma.patientConsent.update({
      where: { id: consentId },
      data: {
        status: 'REVOGADO',
        revokedAt: new Date(),
        revokedBy: user.sub,
        revokedByName: user.name ?? user.email,
        revocationReason: dto.reason,
      },
    });

    await this.patientsService.writeAudit(
      consent.patientId, organizationId, user, 'CONSENT_REVOKE', 'consent', consentId,
      { reason: dto.reason },
    );
    return updated;
  }

  async checkMarketingBlock(patientId: string, organizationId: string, user: AuthenticatedUser): Promise<{ blocked: boolean; reason?: string }> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, organizationId },
      select: { marketingBlocked: true },
    });
    if (!patient) throw new NotFoundException('Paciente não encontrado');

    if (patient.marketingBlocked) {
      return { blocked: true, reason: 'Paciente solicitou bloqueio de comunicações de marketing' };
    }

    const revokedMarketing = await this.prisma.patientConsent.findFirst({
      where: { patientId, organizationId, type: 'MARKETING', status: 'REVOGADO' },
    });
    if (revokedMarketing) {
      return { blocked: true, reason: 'Consentimento de marketing foi revogado pelo paciente' };
    }

    return { blocked: false };
  }
}
