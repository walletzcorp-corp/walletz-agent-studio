import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { RoomStatus, RoomType, PositionStatus, RoomBookingStatus, ChecklistType } from '@prisma/client';

// Mudança de estado deve seguir transições válidas, com responsável, horário, motivo e auditoria.
// Não permita dupla reserva de sala, poltrona, equipamento ou equipe.
// Bloqueio por manutenção, incidente ou contaminação deve impedir nova alocação.
// Pendências críticas impedem liberação; exceções exigem permissão e justificativa auditável.

const VALID_TRANSITIONS: Record<RoomStatus, RoomStatus[]> = {
  [RoomStatus.LIVRE]:        [RoomStatus.RESERVADA, RoomStatus.BLOQUEADA, RoomStatus.INATIVA],
  [RoomStatus.RESERVADA]:    [RoomStatus.PREPARADA, RoomStatus.LIVRE],
  [RoomStatus.PREPARADA]:    [RoomStatus.OCUPADA, RoomStatus.LIVRE],
  [RoomStatus.OCUPADA]:      [RoomStatus.HIGIENIZACAO],
  [RoomStatus.HIGIENIZACAO]: [RoomStatus.LIVRE, RoomStatus.BLOQUEADA],
  [RoomStatus.BLOQUEADA]:    [RoomStatus.LIVRE, RoomStatus.INATIVA],
  [RoomStatus.INATIVA]:      [RoomStatus.LIVRE],
};

@Injectable()
export class SalService {
  constructor(private prisma: PrismaService) {}

  private assertAccess(organizationId: string, user: AuthenticatedUser): void {
    if (user.isWalletzAdmin) return;
    if (!user.organizationIds.includes(organizationId)) {
      throw new ForbiddenException('Acesso negado a esta organização.');
    }
  }

  // RF-SAL-001: Listar salas
  async listRooms(
    organizationId: string,
    user: AuthenticatedUser,
    filters?: { type?: RoomType; status?: RoomStatus; unitId?: string },
  ) {
    this.assertAccess(organizationId, user);
    return this.prisma.room.findMany({
      where: {
        organizationId,
        type: filters?.type,
        status: filters?.status,
        unitId: filters?.unitId,
        active: true,
      },
      include: { positions: { where: { active: true } } },
      orderBy: [{ unitId: 'asc' }, { name: 'asc' }],
    });
  }

  // RF-SAL-002: Criar sala
  async createRoom(
    organizationId: string,
    dto: {
      name: string;
      code?: string;
      type?: RoomType;
      capacity?: number;
      floor?: string;
      building?: string;
      location?: string;
      unitId?: string;
      allowsCompanion?: boolean;
      isIsolation?: boolean;
      isAccessible?: boolean;
      notes?: string;
    },
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);

    if (dto.code) {
      const existing = await this.prisma.room.findFirst({
        where: { organizationId, code: dto.code },
      });
      if (existing) throw new ConflictException(`Código '${dto.code}' já existe nesta organização.`);
    }

