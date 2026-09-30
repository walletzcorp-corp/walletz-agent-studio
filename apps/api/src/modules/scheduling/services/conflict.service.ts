import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

export interface BookingSlot {
  startsAt: Date;
  endsAt: Date;
  professionalId?: string;
  resourceId?: string;
  excludeAppointmentId?: string;
}

@Injectable()
export class ConflictService {
  constructor(private readonly prisma: PrismaService) {}

  // RF-AGE-003: Detecção de conflitos — profissional, sala/recurso
  // Advisory lock evita dupla ocupação em tentativas simultâneas
  async assertNoConflict(tx: any, slot: BookingSlot): Promise<void> {
    const { startsAt, endsAt, professionalId, resourceId, excludeAppointmentId } = slot;

    const activeStatuses = ['AGENDADO', 'CONFIRMADO', 'AGUARDANDO', 'EM_ATENDIMENTO'];
    const baseWhere = {
      status: { in: activeStatuses },
      AND: [
        { startsAt: { lt: endsAt } },
        { endsAt: { gt: startsAt } },
      ],
      ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
    };

    if (professionalId) {
      const conflict = await tx.appointment.findFirst({
        where: { ...baseWhere, professionalId },
        select: { id: true, startsAt: true, endsAt: true },
      });
      if (conflict) {
        throw new ConflictException(
          `Profissional já possui agendamento no horário ${conflict.startsAt.toISOString()} – ${conflict.endsAt.toISOString()}`,
        );
      }
    }

    if (resourceId) {
      const conflict = await tx.appointment.findFirst({
        where: { ...baseWhere, resourceId },
        select: { id: true, startsAt: true, endsAt: true },
      });
      if (conflict) {
        throw new ConflictException(
          `Recurso já reservado no horário ${conflict.startsAt.toISOString()} – ${conflict.endsAt.toISOString()}`,
        );
      }
    }
  }

  // Acquires PostgreSQL advisory lock to prevent race conditions (RF-AGE-003)
  async acquireLock(tx: any, key: string): Promise<void> {
    await tx.$executeRawUnsafe(
      `SELECT pg_advisory_xact_lock(hashtext($1))`,
      key,
    );
  }

  buildLockKey(params: {
    professionalId?: string;
    resourceId?: string;
    startsAt: Date;
  }): string {
    const parts = [
      params.professionalId ?? '',
      params.resourceId ?? '',
      params.startsAt.toISOString().slice(0, 16),
    ];
    return `appointment:${parts.join(':')}`;
  }
}
