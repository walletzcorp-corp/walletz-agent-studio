import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { randomUUID } from 'crypto';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { TicketStatus } from '@prisma/client';

// RF-AGE-015: Fila física com senhas, painel e prioridade legal configurável

const PRIORITY_LABELS: Record<number, string> = {
  0: 'Normal',
  1: 'Idoso (60+)',
  2: 'Gestante',
  3: 'Deficiente',
  4: 'Emergência',
};

@Injectable()
export class QueueService {
  constructor(private readonly prisma: PrismaService) {}

  private assertAccess(organizationId: string, user: AuthenticatedUser) {
    if (!user.isWalletzAdmin && !user.organizationIds.includes(organizationId)) {
      throw new ForbiddenException('Sem acesso a esta organização');
    }
  }

  async getOrCreateQueue(unitId: string, date: string, user: AuthenticatedUser) {
    const unit = await this.prisma.unit.findUnique({
      where: { id: unitId },
      select: { organizationId: true },
    });
    if (!unit) throw new NotFoundException('Unidade não encontrada');
    this.assertAccess(unit.organizationId, user);

    const dateObj = new Date(date);

    return this.prisma.queue.upsert({
      where: { unitId_date: { unitId, date: dateObj } },
      create: {
        id: randomUUID(),
        unitId,
        organizationId: unit.organizationId,
        date: dateObj,
        status: 'ABERTA',
        lastTicketNumber: 0,
      },
      update: {},
      include: {
        tickets: {
          orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
          include: { patient: { select: { id: true, name: true } } },
        },
      },
    });
  }

  async issueTicket(
    queueId: string,
    dto: {
      patientId?: string;
      serviceId?: string;
      professionalId?: string;
      priority?: number;
    },
    user: AuthenticatedUser,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const queue = await tx.queue.findUnique({ where: { id: queueId } });
      if (!queue) throw new NotFoundException('Fila não encontrada');
      this.assertAccess(queue.organizationId, user);

      if (queue.status !== 'ABERTA') {
        throw new BadRequestException('Fila não está aberta para novas senhas');
      }

      const next = queue.lastTicketNumber + 1;
      const priority = dto.priority ?? 0;
      const prefix = priority > 0 ? 'P' : 'A';
      const ticketNumber = `${prefix}${String(next).padStart(3, '0')}`;

      await tx.queue.update({
        where: { id: queueId },
        data: { lastTicketNumber: next },
      });

      return tx.queueTicket.create({
        data: {
          id: randomUUID(),
          queueId,
          patientId: dto.patientId ?? null,
          serviceId: dto.serviceId ?? null,
          professionalId: dto.professionalId ?? null,
          ticketNumber,
          priority,
          priorityLabel: PRIORITY_LABELS[priority] ?? 'Normal',
          status: 'AGUARDANDO',
        },
        include: {
          patient: { select: { id: true, name: true } },
        },
      });
    });
  }

  async callNext(queueId: string, user: AuthenticatedUser) {
    return this.prisma.$transaction(async (tx) => {
      const queue = await tx.queue.findUnique({ where: { id: queueId } });
      if (!queue) throw new NotFoundException('Fila não encontrada');
      this.assertAccess(queue.organizationId, user);

      const next = await tx.queueTicket.findFirst({
        where: { queueId, status: 'AGUARDANDO' },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      });

      if (!next) throw new NotFoundException('Nenhuma senha aguardando na fila');

      return tx.queueTicket.update({
        where: { id: next.id },
        data: { status: 'CHAMADO', calledAt: new Date() },
        include: { patient: { select: { id: true, name: true } } },
      });
    });
  }

  async updateTicketStatus(
    ticketId: string,
    newStatus: TicketStatus,
    user: AuthenticatedUser,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const ticket = await tx.queueTicket.findUnique({
        where: { id: ticketId },
        include: { queue: { select: { organizationId: true } } },
      });
      if (!ticket) throw new NotFoundException('Senha não encontrada');
      this.assertAccess(ticket.queue.organizationId, user);

      const now = new Date();
      const timestamps: Record<string, Date> = {};
      if (newStatus === 'EM_ATENDIMENTO') timestamps.startedAt = now;
      if (newStatus === 'FINALIZADO') timestamps.finishedAt = now;

      return tx.queueTicket.update({
        where: { id: ticketId },
        data: { status: newStatus, ...timestamps },
      });
    });
  }

  async setQueueStatus(queueId: string, status: 'ABERTA' | 'PAUSADA' | 'FECHADA', user: AuthenticatedUser) {
    const queue = await this.prisma.queue.findUnique({ where: { id: queueId } });
    if (!queue) throw new NotFoundException('Fila não encontrada');
    this.assertAccess(queue.organizationId, user);

    return this.prisma.queue.update({
      where: { id: queueId },
      data: { status },
    });
  }
}
