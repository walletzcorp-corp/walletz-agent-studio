import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  TelRoomStatus,
  TelParticipantRole,
  TelParticipantStatus,
  TelEventType,
  TelDocumentStatus,
  Prisma,
} from '@prisma/client';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { randomBytes } from 'crypto';

@Injectable()
export class TelService {
  constructor(private readonly prisma: PrismaService) {}

  private assertAccess(organizationId: string, user: AuthenticatedUser) {
    if (user.isWalletzAdmin) return;
    if (!user.organizationIds.includes(organizationId)) {
      throw new ForbiddenException('Acesso negado à organização');
    }
  }

  private generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  private async logEvent(
    roomId: string,
    eventType: TelEventType,
    actorId: string,
    actorRole: TelParticipantRole,
    metadata: Record<string, unknown> = {},
  ) {
    await this.prisma.telEvent.create({
      data: {
        roomId,
        eventType,
        actorId,
        actorRole,
        metadata: metadata as Prisma.InputJsonValue,
      },
    });
  }

  // ── RF-TEL-001: Criar sala virtual ─────────────────────────────────────────

  async createRoom(
    organizationId: string,
    user: AuthenticatedUser,
    data: {
      appointmentId: string;
      scheduledAt: Date;
      participantUserId?: string;
      participantDisplayName?: string;
      patientId?: string;
      patientDisplayName?: string;
    },
  ) {
    this.assertAccess(organizationId, user);

    // RV-TELE-001: agendamento deve pertencer à organização
    const appointment = await this.prisma.appointment.findFirst({
      where: { id: data.appointmentId, organizationId },
    });
    if (!appointment) {
      throw new NotFoundException('Agendamento não encontrado na organização');
    }

    // RV-TELE-001: uma sala por agendamento
    const existing = await this.prisma.telRoom.findUnique({
      where: { appointmentId: data.appointmentId },
    });
    if (existing) {
      throw new ConflictException('Já existe uma sala para este agendamento');
    }

    const room = await this.prisma.$transaction(async (tx) => {
      const created = await tx.telRoom.create({
        data: {
          organizationId,
          appointmentId: data.appointmentId,
          scheduledAt: data.scheduledAt,
          createdBy: user.sub,
        },
      });

      // Profissional como participante
      await tx.telParticipant.create({
        data: {
          roomId: created.id,
          role: TelParticipantRole.PROFISSIONAL,
          userId: data.participantUserId ?? user.sub,
          displayName: data.participantDisplayName ?? user.name ?? user.email,
        },
      });

      // Paciente como participante (se fornecido)
      if (data.patientId) {
        await tx.telParticipant.create({
          data: {
            roomId: created.id,
            role: TelParticipantRole.PACIENTE,
            patientId: data.patientId,
            displayName: data.patientDisplayName ?? 'Paciente',
          },
        });

        // RV-TELE-008: link de acesso para paciente
        const token = this.generateToken();
        const expiresAt = new Date(data.scheduledAt.getTime() + 48 * 60 * 60 * 1000);
        await tx.telAccessLink.create({
          data: {
            roomId: created.id,
            token,
            role: TelParticipantRole.PACIENTE,
            patientId: data.patientId,
            expiresAt,
          },
        });
      }

      await tx.telEvent.create({
        data: {
          roomId: created.id,
          eventType: TelEventType.SALA_CRIADA,
          actorId: user.sub,
          actorRole: TelParticipantRole.PROFISSIONAL,
          metadata: { appointmentId: data.appointmentId } as Prisma.InputJsonValue,
        },
      });

      return created;
    });

    return room;
  }

  // ── RF-TEL-002: Consultar sala ──────────────────────────────────────────────

  async getRoom(organizationId: string, roomId: string, user: AuthenticatedUser) {
    this.assertAccess(organizationId, user);
    const room = await this.prisma.telRoom.findFirst({
      where: { id: roomId, organizationId },
      include: { participants: true, events: { orderBy: { occurredAt: 'asc' } } },
    });
    if (!room) throw new NotFoundException('Sala não encontrada');
    return room;
  }

  async listRooms(organizationId: string, user: AuthenticatedUser, filters: { status?: TelRoomStatus }) {
    this.assertAccess(organizationId, user);
    return this.prisma.telRoom.findMany({
      where: { organizationId, ...(filters.status ? { status: filters.status } : {}) },
      include: { participants: true },
      orderBy: { scheduledAt: 'desc' },
    });
  }

