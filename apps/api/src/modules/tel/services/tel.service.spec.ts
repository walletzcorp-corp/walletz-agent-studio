import { Test, TestingModule } from '@nestjs/testing';
import { TelService } from './tel.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { TelRoomStatus, TelParticipantRole, TelParticipantStatus, TelDocumentStatus } from '@prisma/client';

const orgUser = { sub: 'prof-1', email: 'prof@t.com', name: 'Dr. Silva', isWalletzAdmin: false, organizationIds: ['org-1'], tenantIds: [] };
const outsider = { sub: 'out-1', email: 'o@t.com', isWalletzAdmin: false, organizationIds: ['org-2'], tenantIds: [] };

let mockPrisma: any;

const mockRoom = {
  id: 'room-1',
  organizationId: 'org-1',
  appointmentId: 'apt-1',
  status: TelRoomStatus.AGENDADA,
  recordingEnabled: false,
  scheduledAt: new Date('2026-10-10T10:00:00Z'),
  startedAt: null,
  endedAt: null,
  cancelReason: null,
  cancelledBy: null,
  cancelledAt: null,
  clinicalEntryId: null,
  createdBy: 'prof-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockParticipant = {
  id: 'part-1',
  roomId: 'room-1',
  role: TelParticipantRole.PACIENTE,
  status: TelParticipantStatus.AGUARDANDO,
  userId: null,
  patientId: 'pat-1',
  displayName: 'Paciente Teste',
  admittedAt: null,
  admittedBy: null,
  joinedAt: null,
  leftAt: null,
  reconnections: 0,
  createdAt: new Date(),
};

