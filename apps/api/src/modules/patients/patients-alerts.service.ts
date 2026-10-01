import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { randomUUID } from 'crypto';
import { PatientsService } from './patients.service';

@Injectable()
export class PatientsAlertsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly patientsService: PatientsService,
  ) {}

  private assertOrgAccess(organizationId: string, user: AuthenticatedUser) {
    if (!user.isWalletzAdmin && !user.organizationIds.includes(organizationId)) {
      throw new ForbiddenException('Sem acesso a esta organização');
    }
  }

  async create(patientId: string, organizationId: string, dto: any, user: AuthenticatedUser) {
    this.assertOrgAccess(organizationId, user);
    const patient = await this.prisma.patient.findFirst({ where: { id: patientId, organizationId } });
    if (!patient) throw new NotFoundException('Paciente não encontrado');

    const alert = await this.prisma.patientAlert.create({
      data: {
        id: randomUUID(),
        patientId,
        organizationId,
        type: dto.type,
        severity: dto.severity ?? 'MEDIA',
        message: dto.message,
        createdBy: user.sub,
      },
    });

    await this.patientsService.writeAudit(patientId, organizationId, user, 'ALERT_CREATE', 'alert', alert.id);
    return alert;
  }

  async findAll(patientId: string, organizationId: string, onlyActive: boolean, user: AuthenticatedUser) {
    this.assertOrgAccess(organizationId, user);
    return this.prisma.patientAlert.findMany({
      where: { patientId, organizationId, ...(onlyActive ? { active: true } : {}) },
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async resolve(alertId: string, organizationId: string, user: AuthenticatedUser) {
    const alert = await this.prisma.patientAlert.findFirst({ where: { id: alertId, organizationId } });
    if (!alert) throw new NotFoundException('Alerta não encontrado');
    this.assertOrgAccess(organizationId, user);

    const updated = await this.prisma.patientAlert.update({
      where: { id: alertId },
      data: { active: false, resolvedAt: new Date(), resolvedBy: user.sub },
    });
    await this.patientsService.writeAudit(alert.patientId, organizationId, user, 'ALERT_RESOLVE', 'alert', alertId);
    return updated;
  }
}
