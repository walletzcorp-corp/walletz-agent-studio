import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { SalService } from './sal.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { RoomStatus, RoomType, RoomBookingStatus, ChecklistType } from '@prisma/client';

const orgUser = { sub: 'user1', email: 'u@b.com', isWalletzAdmin: false, organizationIds: ['org1'], tenantIds: ['t1'] };
const adminUser = { sub: 'admin1', email: 'a@b.com', isWalletzAdmin: true, organizationIds: [], tenantIds: [] };
const outsiderUser = { sub: 'other', email: 'o@b.com', isWalletzAdmin: false, organizationIds: ['org2'], tenantIds: [] };

let mockPrisma: any;

describe('SalService', () => {
  let service: SalService;

  beforeEach(async () => {
    mockPrisma = {
      room: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      roomPosition: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      roomStateLog: { create: jest.fn() },
      roomBooking: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      roomPatientFlowEvent: { create: jest.fn() },
      roomChecklistTemplate: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
      },
      roomChecklistTemplateItem: { createMany: jest.fn() },
      roomChecklistExecution: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
      },
      roomChecklistExecutionItem: {
        findFirst: jest.fn(),
        update: jest.fn(),
        createMany: jest.fn(),
      },
      roomIncident: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((fn: any) => (Array.isArray(fn) ? Promise.all(fn) : fn(mockPrisma))),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SalService>(SalService);
  });

  afterEach(() => { jest.resetAllMocks(); });

  // ---- Access Control ----

  it('blocks outsider from listRooms', async () => {
    await expect(service.listRooms('org1', outsiderUser)).rejects.toThrow(ForbiddenException);
  });

  it('admin bypasses tenant check', async () => {
    mockPrisma.room.findMany.mockResolvedValue([]);
    await expect(service.listRooms('org1', adminUser)).resolves.toEqual([]);
  });

  // ---- RF-SAL-001: listRooms ----

  it('returns rooms with positions', async () => {
    const rooms = [{ id: 'r1', name: 'Sala 1', positions: [] }];
    mockPrisma.room.findMany.mockResolvedValue(rooms);
    const result = await service.listRooms('org1', orgUser);
    expect(result).toEqual(rooms);
  });

  // ---- RF-SAL-002: createRoom ----

  it('creates room with defaults', async () => {
    mockPrisma.room.findFirst.mockResolvedValue(null);
    mockPrisma.room.create.mockResolvedValue({ id: 'r1', name: 'Sala A', type: RoomType.CONSULTORIO });
    const result = await service.createRoom('org1', { name: 'Sala A' }, orgUser);
    expect(result.type).toBe(RoomType.CONSULTORIO);
  });

  it('throws ConflictException on duplicate code', async () => {
    mockPrisma.room.findFirst.mockResolvedValue({ id: 'r0', code: 'S01' });
    await expect(service.createRoom('org1', { name: 'Sala', code: 'S01' }, orgUser))
      .rejects.toThrow(ConflictException);
  });

  // ---- RF-SAL-003: updateRoom ----

  it('updates room fields', async () => {
    mockPrisma.room.findFirst.mockResolvedValue({ id: 'r1' });
    mockPrisma.room.update.mockResolvedValue({ id: 'r1', capacity: 2 });
    const result = await service.updateRoom('org1', 'r1', { capacity: 2 }, orgUser);
    expect(result.capacity).toBe(2);
  });

  it('throws NotFoundException for unknown room on update', async () => {
    mockPrisma.room.findFirst.mockResolvedValue(null);
    await expect(service.updateRoom('org1', 'bad', {}, orgUser)).rejects.toThrow(NotFoundException);
  });

  // ---- RF-SAL-004: changeRoomStatus (state machine) ----

  it('transitions LIVRE → RESERVADA', async () => {
    mockPrisma.room.findFirst.mockResolvedValue({ id: 'r1', status: RoomStatus.LIVRE });
    mockPrisma.roomStateLog.create.mockResolvedValue({});
    mockPrisma.room.update.mockResolvedValue({ id: 'r1', status: RoomStatus.RESERVADA });

    const result = await service.changeRoomStatus('org1', 'r1', { toStatus: RoomStatus.RESERVADA }, orgUser);
    expect(result.status).toBe(RoomStatus.RESERVADA);
  });

  it('blocks invalid transition LIVRE → OCUPADA', async () => {
    mockPrisma.room.findFirst.mockResolvedValue({ id: 'r1', status: RoomStatus.LIVRE });
    await expect(service.changeRoomStatus('org1', 'r1', { toStatus: RoomStatus.OCUPADA }, orgUser))
      .rejects.toThrow(BadRequestException);
  });

  it('force=true bypasses state machine', async () => {
    mockPrisma.room.findFirst.mockResolvedValue({ id: 'r1', status: RoomStatus.LIVRE });
    mockPrisma.roomStateLog.create.mockResolvedValue({});
    mockPrisma.room.update.mockResolvedValue({ id: 'r1', status: RoomStatus.OCUPADA });
    const result = await service.changeRoomStatus('org1', 'r1', { toStatus: RoomStatus.OCUPADA, force: true }, orgUser);
    expect(result.status).toBe(RoomStatus.OCUPADA);
  });

  // ---- RF-SAL-005: addPosition ----

  it('adds poltrona to room', async () => {
    mockPrisma.room.findFirst.mockResolvedValue({ id: 'r1' });
    mockPrisma.roomPosition.create.mockResolvedValue({ id: 'p1', name: 'P1', positionType: 'POLTRONA' });
    const result = await service.addPosition('org1', 'r1', { name: 'P1' }, orgUser);
    expect(result.positionType).toBe('POLTRONA');
  });

  // ---- RF-SAL-007: createBooking ----

  it('creates booking when room is available', async () => {
    mockPrisma.room.findFirst.mockResolvedValue({ id: 'r1', status: RoomStatus.LIVRE, organizationId: 'org1' });
    mockPrisma.roomBooking.findFirst.mockResolvedValue(null);
    mockPrisma.roomBooking.create.mockResolvedValue({ id: 'b1', status: RoomBookingStatus.RESERVADA });
    mockPrisma.roomStateLog.create.mockResolvedValue({});
    mockPrisma.room.update.mockResolvedValue({ id: 'r1', status: RoomStatus.RESERVADA });

    const result = await service.createBooking('org1', {
      roomId: 'r1',
      scheduledStart: new Date('2026-10-10T09:00:00'),
      scheduledEnd: new Date('2026-10-10T10:00:00'),
    }, orgUser);

    expect(result.status).toBe(RoomBookingStatus.RESERVADA);
  });

  it('throws ConflictException on room double-booking', async () => {
    mockPrisma.room.findFirst.mockResolvedValue({ id: 'r1', status: RoomStatus.LIVRE, organizationId: 'org1' });
    mockPrisma.roomBooking.findFirst.mockResolvedValue({ id: 'existing' });

    await expect(service.createBooking('org1', {
      roomId: 'r1',
      scheduledStart: new Date('2026-10-10T09:00:00'),
      scheduledEnd: new Date('2026-10-10T10:00:00'),
    }, orgUser)).rejects.toThrow(ConflictException);
  });

  it('throws BadRequestException when room is BLOQUEADA', async () => {
    mockPrisma.room.findFirst.mockResolvedValue({ id: 'r1', status: RoomStatus.BLOQUEADA, organizationId: 'org1' });
    await expect(service.createBooking('org1', {
      roomId: 'r1',
      scheduledStart: new Date(),
      scheduledEnd: new Date(),
    }, orgUser)).rejects.toThrow(BadRequestException);
  });

  // ---- RF-SAL-009: advanceBookingStatus ----

  it('advances booking to OCUPADA and sets actualStart', async () => {
    mockPrisma.roomBooking.findFirst.mockResolvedValue({ id: 'b1', status: RoomBookingStatus.CONFIRMADA });
    mockPrisma.roomBooking.update.mockResolvedValue({ id: 'b1', status: RoomBookingStatus.OCUPADA });
    const result = await service.advanceBookingStatus('org1', 'b1', RoomBookingStatus.OCUPADA, orgUser);
    expect(result.status).toBe(RoomBookingStatus.OCUPADA);
    expect(mockPrisma.roomBooking.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ actualStart: expect.any(Date) }) }),
    );
  });

  it('throws when advancing already-finalized booking', async () => {
    mockPrisma.roomBooking.findFirst.mockResolvedValue({ id: 'b1', status: RoomBookingStatus.CANCELADA });
    await expect(service.advanceBookingStatus('org1', 'b1', RoomBookingStatus.OCUPADA, orgUser))
      .rejects.toThrow(BadRequestException);
  });

  // ---- RF-SAL-010: cancelBooking ----

  it('cancels booking and frees room', async () => {
    mockPrisma.roomBooking.findFirst.mockResolvedValue({ id: 'b1', status: RoomBookingStatus.RESERVADA, roomId: 'r1' });
    mockPrisma.roomBooking.update.mockResolvedValue({ status: RoomBookingStatus.CANCELADA });
    mockPrisma.roomStateLog.create.mockResolvedValue({});
    mockPrisma.room.update.mockResolvedValue({ status: RoomStatus.LIVRE });
    await service.cancelBooking('org1', 'b1', 'Paciente cancelou', orgUser);
    expect(mockPrisma.room.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: RoomStatus.LIVRE } }),
    );
  });

  it('throws when canceling already-canceled booking', async () => {
    mockPrisma.roomBooking.findFirst.mockResolvedValue({ id: 'b1', status: RoomBookingStatus.CANCELADA, roomId: 'r1' });
    await expect(service.cancelBooking('org1', 'b1', 'Motivo', orgUser)).rejects.toThrow(BadRequestException);
  });

  // ---- RF-SAL-011: recordFlowEvent ----

  it('records patient flow event', async () => {
    mockPrisma.roomBooking.findFirst.mockResolvedValue({ id: 'b1', organizationId: 'org1' });
    mockPrisma.roomPatientFlowEvent.create.mockResolvedValue({ id: 'fe1', eventType: 'ENTRADA' });
    const result = await service.recordFlowEvent('org1', 'b1', { eventType: 'ENTRADA' }, orgUser);
    expect(result.eventType).toBe('ENTRADA');
  });

  // ---- RF-SAL-012: startChecklist ----

  it('starts checklist and creates execution items', async () => {
    mockPrisma.room.findFirst.mockResolvedValue({ id: 'r1' });
    mockPrisma.roomChecklistTemplate.findFirst.mockResolvedValue({
      id: 't1',
      items: [{ description: 'Higienizar mesa', isCritical: true, position: 0 }],
    });
    mockPrisma.roomChecklistExecution.create.mockResolvedValue({ id: 'ex1' });
    mockPrisma.roomChecklistExecutionItem.createMany.mockResolvedValue({ count: 1 });
    mockPrisma.roomChecklistExecution.findUnique.mockResolvedValue({
      id: 'ex1',
      items: [{ description: 'Higienizar mesa', status: 'PENDENTE' }],
    });

    const result = await service.startChecklist('org1', {
      roomId: 'r1',
      templateId: 't1',
      checklistType: ChecklistType.HIGIENIZACAO,
    }, orgUser);

    expect(result?.items).toHaveLength(1);
  });

  // ---- RF-SAL-014: completeChecklist (critical pending blocks) ----

  it('blocks checklist completion with critical pending items', async () => {
    mockPrisma.roomChecklistExecution.findFirst.mockResolvedValue({
      id: 'ex1',
      items: [{ description: 'Critical step', isCritical: true, status: 'PENDENTE' }],
    });
    await expect(service.completeChecklist('org1', 'ex1', {}, orgUser)).rejects.toThrow(BadRequestException);
  });

  it('force=true overrides critical pending', async () => {
    mockPrisma.roomChecklistExecution.findFirst.mockResolvedValue({
      id: 'ex1',
      items: [{ description: 'Critical step', isCritical: true, status: 'PENDENTE' }],
    });
    mockPrisma.roomChecklistExecution.update.mockResolvedValue({ id: 'ex1', status: 'CONCLUIDO' });
    const result = await service.completeChecklist('org1', 'ex1', { force: true, justification: 'Emergência' }, orgUser);
    expect(result.status).toBe('CONCLUIDO');
  });

  // ---- RF-SAL-015: reportIncident ----

  it('reports incident and blocks room when blockRoom=true', async () => {
    mockPrisma.room.findFirst.mockResolvedValue({ id: 'r1', status: RoomStatus.LIVRE });
    mockPrisma.roomIncident.create.mockResolvedValue({ id: 'i1', incidentType: 'CONTAMINACAO' });
    mockPrisma.roomStateLog.create.mockResolvedValue({});
    mockPrisma.room.update.mockResolvedValue({ id: 'r1', status: RoomStatus.BLOQUEADA });

    await service.reportIncident('org1', {
      roomId: 'r1',
      incidentType: 'CONTAMINACAO',
      description: 'Risco biológico',
      blockRoom: true,
    }, orgUser);

    expect(mockPrisma.room.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: RoomStatus.BLOQUEADA } }),
    );
  });

  // ---- RF-SAL-016: resolveIncident ----

  it('resolves incident', async () => {
    mockPrisma.roomIncident.findFirst.mockResolvedValue({ id: 'i1', resolvedAt: null });
    mockPrisma.roomIncident.update.mockResolvedValue({ id: 'i1', status: 'RESOLVIDO', resolvedAt: new Date() });
    const result = await service.resolveIncident('org1', 'i1', { resolutionNotes: 'Descontaminado' }, orgUser);
    expect(result.status).toBe('RESOLVIDO');
  });

  it('throws when resolving already-resolved incident', async () => {
    mockPrisma.roomIncident.findFirst.mockResolvedValue({ id: 'i1', resolvedAt: new Date() });
    await expect(service.resolveIncident('org1', 'i1', { resolutionNotes: 'X' }, orgUser))
      .rejects.toThrow(BadRequestException);
  });

  // ---- RF-SAL-020: getOccupancyDashboard ----

  it('returns occupancy dashboard', async () => {
    mockPrisma.room.findMany.mockResolvedValue([{
      id: 'r1',
      name: 'Sala 1',
      type: RoomType.CONSULTORIO,
      status: RoomStatus.LIVRE,
      capacity: 1,
      positions: [],
      bookings: [],
    }]);
    const result = await service.getOccupancyDashboard('org1', orgUser);
    expect(result).toHaveLength(1);
    expect(result[0].upcomingBookings).toBe(0);
  });
});