describe('TelService', () => {
  let service: TelService;

  beforeEach(async () => {
    mockPrisma = {
      telRoom: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      telParticipant: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      telEvent: { create: jest.fn() },
      telAccessLink: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      telDocument: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      appointment: { findFirst: jest.fn() },
      $transaction: jest.fn((fn: any) => (Array.isArray(fn) ? Promise.all(fn) : fn(mockPrisma))),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [TelService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<TelService>(TelService);
  });

  afterEach(() => { jest.resetAllMocks(); });

  // ── Segurança ────────────────────────────────────────────────────────────────

  it('rejects outsider listing rooms', async () => {
    await expect(service.listRooms('org-1', outsider, {})).rejects.toThrow(ForbiddenException);
  });

  it('rejects outsider creating room', async () => {
    await expect(
      service.createRoom('org-1', outsider, { appointmentId: 'apt-1', scheduledAt: new Date(), patientId: 'pat-1' }),
    ).rejects.toThrow(ForbiddenException);
  });

  // ── RF-TEL-001: Criar sala ───────────────────────────────────────────────────

  it('creates room and links appointment', async () => {
    mockPrisma.appointment.findFirst.mockResolvedValue({ id: 'apt-1', organizationId: 'org-1' });
    mockPrisma.telRoom.findUnique.mockResolvedValue(null);
    mockPrisma.telRoom.create.mockResolvedValue({ ...mockRoom });
    mockPrisma.telParticipant.create.mockResolvedValue({ id: 'part-1' });
    mockPrisma.telAccessLink.create.mockResolvedValue({ id: 'link-1' });
    mockPrisma.telEvent.create.mockResolvedValue({});

    const result = await service.createRoom('org-1', orgUser, {
      appointmentId: 'apt-1',
      scheduledAt: new Date('2026-10-10T10:00:00Z'),
      patientId: 'pat-1',
    });

    expect(result.appointmentId).toBe('apt-1');
    expect(mockPrisma.telRoom.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ organizationId: 'org-1', createdBy: 'prof-1' }) }),
    );
  });

  it('rejects duplicate room for same appointment', async () => {
    mockPrisma.appointment.findFirst.mockResolvedValue({ id: 'apt-1' });
    mockPrisma.telRoom.findUnique.mockResolvedValue(mockRoom);

    await expect(
      service.createRoom('org-1', orgUser, { appointmentId: 'apt-1', scheduledAt: new Date() }),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects room for appointment not in org', async () => {
    mockPrisma.appointment.findFirst.mockResolvedValue(null);

    await expect(
      service.createRoom('org-1', orgUser, { appointmentId: 'apt-999', scheduledAt: new Date() }),
    ).rejects.toThrow(NotFoundException);
  });

  // ── RF-TEL-003: Iniciar sala ─────────────────────────────────────────────────

  it('starts room and records event', async () => {
    mockPrisma.telRoom.findFirst.mockResolvedValue(mockRoom);
    mockPrisma.telRoom.update.mockResolvedValue({ ...mockRoom, status: TelRoomStatus.EM_ANDAMENTO, startedAt: new Date() });
    mockPrisma.telEvent.create.mockResolvedValue({});

    const result = await service.startRoom('org-1', 'room-1', orgUser);
    expect(result.status).toBe(TelRoomStatus.EM_ANDAMENTO);
    expect(mockPrisma.telEvent.create).toHaveBeenCalled();
  });

  it('blocks starting already-started room', async () => {
    mockPrisma.telRoom.findFirst.mockResolvedValue({ ...mockRoom, status: TelRoomStatus.EM_ANDAMENTO });
    await expect(service.startRoom('org-1', 'room-1', orgUser)).rejects.toThrow(BadRequestException);
  });

  it('blocks starting a cancelled room', async () => {
    mockPrisma.telRoom.findFirst.mockResolvedValue({ ...mockRoom, status: TelRoomStatus.CANCELADA });
    await expect(service.startRoom('org-1', 'room-1', orgUser)).rejects.toThrow(BadRequestException);
  });

  // ── RF-TEL-004: Encerrar sala ─────────────────────────────────────────────────

  it('ends room and records event', async () => {
    mockPrisma.telRoom.findFirst.mockResolvedValue({ ...mockRoom, status: TelRoomStatus.EM_ANDAMENTO });
    mockPrisma.telRoom.update.mockResolvedValue({ ...mockRoom, status: TelRoomStatus.ENCERRADA });
    mockPrisma.telEvent.create.mockResolvedValue({});

    const result = await service.endRoom('org-1', 'room-1', orgUser);
    expect(result.status).toBe(TelRoomStatus.ENCERRADA);
  });

  it('blocks ending already-ended room', async () => {
    mockPrisma.telRoom.findFirst.mockResolvedValue({ ...mockRoom, status: TelRoomStatus.ENCERRADA });
    await expect(service.endRoom('org-1', 'room-1', orgUser)).rejects.toThrow(BadRequestException);
  });

  // ── RF-TEL-006: Admitir paciente (RV-TELE-003) ───────────────────────────────

  it('admits waiting participant', async () => {
    mockPrisma.telRoom.findFirst.mockResolvedValue({ ...mockRoom, status: TelRoomStatus.AGUARDANDO });
    mockPrisma.telParticipant.findFirst.mockResolvedValue(mockParticipant);
    mockPrisma.telParticipant.update.mockResolvedValue({ ...mockParticipant, status: TelParticipantStatus.ADMITIDO, admittedBy: 'prof-1' });
    mockPrisma.telRoom.update.mockResolvedValue({ ...mockRoom, status: TelRoomStatus.EM_ANDAMENTO });
    mockPrisma.telEvent.create.mockResolvedValue({});

    const result = await service.admitParticipant('org-1', 'room-1', 'part-1', orgUser);
    expect(result.status).toBe(TelParticipantStatus.ADMITIDO);
    expect(mockPrisma.telEvent.create).toHaveBeenCalled();
  });

  it('blocks admitting already-admitted participant', async () => {
    mockPrisma.telRoom.findFirst.mockResolvedValue({ ...mockRoom, status: TelRoomStatus.EM_ANDAMENTO });
    mockPrisma.telParticipant.findFirst.mockResolvedValue({ ...mockParticipant, status: TelParticipantStatus.ADMITIDO });
    await expect(service.admitParticipant('org-1', 'room-1', 'part-1', orgUser)).rejects.toThrow(BadRequestException);
  });

  // ── RF-TEL-007: Entrada do paciente na sala de espera (RV-TELE-003) ──────────

  it('patient joins and stays in AGUARDANDO status', async () => {
    mockPrisma.telRoom.findUnique.mockResolvedValue(mockRoom);
    mockPrisma.telParticipant.findFirst.mockResolvedValue(mockParticipant);
    mockPrisma.telParticipant.update.mockResolvedValue({ ...mockParticipant, status: TelParticipantStatus.AGUARDANDO });
    mockPrisma.telRoom.update.mockResolvedValue({ ...mockRoom, status: TelRoomStatus.AGUARDANDO });
    mockPrisma.telEvent.create.mockResolvedValue({});

    const result = await service.participantJoined('room-1', 'part-1', 'pat-1', TelParticipantRole.PACIENTE);
    expect(result.status).toBe(TelParticipantStatus.AGUARDANDO);
  });

  it('blocks joining a cancelled room', async () => {
    mockPrisma.telRoom.findUnique.mockResolvedValue({ ...mockRoom, status: TelRoomStatus.CANCELADA });
    await expect(
      service.participantJoined('room-1', 'part-1', 'pat-1', TelParticipantRole.PACIENTE),
    ).rejects.toThrow(BadRequestException);
  });

  // ── RF-TEL-008: Reconexão sem perder dados (RV-TELE-005) ─────────────────────

  it('allows reconnection during active room', async () => {
    mockPrisma.telRoom.findUnique.mockResolvedValue({ ...mockRoom, status: TelRoomStatus.EM_ANDAMENTO });
    mockPrisma.telParticipant.findFirst.mockResolvedValue({ ...mockParticipant, status: TelParticipantStatus.DESCONECTADO });
    mockPrisma.telParticipant.update.mockResolvedValue({ ...mockParticipant, status: TelParticipantStatus.CONECTADO, reconnections: 1 });
    mockPrisma.telEvent.create.mockResolvedValue({});

    const result = await service.participantReconnected('room-1', 'part-1', 'prof-1', TelParticipantRole.PROFISSIONAL);
    expect(result.reconnected).toBe(true);
    expect(mockPrisma.telEvent.create).toHaveBeenCalled();
  });

  it('blocks reconnection to ended room', async () => {
    mockPrisma.telRoom.findUnique.mockResolvedValue({ ...mockRoom, status: TelRoomStatus.ENCERRADA });
    await expect(
      service.participantReconnected('room-1', 'part-1', 'prof-1', TelParticipantRole.PROFISSIONAL),
    ).rejects.toThrow(BadRequestException);
  });

  // ── RF-TEL-010: Documento — só associado após confirmação (RV-TELE-010) ───────

  it('shares document during active room', async () => {
    mockPrisma.telRoom.findFirst.mockResolvedValue({ ...mockRoom, status: TelRoomStatus.EM_ANDAMENTO });
    mockPrisma.telDocument.create.mockResolvedValue({ id: 'doc-1', status: TelDocumentStatus.COMPARTILHADO });
    mockPrisma.telEvent.create.mockResolvedValue({});

    const result = await service.shareDocument('org-1', 'room-1', orgUser, {
      filename: 'exame.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 12000,
      storagePath: 'uploads/exame.pdf',
    });
    expect(result.status).toBe(TelDocumentStatus.COMPARTILHADO);
  });

  it('blocks sharing document outside active room', async () => {
    mockPrisma.telRoom.findFirst.mockResolvedValue({ ...mockRoom, status: TelRoomStatus.AGENDADA });
    await expect(
      service.shareDocument('org-1', 'room-1', orgUser, { filename: 'x.pdf', mimeType: 'application/pdf', sizeBytes: 1, storagePath: 'x' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('confirms document and links to prontuário', async () => {
    mockPrisma.telDocument.findFirst.mockResolvedValue({
      id: 'doc-1',
      roomId: 'room-1',
      status: TelDocumentStatus.COMPARTILHADO,
      room: { organizationId: 'org-1' },
    });
    mockPrisma.telDocument.update.mockResolvedValue({ id: 'doc-1', status: TelDocumentStatus.CONFIRMADO, confirmedBy: 'prof-1' });
    mockPrisma.telEvent.create.mockResolvedValue({});

    const result = await service.confirmDocument('org-1', 'room-1', 'doc-1', orgUser);
    expect(result.status).toBe(TelDocumentStatus.CONFIRMADO);
    expect(result.confirmedBy).toBe('prof-1');
  });

  it('blocks confirming already-confirmed document', async () => {
    mockPrisma.telDocument.findFirst.mockResolvedValue({
      id: 'doc-1',
      roomId: 'room-1',
      status: TelDocumentStatus.CONFIRMADO,
      room: { organizationId: 'org-1' },
    });
    await expect(
      service.confirmDocument('org-1', 'room-1', 'doc-1', orgUser),
    ).rejects.toThrow(BadRequestException);
  });

  // ── RF-TEL-012: Evolução só vinculada após encerramento (RV-TELE-006) ────────

  it('links clinical entry after room is ended', async () => {
    mockPrisma.telRoom.findFirst.mockResolvedValue({ ...mockRoom, status: TelRoomStatus.ENCERRADA });
    mockPrisma.telRoom.update.mockResolvedValue({ ...mockRoom, clinicalEntryId: 'entry-1' });
    mockPrisma.telEvent.create.mockResolvedValue({});

    const result = await service.linkClinicalEntry('org-1', 'room-1', 'entry-1', orgUser);
    expect(result.clinicalEntryId).toBe('entry-1');
  });

  it('blocks linking entry before room is ended', async () => {
    mockPrisma.telRoom.findFirst.mockResolvedValue({ ...mockRoom, status: TelRoomStatus.EM_ANDAMENTO });
    await expect(
      service.linkClinicalEntry('org-1', 'room-1', 'entry-1', orgUser),
    ).rejects.toThrow(BadRequestException);
  });

  it('blocks double link of clinical entry', async () => {
    mockPrisma.telRoom.findFirst.mockResolvedValue({ ...mockRoom, status: TelRoomStatus.ENCERRADA, clinicalEntryId: 'entry-old' });
    await expect(
      service.linkClinicalEntry('org-1', 'room-1', 'entry-2', orgUser),
    ).rejects.toThrow(BadRequestException);
  });

  // ── RF-TEL-013: Gravação exige consentimento (RV-TELE-007) ───────────────────

  it('enables recording only with explicit consent', async () => {
    mockPrisma.telRoom.findFirst.mockResolvedValue({ ...mockRoom, status: TelRoomStatus.EM_ANDAMENTO });
    mockPrisma.telRoom.update.mockResolvedValue({ ...mockRoom, recordingEnabled: true, recordingConsentBy: 'prof-1' });

    const result = await service.enableRecording('org-1', 'room-1', orgUser, true);
    expect(result.recordingEnabled).toBe(true);
  });

  it('blocks enabling recording without consent', async () => {
    await expect(
      service.enableRecording('org-1', 'room-1', orgUser, false),
    ).rejects.toThrow(BadRequestException);
  });

  // ── RF-TEL-014: Dashboard ─────────────────────────────────────────────────────

  it('returns dashboard KPIs', async () => {
    mockPrisma.telRoom.count
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(12)
      .mockResolvedValueOnce(2);

    const result = await service.getDashboard('org-1', orgUser);
    expect(result).toEqual({ agendadas: 3, emAndamento: 1, encerradas: 12, canceladas: 2 });
  });
});