  // ── RF-TEL-003: Iniciar sala (profissional) ─────────────────────────────────

  async startRoom(organizationId: string, roomId: string, user: AuthenticatedUser) {
    this.assertAccess(organizationId, user);
    const room = await this.prisma.telRoom.findFirst({ where: { id: roomId, organizationId } });
    if (!room) throw new NotFoundException('Sala não encontrada');
    if (room.status === TelRoomStatus.EM_ANDAMENTO) {
      throw new BadRequestException('Sala já está em andamento');
    }
    if (room.status === TelRoomStatus.ENCERRADA || room.status === TelRoomStatus.CANCELADA) {
      throw new BadRequestException('Sala já foi encerrada ou cancelada');
    }

    const updated = await this.prisma.telRoom.update({
      where: { id: roomId },
      data: { status: TelRoomStatus.EM_ANDAMENTO, startedAt: new Date() },
    });

    await this.logEvent(roomId, TelEventType.CHAMADA_INICIADA, user.sub, TelParticipantRole.PROFISSIONAL);
    return updated;
  }

  // ── RF-TEL-004: Encerrar sala ───────────────────────────────────────────────
  // RV-TELE-006: encerramento não salva evolução automaticamente

  async endRoom(organizationId: string, roomId: string, user: AuthenticatedUser) {
    this.assertAccess(organizationId, user);
    const room = await this.prisma.telRoom.findFirst({ where: { id: roomId, organizationId } });
    if (!room) throw new NotFoundException('Sala não encontrada');
    if (room.status === TelRoomStatus.ENCERRADA) {
      throw new BadRequestException('Sala já encerrada');
    }
    if (room.status === TelRoomStatus.CANCELADA) {
      throw new BadRequestException('Sala cancelada não pode ser encerrada');
    }

    const updated = await this.prisma.telRoom.update({
      where: { id: roomId },
      data: { status: TelRoomStatus.ENCERRADA, endedAt: new Date() },
    });

    await this.logEvent(roomId, TelEventType.CHAMADA_ENCERRADA, user.sub, TelParticipantRole.PROFISSIONAL);
    return updated;
  }

  // ── RF-TEL-005: Cancelar sala ───────────────────────────────────────────────

  async cancelRoom(
    organizationId: string,
    roomId: string,
    user: AuthenticatedUser,
    reason: string,
  ) {
    this.assertAccess(organizationId, user);
    const room = await this.prisma.telRoom.findFirst({ where: { id: roomId, organizationId } });
    if (!room) throw new NotFoundException('Sala não encontrada');
    if (room.status === TelRoomStatus.ENCERRADA || room.status === TelRoomStatus.CANCELADA) {
      throw new BadRequestException('Sala não pode ser cancelada neste estado');
    }

    const updated = await this.prisma.telRoom.update({
      where: { id: roomId },
      data: {
        status: TelRoomStatus.CANCELADA,
        cancelReason: reason,
        cancelledBy: user.sub,
        cancelledAt: new Date(),
      },
    });

    await this.logEvent(roomId, TelEventType.SALA_CANCELADA, user.sub, TelParticipantRole.PROFISSIONAL, { reason });
    return updated;
  }

  // ── RF-TEL-006: Admitir paciente na sala ────────────────────────────────────
  // RV-TELE-003: paciente aguarda até profissional admitir

  async admitParticipant(
    organizationId: string,
    roomId: string,
    participantId: string,
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);
    const room = await this.prisma.telRoom.findFirst({ where: { id: roomId, organizationId } });
    if (!room) throw new NotFoundException('Sala não encontrada');
    if (room.status === TelRoomStatus.ENCERRADA || room.status === TelRoomStatus.CANCELADA) {
      throw new BadRequestException('Sala não está ativa');
    }

    const participant = await this.prisma.telParticipant.findFirst({
      where: { id: participantId, roomId },
    });
    if (!participant) throw new NotFoundException('Participante não encontrado');
    if (participant.status === TelParticipantStatus.ADMITIDO || participant.status === TelParticipantStatus.CONECTADO) {
      throw new BadRequestException('Participante já admitido');
    }

    const updated = await this.prisma.telParticipant.update({
      where: { id: participantId },
      data: {
        status: TelParticipantStatus.ADMITIDO,
        admittedAt: new Date(),
        admittedBy: user.sub,
      },
    });

