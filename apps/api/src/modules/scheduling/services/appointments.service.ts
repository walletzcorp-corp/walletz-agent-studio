import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ConflictService } from './conflict.service';
import { randomUUID } from 'crypto';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { AppointmentStatus, AppointmentType } from '@prisma/client';

interface CreateAppointmentDto {
  organizationId: string;
  unitId: string;
  professionalId?: string;
  serviceId?: string;
  resourceId?: string;
  patientId: string;
  type?: AppointmentType;
  startsAt: string;
  endsAt: string;
  notes?: string;
  isOnlineBooking?: boolean;
  // RF-AGE-004: series/recurrence
  seriesId?: string;
  recurrence?: {
    type: 'SEMANAL' | 'QUINZENAL' | 'MENSAL';
    totalSessions: number;
  };
}

interface RescheduleDto {
  startsAt: string;
  endsAt: string;
  reason?: string;
  rowVersion: number;
}

interface CancelDto {
  reason: string;
  rowVersion: number;
}

const VALID_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  AGENDADO:       ['CONFIRMADO', 'CANCELADO', 'NAO_COMPARECEU', 'REAGENDADO'],
  CONFIRMADO:     ['AGUARDANDO', 'CANCELADO', 'NAO_COMPARECEU', 'REAGENDADO'],
  AGUARDANDO:     ['EM_ATENDIMENTO', 'CANCELADO'],
  EM_ATENDIMENTO: ['FINALIZADO'],
  FINALIZADO:     [],
  CANCELADO:      [],
  NAO_COMPARECEU: [],
  REAGENDADO:     [],
};

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conflictService: ConflictService,
  ) {}

  private assertAccess(organizationId: string, user: AuthenticatedUser) {
    if (!user.isWalletzAdmin && !user.organizationIds.includes(organizationId)) {
      throw new ForbiddenException('Sem acesso a esta organização');
    }
  }

  async create(dto: CreateAppointmentDto, user: AuthenticatedUser) {
    this.assertAccess(dto.organizationId, user);

    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);

    if (endsAt <= startsAt) throw new BadRequestException('endsAt deve ser posterior a startsAt');

    return this.prisma.$transaction(async (tx) => {
      const lockKey = this.conflictService.buildLockKey({
        professionalId: dto.professionalId,
        resourceId: dto.resourceId,
        startsAt,
      });
      await this.conflictService.acquireLock(tx, lockKey);
      await this.conflictService.assertNoConflict(tx, {
        startsAt,
        endsAt,
        professionalId: dto.professionalId,
        resourceId: dto.resourceId,
      });

      let seriesId = dto.seriesId ?? null;

      // RF-AGE-004: create series if recurrence is requested
      if (!seriesId && dto.recurrence) {
        const series = await tx.appointmentSeries.create({
          data: {
            id: randomUUID(),
            organizationId: dto.organizationId,
            recurrenceType: dto.recurrence.type,
            totalSessions: dto.recurrence.totalSessions,
          },
        });
        seriesId = series.id;
      }

      const appt = await tx.appointment.create({
        data: {
          id: randomUUID(),
          organizationId: dto.organizationId,
          unitId: dto.unitId,
          professionalId: dto.professionalId ?? null,
          serviceId: dto.serviceId ?? null,
          resourceId: dto.resourceId ?? null,
          patientId: dto.patientId,
          seriesId,
          type: dto.type ?? 'CONSULTA',
          status: 'AGENDADO',
          startsAt,
          endsAt,
          notes: dto.notes ?? null,
          isOnlineBooking: dto.isOnlineBooking ?? false,
        },
        include: { patient: true, professional: true, service: true, resource: true, unit: true },
      });

      await tx.appointmentHistory.create({
        data: {
          id: randomUUID(),
          appointmentId: appt.id,
          toStatus: 'AGENDADO',
          changedBy: user.userId ?? user.sub,
        },
      });

      // If part of a recurring series, create remaining sessions
      if (dto.recurrence && seriesId) {
        const remaining = dto.recurrence.totalSessions - 1;
        const offsetDays =
          dto.recurrence.type === 'SEMANAL' ? 7 :
          dto.recurrence.type === 'QUINZENAL' ? 14 : 30;

        for (let i = 1; i <= remaining; i++) {
          const offset = i * offsetDays * 24 * 60 * 60 * 1000;
          const nextStart = new Date(startsAt.getTime() + offset);
          const nextEnd = new Date(endsAt.getTime() + offset);

          try {
            await this.conflictService.assertNoConflict(tx, {
              startsAt: nextStart,
              endsAt: nextEnd,
              professionalId: dto.professionalId,
              resourceId: dto.resourceId,
            });
            const recurring = await tx.appointment.create({
              data: {
                id: randomUUID(),
                organizationId: dto.organizationId,
                unitId: dto.unitId,
                professionalId: dto.professionalId ?? null,
                serviceId: dto.serviceId ?? null,
                resourceId: dto.resourceId ?? null,
                patientId: dto.patientId,
                seriesId,
                type: dto.type ?? 'CONSULTA',
                status: 'AGENDADO',
                startsAt: nextStart,
                endsAt: nextEnd,
                notes: dto.notes ?? null,
                isOnlineBooking: dto.isOnlineBooking ?? false,
              },
            });
            await tx.appointmentHistory.create({
              data: {
                id: randomUUID(),
                appointmentId: recurring.id,
                toStatus: 'AGENDADO',
                changedBy: user.userId ?? user.sub,
              },
            });
          } catch {
            // Skip conflicting recurrence slots rather than rolling back the whole transaction
          }
        }
      }

      return appt;
    });
  }

  async findAll(
    params: {
      organizationId?: string;
      unitId?: string;
      professionalId?: string;
      patientId?: string;
      dateFrom?: string;
      dateTo?: string;
      status?: AppointmentStatus;
      page?: number;
      limit?: number;
    },
    user: AuthenticatedUser,
  ) {
    const page = params.page ?? 1;
    const limit = Math.min(params.limit ?? 20, 100);
    const skip = (page - 1) * limit;

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
    if (params.professionalId) where.professionalId = params.professionalId;
    if (params.patientId) where.patientId = params.patientId;
    if (params.status) where.status = params.status;
    if (params.dateFrom || params.dateTo) {
      where.startsAt = {
        ...(params.dateFrom ? { gte: new Date(params.dateFrom) } : {}),
        ...(params.dateTo ? { lte: new Date(params.dateTo) } : {}),
      };
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.appointment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startsAt: 'asc' },
        include: {
          patient: { select: { id: true, name: true, telefone: true } },
          professional: { select: { id: true, name: true } },
          service: { select: { id: true, name: true, durationMin: true } },
          resource: { select: { id: true, name: true, type: true } },
          unit: { select: { id: true, name: true } },
        },
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const appt = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: true,
        professional: true,
        service: true,
        resource: true,
        unit: true,
        history: { orderBy: { changedAt: 'asc' } },
        series: true,
      },
    });
    if (!appt) throw new NotFoundException('Agendamento não encontrado');
    this.assertAccess(appt.organizationId, user);
    return appt;
  }

  async transition(
    id: string,
    newStatus: AppointmentStatus,
    opts: { reason?: string; rowVersion: number },
    user: AuthenticatedUser,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const appt = await tx.appointment.findUnique({ where: { id } });
      if (!appt) throw new NotFoundException('Agendamento não encontrado');
      this.assertAccess(appt.organizationId, user);

      if (appt.rowVersion !== opts.rowVersion) {
        throw new ConflictException('Registro alterado por outro usuário. Recarregue e tente novamente.');
      }

      const allowed = VALID_TRANSITIONS[appt.status];
      if (!allowed.includes(newStatus)) {
        throw new BadRequestException(
          `Transição inválida: ${appt.status} → ${newStatus}. Permitido: ${allowed.join(', ')}`,
        );
      }

      const now = new Date();
      const timestamps: Record<string, Date | null> = {};
      if (newStatus === 'AGUARDANDO') timestamps.checkInAt = now;
      if (newStatus === 'EM_ATENDIMENTO') {
        timestamps.startedAt = now;
        const waitStart = appt.checkInAt ?? appt.waitingStartAt ?? appt.startsAt;
        timestamps.waitingMinutes = Math.round((now.getTime() - waitStart.getTime()) / 60000) as any;
        if (now > appt.startsAt) {
          timestamps.delayMinutes = Math.round((now.getTime() - appt.startsAt.getTime()) / 60000) as any;
        }
      }
      if (newStatus === 'FINALIZADO') {
        timestamps.finishedAt = now;
        timestamps.checkOutAt = now;
      }

      const updated = await tx.appointment.update({
        where: { id },
        data: {
          status: newStatus,
          cancelReason: newStatus === 'CANCELADO' ? (opts.reason ?? null) : undefined,
          ...timestamps,
          rowVersion: { increment: 1 },
        },
      });

      await tx.appointmentHistory.create({
        data: {
          id: randomUUID(),
          appointmentId: id,
          fromStatus: appt.status,
          toStatus: newStatus,
          changedBy: user.userId ?? user.sub,
          reason: opts.reason ?? null,
        },
      });

      return updated;
    });
  }

  // Used by public token action endpoint — skips tenant check (org checked via token payload).
  async findOneInternal(id: string) {
    return this.prisma.appointment.findUnique({ where: { id } });
  }

  async reschedule(id: string, dto: RescheduleDto, user: AuthenticatedUser) {
    return this.prisma.$transaction(async (tx) => {
      const appt = await tx.appointment.findUnique({ where: { id } });
      if (!appt) throw new NotFoundException('Agendamento não encontrado');
      this.assertAccess(appt.organizationId, user);

      if (appt.rowVersion !== dto.rowVersion) {
        throw new ConflictException('Registro alterado por outro usuário. Recarregue e tente novamente.');
      }

      const newStart = new Date(dto.startsAt);
      const newEnd = new Date(dto.endsAt);

      if (!['AGENDADO', 'CONFIRMADO'].includes(appt.status)) {
        throw new BadRequestException('Apenas agendamentos AGENDADO ou CONFIRMADO podem ser reagendados');
      }

      const lockKey = this.conflictService.buildLockKey({
        professionalId: appt.professionalId ?? undefined,
        resourceId: appt.resourceId ?? undefined,
        startsAt: newStart,
      });
      await this.conflictService.acquireLock(tx, lockKey);
      await this.conflictService.assertNoConflict(tx, {
        startsAt: newStart,
        endsAt: newEnd,
        professionalId: appt.professionalId ?? undefined,
        resourceId: appt.resourceId ?? undefined,
        excludeAppointmentId: id,
      });

      // Mark old as REAGENDADO, create new appointment
      await tx.appointment.update({
        where: { id },
        data: { status: 'REAGENDADO', rowVersion: { increment: 1 } },
      });
      await tx.appointmentHistory.create({
        data: {
          id: randomUUID(),
          appointmentId: id,
          fromStatus: appt.status,
          toStatus: 'REAGENDADO',
          changedBy: user.userId ?? user.sub,
          reason: dto.reason ?? null,
        },
      });

      const newAppt = await tx.appointment.create({
        data: {
          id: randomUUID(),
          organizationId: appt.organizationId,
          unitId: appt.unitId,
          professionalId: appt.professionalId,
          serviceId: appt.serviceId,
          resourceId: appt.resourceId,
          patientId: appt.patientId,
          seriesId: appt.seriesId,
          type: appt.type,
          status: 'AGENDADO',
          startsAt: newStart,
          endsAt: newEnd,
          notes: appt.notes,
          isOnlineBooking: appt.isOnlineBooking,
        },
      });

      await tx.appointmentHistory.create({
        data: {
          id: randomUUID(),
          appointmentId: newAppt.id,
          toStatus: 'AGENDADO',
          changedBy: user.userId ?? user.sub,
          reason: `Reagendado de ${id}`,
        },
      });

      return newAppt;
    });
  }
}
