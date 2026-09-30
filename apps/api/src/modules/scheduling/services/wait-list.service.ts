import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { randomUUID } from 'crypto';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';

interface CreateWaitListEntryDto {
  organizationId: string;
  unitId?: string;
  professionalId?: string;
  serviceId?: string;
  patientId: string;
  priority?: number;
  notes?: string;
}

@Injectable()
export class WaitListService {
  constructor(private readonly prisma: PrismaService) {}

  private assertAccess(organizationId: string, user: AuthenticatedUser) {
    if (!user.isWalletzAdmin && !user.organizationIds.includes(organizationId)) {
      throw new ForbiddenException('Sem acesso a esta organização');
    }
  }

  async create(dto: CreateWaitListEntryDto, user: AuthenticatedUser) {
    this.assertAccess(dto.organizationId, user);
    return this.prisma.waitListEntry.create({
      data: {
        id: randomUUID(),
        organizationId: dto.organizationId,
        unitId: dto.unitId ?? null,
        professionalId: dto.professionalId ?? null,
        serviceId: dto.serviceId ?? null,
        patientId: dto.patientId,
        priority: dto.priority ?? 0,
        notes: dto.notes ?? null,
        status: 'AGUARDANDO',
      },
      include: { patient: { select: { id: true, name: true, telefone: true } } },
    });
  }

  async findAll(
    params: { organizationId?: string; unitId?: string; status?: string },
    user: AuthenticatedUser,
  ) {
    const where: Record<string, unknown> = {};

    if (user.isWalletzAdmin) {
      if (params.organizationId) where.organizationId = params.organizationId;
    } else {
      where.organizationId = params.organizationId
        ? user.organizationIds.includes(params.organizationId)
          ? params.organizationId
          : { in: [] }
        : { in: user.organizationIds };
    }

    if (params.unitId) where.unitId = params.unitId;
    if (params.status) where.status = params.status;

    return this.prisma.waitListEntry.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { requestedAt: 'asc' }],
      include: {
        patient: { select: { id: true, name: true, telefone: true } },
        scheduledAppointment: { select: { id: true, startsAt: true, status: true } },
      },
    });
  }

  // RF-AGE-008: Promote wait list entry to an appointment
  async promoteToAppointment(
    id: string,
    appointmentId: string,
    user: AuthenticatedUser,
  ) {
    const entry = await this.prisma.waitListEntry.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException('Entrada não encontrada na lista de espera');
    this.assertAccess(entry.organizationId, user);

    return this.prisma.waitListEntry.update({
      where: { id },
      data: {
        status: 'AGENDADO',
        scheduledAppointmentId: appointmentId,
      },
    });
  }

  async notify(id: string, user: AuthenticatedUser) {
    const entry = await this.prisma.waitListEntry.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException('Entrada não encontrada na lista de espera');
    this.assertAccess(entry.organizationId, user);

    return this.prisma.waitListEntry.update({
      where: { id },
      data: { status: 'NOTIFICADO', notifiedAt: new Date() },
    });
  }

  async cancel(id: string, user: AuthenticatedUser) {
    const entry = await this.prisma.waitListEntry.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException('Entrada não encontrada na lista de espera');
    this.assertAccess(entry.organizationId, user);

    return this.prisma.waitListEntry.update({
      where: { id },
      data: { status: 'CANCELADO' },
    });
  }
}