    // Se a sala ainda estava AGUARDANDO, muda para EM_ANDAMENTO
    if (room.status === TelRoomStatus.AGUARDANDO) {
      await this.prisma.telRoom.update({
        where: { id: roomId },
        data: { status: TelRoomStatus.EM_ANDAMENTO, startedAt: new Date() },
      });
    }

    await this.logEvent(roomId, TelEventType.PARTICIPANTE_ADMITIDO, user.sub, TelParticipantRole.PROFISSIONAL, { participantId });
    return updated;
  }

  // ── RF-TEL-007: Registrar entrada de participante ───────────────────────────

  async participantJoined(
    roomId: string,
    participantId: string,
    actorId: string,
    actorRole: TelParticipantRole,
  ) {
    const room = await this.prisma.telRoom.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Sala não encontrada');
    if (room.status === TelRoomStatus.ENCERRADA || room.status === TelRoomStatus.CANCELADA) {
      throw new BadRequestException('Sala não está disponível');
    }

    const participant = await this.prisma.telParticipant.findFirst({
      where: { id: participantId, roomId },
    });
    if (!participant) throw new NotFoundException('Participante não encontrado');

    // RV-TELE-003: paciente entra mas fica aguardando
    const newStatus = actorRole === TelParticipantRole.PACIENTE
      ? TelParticipantStatus.AGUARDANDO
      : TelParticipantStatus.CONECTADO;

    // Se sala estava AGENDADA, muda para AGUARDANDO
    if (room.status === TelRoomStatus.AGENDADA) {
      await this.prisma.telRoom.update({
        where: { id: roomId },
        data: { status: TelRoomStatus.AGUARDANDO },
      });
    }

    await this.prisma.telParticipant.update({
      where: { id: participantId },
      data: { status: newStatus, joinedAt: new Date() },
    });

    await this.logEvent(roomId, TelEventType.PARTICIPANTE_ENTROU, actorId, actorRole);
    return { roomId, participantId, status: newStatus };
  }

  // ── RF-TEL-008: Reconexão (RV-TELE-005) ────────────────────────────────────

  async participantReconnected(
    roomId: string,
    participantId: string,
    actorId: string,
    actorRole: TelParticipantRole,
  ) {
    const room = await this.prisma.telRoom.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Sala não encontrada');
    if (room.status === TelRoomStatus.ENCERRADA || room.status === TelRoomStatus.CANCELADA) {
      throw new BadRequestException('Sala encerrada — reconexão não permitida');
    }

    const participant = await this.prisma.telParticipant.findFirst({
      where: { id: participantId, roomId },
    });
    if (!participant) throw new NotFoundException('Participante não encontrado');

    await this.prisma.telParticipant.update({
      where: { id: participantId },
      data: {
        status: TelParticipantStatus.CONECTADO,
        reconnections: { increment: 1 },
        leftAt: null,
      },
    });

    await this.logEvent(roomId, TelEventType.RECONEXAO, actorId, actorRole, { participantId });
    return { roomId, participantId, reconnected: true };
  }

  // ── RF-TEL-009: Revogar link ────────────────────────────────────────────────

  async revokeAccessLink(organizationId: string, roomId: string, linkId: string, user: AuthenticatedUser) {
    this.assertAccess(organizationId, user);
    const link = await this.prisma.telAccessLink.findFirst({
      where: { id: linkId, roomId },
      include: { room: true },
    });
    if (!link) throw new NotFoundException('Link não encontrado');
    if (link.room.organizationId !== organizationId) throw new ForbiddenException();
    if (link.revokedAt) throw new BadRequestException('Link já revogado');

    const updated = await this.prisma.telAccessLink.update({
      where: { id: linkId },
      data: { revokedAt: new Date(), revokedBy: user.sub },
    });

    await this.logEvent(roomId, TelEventType.LINK_REVOGADO, user.sub, TelParticipantRole.PROFISSIONAL, { linkId });
    return updated;
  }

  // ── RF-TEL-010: Compartilhar documento ─────────────────────────────────────

  async shareDocument(
    organizationId: string,
    roomId: string,
    user: AuthenticatedUser,
    data: { filename: string; mimeType: string; sizeBytes: number; storagePath: string },
  ) {
    this.assertAccess(organizationId, user);
    const room = await this.prisma.telRoom.findFirst({ where: { id: roomId, organizationId } });
    if (!room) throw new NotFoundException('Sala não encontrada');
    if (room.status !== TelRoomStatus.EM_ANDAMENTO) {
      throw new BadRequestException('Documentos só podem ser compartilhados durante o atendimento');
    }

    const doc = await this.prisma.telDocument.create({
      data: { roomId, ...data, sharedBy: user.sub },
    });

    await this.logEvent(roomId, TelEventType.DOCUMENTO_COMPARTILHADO, user.sub, TelParticipantRole.PROFISSIONAL, { docId: doc.id, filename: data.filename });
    return doc;
  }

  // ── RF-TEL-011: Confirmar documento no prontuário (RV-TELE-010) ────────────

  async confirmDocument(
    organizationId: string,
    roomId: string,
    docId: string,
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);
    const doc = await this.prisma.telDocument.findFirst({
      where: { id: docId, roomId },
      include: { room: true },
    });
    if (!doc) throw new NotFoundException('Documento não encontrado');
    if (doc.room.organizationId !== organizationId) throw new ForbiddenException();
    if (doc.status !== TelDocumentStatus.COMPARTILHADO) {
      throw new BadRequestException('Documento já processado');
    }

    const updated = await this.prisma.telDocument.update({
      where: { id: docId },
      data: { status: TelDocumentStatus.CONFIRMADO, confirmedBy: user.sub, confirmedAt: new Date() },
    });

    await this.logEvent(roomId, TelEventType.DOCUMENTO_CONFIRMADO, user.sub, TelParticipantRole.PROFISSIONAL, { docId });
    return updated;
  }

  // ── RF-TEL-012: Salvar evolução clínica pós-atendimento (RV-TELE-006) ───────

  async linkClinicalEntry(
    organizationId: string,
    roomId: string,
    clinicalEntryId: string,
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);
    const room = await this.prisma.telRoom.findFirst({ where: { id: roomId, organizationId } });
    if (!room) throw new NotFoundException('Sala não encontrada');
    if (room.status !== TelRoomStatus.ENCERRADA) {
      throw new BadRequestException('A evolução só pode ser vinculada após o encerramento da sala');
    }
    if (room.clinicalEntryId) {
      throw new BadRequestException('Evolução já vinculada a esta sala');
    }

    const updated = await this.prisma.telRoom.update({
      where: { id: roomId },
      data: { clinicalEntryId },
    });

    await this.logEvent(roomId, TelEventType.EVOLUCAO_SALVA, user.sub, TelParticipantRole.PROFISSIONAL, { clinicalEntryId });
    return updated;
  }

  // ── RF-TEL-013: Habilitar gravação (RV-TELE-007) ───────────────────────────

  async enableRecording(
    organizationId: string,
    roomId: string,
    user: AuthenticatedUser,
    consentConfirmed: boolean,
  ) {
    this.assertAccess(organizationId, user);
    if (!consentConfirmed) {
      throw new BadRequestException('Consentimento explícito é obrigatório para habilitar gravação');
    }
    const room = await this.prisma.telRoom.findFirst({ where: { id: roomId, organizationId } });
    if (!room) throw new NotFoundException('Sala não encontrada');
    if (room.status !== TelRoomStatus.EM_ANDAMENTO) {
      throw new BadRequestException('Gravação só pode ser habilitada durante o atendimento');
    }

    return this.prisma.telRoom.update({
      where: { id: roomId },
      data: {
        recordingEnabled: true,
        recordingConsentAt: new Date(),
        recordingConsentBy: user.sub,
      },
    });
  }

  // ── RF-TEL-014: Dashboard / KPIs ────────────────────────────────────────────

  async getDashboard(organizationId: string, user: AuthenticatedUser) {
    this.assertAccess(organizationId, user);
    const [agendadas, emAndamento, encerradas, canceladas] = await Promise.all([
      this.prisma.telRoom.count({ where: { organizationId, status: TelRoomStatus.AGENDADA } }),
      this.prisma.telRoom.count({ where: { organizationId, status: TelRoomStatus.EM_ANDAMENTO } }),
      this.prisma.telRoom.count({ where: { organizationId, status: TelRoomStatus.ENCERRADA } }),
      this.prisma.telRoom.count({ where: { organizationId, status: TelRoomStatus.CANCELADA } }),
    ]);
    return { agendadas, emAndamento, encerradas, canceladas };
  }
}
