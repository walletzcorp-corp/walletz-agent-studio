import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

export interface TimeSlot {
  startsAt: Date;
  endsAt: Date;
}

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async getFreeSlots(params: {
    unitId: string;
    professionalId?: string;
    serviceId?: string;
    date: string; // YYYY-MM-DD
    durationMin: number;
  }): Promise<TimeSlot[]> {
    const { unitId, professionalId, date, durationMin } = params;
    const dayDate = new Date(date);
    const dayOfWeek = dayDate.getDay();

    const rules = await this.prisma.availabilityRule.findMany({
      where: {
        unitId,
        professionalId: professionalId ?? null,
        dayOfWeek,
        active: true,
        OR: [
          { validFrom: null },
          { validFrom: { lte: dayDate } },
        ],
        AND: [
          {
            OR: [
              { validUntil: null },
              { validUntil: { gte: dayDate } },
            ],
          },
        ],
      },
    });

    if (rules.length === 0) return [];

    const startOfDay = new Date(`${date}T00:00:00`);

    const allSlots: TimeSlot[] = [];
    for (const rule of rules) {
      const [sh, sm] = rule.startTime.split(':').map(Number);
      const [eh, em] = rule.endTime.split(':').map(Number);
      const ruleStart = new Date(startOfDay);
      ruleStart.setHours(sh, sm, 0, 0);
      const ruleEnd = new Date(startOfDay);
      ruleEnd.setHours(eh, em, 0, 0);

      let cursor = new Date(ruleStart);
      while (cursor.getTime() + durationMin * 60000 <= ruleEnd.getTime()) {
        allSlots.push({
          startsAt: new Date(cursor),
          endsAt: new Date(cursor.getTime() + durationMin * 60000),
        });
        cursor = new Date(cursor.getTime() + rule.slotMin * 60000);
      }
    }

    const dayStart = new Date(`${date}T00:00:00`);
    const dayEnd = new Date(`${date}T23:59:59`);

    const existing = await this.prisma.appointment.findMany({
      where: {
        unitId,
        professionalId: professionalId ?? undefined,
        startsAt: { gte: dayStart, lte: dayEnd },
        status: { notIn: ['CANCELADO', 'NAO_COMPARECEU', 'REAGENDADO'] },
      },
      select: { startsAt: true, endsAt: true },
    });

    return allSlots.filter((slot) =>
      !existing.some(
        (e) =>
          slot.startsAt < e.endsAt && slot.endsAt > e.startsAt,
      ),
    );
  }

  async createRule(
    dto: {
      unitId: string;
      professionalId?: string;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      slotMin?: number;
      validFrom?: string;
      validUntil?: string;
    },
  ) {
    return this.prisma.availabilityRule.create({
      data: {
        unitId: dto.unitId,
        professionalId: dto.professionalId ?? null,
        dayOfWeek: dto.dayOfWeek,
        startTime: dto.startTime,
        endTime: dto.endTime,
        slotMin: dto.slotMin ?? 30,
        active: true,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
      },
    });
  }

  async listRules(unitId: string, professionalId?: string) {
    return this.prisma.availabilityRule.findMany({
      where: {
        unitId,
        professionalId: professionalId ?? undefined,
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  async deleteRule(id: string) {
    return this.prisma.availabilityRule.delete({ where: { id } });
  }
}