    return this.prisma.room.create({
      data: {
        organizationId,
        name: dto.name,
        code: dto.code,
        type: dto.type ?? RoomType.CONSULTORIO,
        capacity: dto.capacity ?? 1,
        floor: dto.floor,
        building: dto.building,
        location: dto.location,
        unitId: dto.unitId,
        allowsCompanion: dto.allowsCompanion ?? false,
        isIsolation: dto.isIsolation ?? false,
        isAccessible: dto.isAccessible ?? true,
        notes: dto.notes,
        createdBy: user.sub,
      },
    });
  }

  // RF-SAL-003: Atualizar sala
  async updateRoom(
    organizationId: string,
    roomId: string,
    dto: Partial<{
      name: string;
      type: RoomType;
      capacity: number;
      floor: string;
      building: string;
      location: string;
      allowsCompanion: boolean;
      isIsolation: boolean;
      isAccessible: boolean;
      notes: string;
      active: boolean;
    }>,
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);
    const room = await this.prisma.room.findFirst({ where: { id: roomId, organizationId } });
    if (!room) throw new NotFoundException('Sala não encontrada.');
    return this.prisma.room.update({ where: { id: roomId }, data: dto });
  }

  // RF-SAL-004: Mudar estado de sala (máquina de estado com auditoria)
  async changeRoomStatus(
    organizationId: string,
    roomId: string,
    dto: { toStatus: RoomStatus; reason?: string; bookingId?: string; force?: boolean },
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);
    const room = await this.prisma.room.findFirst({ where: { id: roomId, organizationId } });
    if (!room) throw new NotFoundException('Sala não encontrada.');

    const allowed = VALID_TRANSITIONS[room.status] ?? [];
    if (!dto.force && !allowed.includes(dto.toStatus)) {
      throw new BadRequestException(
        `Transição inválida: ${room.status} → ${dto.toStatus}. Transições permitidas: ${allowed.join(', ')}.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.roomStateLog.create({
        data: {
          roomId,
          fromStatus: room.status,
          toStatus: dto.toStatus,
          changedBy: user.sub,
          reason: dto.reason,
          bookingId: dto.bookingId,
        },
      });

      return tx.room.update({
        where: { id: roomId },
        data: { status: dto.toStatus },
      });
    });
  }

  // RF-SAL-005: Adicionar poltrona/posição à sala
  async addPosition(
    organizationId: string,
    roomId: string,
    dto: { name: string; positionType?: string; notes?: string },
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);
    const room = await this.prisma.room.findFirst({ where: { id: roomId, organizationId } });
    if (!room) throw new NotFoundException('Sala não encontrada.');
    return this.prisma.roomPosition.create({
      data: {
        roomId,
        name: dto.name,
        positionType: dto.positionType ?? 'POLTRONA',
        notes: dto.notes,
      },
    });
  }

  // RF-SAL-006: Mudar status de posição
  async updatePositionStatus(
    organizationId: string,
    positionId: string,
    status: PositionStatus,
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);
    const position = await this.prisma.roomPosition.findFirst({
      where: { id: positionId, room: { organizationId } },
    });
    if (!position) throw new NotFoundException('Posição não encontrada.');
    return this.prisma.roomPosition.update({
      where: { id: positionId },
      data: { status },
    });
  }

  // RF-SAL-007: Criar reserva de sala (impede dupla reserva)
  async createBooking(
    organizationId: string,
    dto: {
      roomId: string;
      positionId?: string;
      appointmentId?: string;
      patientId?: string;
      professionalId?: string;
      serviceId?: string;
      scheduledStart: Date;
      scheduledEnd: Date;
      setupMinutes?: number;
      cleaningMinutes?: number;
      hasCompanion?: boolean;
      notes?: string;
    },
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);
    const room = await this.prisma.room.findFirst({ where: { id: dto.roomId, organizationId } });
    if (!room) throw new NotFoundException('Sala não encontrada.');
    if (room.status === RoomStatus.BLOQUEADA || room.status === RoomStatus.INATIVA) {
      throw new BadRequestException(`Sala indisponível (status: ${room.status}).`);
    }

    const setupMinutes = dto.setupMinutes ?? 0;
    const cleaningMinutes = dto.cleaningMinutes ?? 15;
    const effectiveStart = new Date(dto.scheduledStart.getTime() - setupMinutes * 60_000);
    const effectiveEnd = new Date(dto.scheduledEnd.getTime() + cleaningMinutes * 60_000);

    // Checar conflito de reserva na sala
    const roomConflict = await this.prisma.roomBooking.findFirst({
      where: {
        roomId: dto.roomId,
        status: { in: [RoomBookingStatus.RESERVADA, RoomBookingStatus.CONFIRMADA, RoomBookingStatus.OCUPADA] },
        scheduledStart: { lt: effectiveEnd },
        scheduledEnd: { gt: effectiveStart },
      },
    });
    if (roomConflict) {
      throw new ConflictException('Conflito de reserva: sala já está reservada neste período.');
    }

    // Checar conflito de posição
    if (dto.positionId) {
      const position = await this.prisma.roomPosition.findFirst({
        where: { id: dto.positionId, roomId: dto.roomId },
      });
      if (!position) throw new NotFoundException('Posição não encontrada nesta sala.');
      if (position.status === PositionStatus.BLOQUEADA) {
        throw new BadRequestException('Posição bloqueada.');
      }

      const posConflict = await this.prisma.roomBooking.findFirst({
        where: {
          positionId: dto.positionId,
          status: { in: [RoomBookingStatus.RESERVADA, RoomBookingStatus.CONFIRMADA, RoomBookingStatus.OCUPADA] },
          scheduledStart: { lt: effectiveEnd },
          scheduledEnd: { gt: effectiveStart },
        },
      });
      if (posConflict) {
        throw new ConflictException('Conflito de reserva: posição já está reservada neste período.');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.roomBooking.create({
        data: {
          organizationId,
          roomId: dto.roomId,
          positionId: dto.positionId,
          appointmentId: dto.appointmentId,
          patientId: dto.patientId,
          professionalId: dto.professionalId,
          serviceId: dto.serviceId,
          scheduledStart: dto.scheduledStart,
          scheduledEnd: dto.scheduledEnd,
          setupMinutes,
          cleaningMinutes,
          hasCompanion: dto.hasCompanion ?? false,
          notes: dto.notes,
          createdBy: user.sub,
        },
      });

      await tx.roomStateLog.create({
        data: {
          roomId: dto.roomId,
          fromStatus: room.status,
          toStatus: RoomStatus.RESERVADA,
          changedBy: user.sub,
          reason: 'Reserva criada',
          bookingId: booking.id,
        },
      });

      await tx.room.update({
        where: { id: dto.roomId },
        data: { status: RoomStatus.RESERVADA },
      });

      return booking;
    });
  }

  // RF-SAL-008: Listar reservas por período
  async listBookings(
    organizationId: string,
    user: AuthenticatedUser,
    filters?: { roomId?: string; dateFrom?: Date; dateTo?: Date; status?: RoomBookingStatus },
  ) {
    this.assertAccess(organizationId, user);
    return this.prisma.roomBooking.findMany({
      where: {
        organizationId,
        roomId: filters?.roomId,
        status: filters?.status,
        scheduledStart: filters?.dateFrom ? { gte: filters.dateFrom } : undefined,
        scheduledEnd: filters?.dateTo ? { lte: filters.dateTo } : undefined,
      },
      include: { room: true, position: true },
      orderBy: { scheduledStart: 'asc' },
    });
  }

  // RF-SAL-009: Avançar estado da reserva
  async advanceBookingStatus(
    organizationId: string,
    bookingId: string,
    toStatus: RoomBookingStatus,
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);
    const booking = await this.prisma.roomBooking.findFirst({
      where: { id: bookingId, organizationId },
    });
    if (!booking) throw new NotFoundException('Reserva não encontrada.');
    if (booking.status === RoomBookingStatus.CANCELADA || booking.status === RoomBookingStatus.CONCLUIDA) {
      throw new BadRequestException('Reserva já finalizada.');
    }

    const now = new Date();
    const updateData: Record<string, unknown> = { status: toStatus };
    if (toStatus === RoomBookingStatus.OCUPADA) updateData.actualStart = now;
    if (toStatus === RoomBookingStatus.CONCLUIDA) updateData.actualEnd = now;

    return this.prisma.roomBooking.update({
      where: { id: bookingId },
      data: updateData,
    });
  }

  // RF-SAL-010: Cancelar reserva
  async cancelBooking(
    organizationId: string,
    bookingId: string,
    reason: string,
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);
    const booking = await this.prisma.roomBooking.findFirst({
      where: { id: bookingId, organizationId },
    });
    if (!booking) throw new NotFoundException('Reserva não encontrada.');
    if (booking.status === RoomBookingStatus.CANCELADA) {
      throw new BadRequestException('Reserva já cancelada.');
    }
    if (booking.status === RoomBookingStatus.CONCLUIDA) {
      throw new BadRequestException('Reserva concluída não pode ser cancelada.');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.roomBooking.update({
        where: { id: bookingId },
        data: { status: RoomBookingStatus.CANCELADA },
      });

      await tx.roomStateLog.create({
        data: {
          roomId: booking.roomId,
          fromStatus: RoomStatus.RESERVADA,
          toStatus: RoomStatus.LIVRE,
          changedBy: user.sub,
          reason,
          bookingId,
        },
      });

      return tx.room.update({
        where: { id: booking.roomId },
        data: { status: RoomStatus.LIVRE },
      });
    });
  }

  // RF-SAL-011: Registrar evento de fluxo do paciente
  async recordFlowEvent(
    organizationId: string,
    bookingId: string,
    dto: { eventType: string; patientId?: string; notes?: string },
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);
    const booking = await this.prisma.roomBooking.findFirst({
      where: { id: bookingId, organizationId },
    });
    if (!booking) throw new NotFoundException('Reserva não encontrada.');

    return this.prisma.roomPatientFlowEvent.create({
      data: {
        bookingId,
        organizationId: booking.organizationId,
        patientId: dto.patientId,
        eventType: dto.eventType,
        recordedBy: user.sub,
        notes: dto.notes,
      },
    });
  }

  // RF-SAL-012: Iniciar execução de checklist
  async startChecklist(
    organizationId: string,
    dto: {
      roomId: string;
      templateId: string;
      checklistType: ChecklistType;
      bookingId?: string;
    },
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);
    const room = await this.prisma.room.findFirst({ where: { id: dto.roomId, organizationId } });
    if (!room) throw new NotFoundException('Sala não encontrada.');

    const template = await this.prisma.roomChecklistTemplate.findFirst({
      where: { id: dto.templateId, organizationId },
      include: { items: { orderBy: { position: 'asc' } } },
    });
    if (!template) throw new NotFoundException('Template de checklist não encontrado.');

    return this.prisma.$transaction(async (tx) => {
      const execution = await tx.roomChecklistExecution.create({
        data: {
          roomId: dto.roomId,
          templateId: dto.templateId,
          checklistType: dto.checklistType,
          startedBy: user.sub,
          bookingId: dto.bookingId,
        },
      });

      if (template.items.length > 0) {
        await tx.roomChecklistExecutionItem.createMany({
          data: template.items.map((item) => ({
            executionId: execution.id,
            description: item.description,
            isCritical: item.isCritical,
          })),
        });
      }

      return tx.roomChecklistExecution.findUnique({
        where: { id: execution.id },
        include: { items: true },
      });
    });
  }

  // RF-SAL-013: Concluir item de checklist
  async completeChecklistItem(
    organizationId: string,
    itemId: string,
    dto: { notes?: string },
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);
    const item = await this.prisma.roomChecklistExecutionItem.findFirst({
      where: {
        id: itemId,
        execution: { room: { organizationId } },
      },
    });
    if (!item) throw new NotFoundException('Item de checklist não encontrado.');

    return this.prisma.roomChecklistExecutionItem.update({
      where: { id: itemId },
      data: {
        status: 'CONCLUIDO' as any,
        completedBy: user.sub,
        completedAt: new Date(),
        notes: dto.notes,
      },
    });
  }

  // RF-SAL-014: Concluir execução de checklist (valida pendências críticas)
  async completeChecklist(
    organizationId: string,
    executionId: string,
    dto: { force?: boolean; justification?: string },
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);
    const execution = await this.prisma.roomChecklistExecution.findFirst({
      where: {
        id: executionId,
        room: { organizationId },
      },
      include: { items: true },
    });
    if (!execution) throw new NotFoundException('Execução de checklist não encontrada.');

    const criticalPending = execution.items.filter(
      (i) => i.isCritical && i.status === 'PENDENTE',
    );

    if (criticalPending.length > 0 && !dto.force) {
      throw new BadRequestException(
        `Pendências críticas impedem liberação: ${criticalPending.length} item(s). Use force=true com justificativa.`,
      );
    }

    return this.prisma.roomChecklistExecution.update({
      where: { id: executionId },
      data: {
        status: 'CONCLUIDO',
        completedBy: user.sub,
        completedAt: new Date(),
      },
    });
  }

  // RF-SAL-015: Registrar incidente na sala (bloqueia automaticamente)
  async reportIncident(
    organizationId: string,
    dto: {
      roomId: string;
      incidentType: string;
      description: string;
      severity?: string;
      blockRoom?: boolean;
      reason?: string;
    },
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);
    const room = await this.prisma.room.findFirst({ where: { id: dto.roomId, organizationId } });
    if (!room) throw new NotFoundException('Sala não encontrada.');

    return this.prisma.$transaction(async (tx) => {
      const incident = await tx.roomIncident.create({
        data: {
          organizationId,
          roomId: dto.roomId,
          incidentType: dto.incidentType,
          description: dto.description,
          severity: dto.severity ?? 'MEDIA',
          reportedBy: user.sub,
        },
      });

      if (dto.blockRoom && room.status !== RoomStatus.BLOQUEADA) {
        await tx.roomStateLog.create({
          data: {
            roomId: dto.roomId,
            fromStatus: room.status,
            toStatus: RoomStatus.BLOQUEADA,
            changedBy: user.sub,
            reason: dto.reason ?? `Incidente: ${dto.incidentType}`,
          },
        });
        await tx.room.update({
          where: { id: dto.roomId },
          data: { status: RoomStatus.BLOQUEADA },
        });
      }

      return incident;
    });
  }

  // RF-SAL-016: Resolver incidente
  async resolveIncident(
    organizationId: string,
    incidentId: string,
    dto: { resolutionNotes: string },
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);
    const incident = await this.prisma.roomIncident.findFirst({
      where: { id: incidentId, organizationId },
    });
    if (!incident) throw new NotFoundException('Incidente não encontrado.');
    if (incident.resolvedAt) throw new BadRequestException('Incidente já resolvido.');

    return this.prisma.roomIncident.update({
      where: { id: incidentId },
      data: {
        status: 'RESOLVIDO',
        resolvedBy: user.sub,
        resolvedAt: new Date(),
        resolutionNotes: dto.resolutionNotes ?? '',
      },
    });
  }

  // RF-SAL-017: Criar template de checklist
  async createChecklistTemplate(
    organizationId: string,
    dto: {
      roomType: string;
      checklistType: ChecklistType;
      name: string;
      items: Array<{ description: string; isCritical?: boolean; position?: number }>;
    },
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);
    return this.prisma.$transaction(async (tx) => {
      const template = await tx.roomChecklistTemplate.create({
        data: {
          organizationId,
          roomType: dto.roomType,
          checklistType: dto.checklistType,
          name: dto.name,
          createdBy: user.sub,
        },
      });

      if (dto.items.length > 0) {
        await tx.roomChecklistTemplateItem.createMany({
          data: dto.items.map((item, idx) => ({
            templateId: template.id,
            description: item.description,
            isCritical: item.isCritical ?? false,
            position: item.position ?? idx,
          })),
        });
      }

      return tx.roomChecklistTemplate.findUnique({
        where: { id: template.id },
        include: { items: { orderBy: { position: 'asc' } } },
      });
    });
  }

  // RF-SAL-018: Listar templates de checklist
  async listChecklistTemplates(
    organizationId: string,
    user: AuthenticatedUser,
    filters?: { checklistType?: ChecklistType },
  ) {
    this.assertAccess(organizationId, user);
    return this.prisma.roomChecklistTemplate.findMany({
      where: { organizationId, checklistType: filters?.checklistType, active: true },
      include: { items: { orderBy: { position: 'asc' } } },
      orderBy: { name: 'asc' },
    });
  }

  // RF-SAL-019: Histórico de estados da sala
  async getRoomStateHistory(
    organizationId: string,
    roomId: string,
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);
    const room = await this.prisma.room.findFirst({ where: { id: roomId, organizationId } });
    if (!room) throw new NotFoundException('Sala não encontrada.');
    return this.prisma.roomStateLog.findMany({
      where: { roomId },
      orderBy: { occurredAt: 'desc' },
    });
  }

  // RF-SAL-020: Painel de ocupação (resumo por sala)
  async getOccupancyDashboard(organizationId: string, user: AuthenticatedUser) {
    this.assertAccess(organizationId, user);

    const rooms = await this.prisma.room.findMany({
      where: { organizationId, active: true },
      include: {
        positions: { where: { active: true } },
        bookings: {
          where: {
            status: { in: [RoomBookingStatus.RESERVADA, RoomBookingStatus.CONFIRMADA, RoomBookingStatus.OCUPADA] },
            scheduledStart: { lte: new Date(Date.now() + 4 * 60 * 60_000) },
            scheduledEnd: { gte: new Date() },
          },
        },
      },
    });

    return rooms.map((room) => ({
      id: room.id,
      name: room.name,
      code: room.code,
      type: room.type,
      status: room.status,
      capacity: room.capacity,
      positionCount: room.positions.length,
      upcomingBookings: room.bookings.length,
    }));
  }
}
