import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, ConflictException, BadRequestException } from '@nestjs/common';
import { AppointmentsService } from './services/appointments.service';
import { ConflictService } from './services/conflict.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

const ORG_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const ORG_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

const userA: AuthenticatedUser = { sub: 'ua', email: 'a@a.com', userId: 'ua', isWalletzAdmin: false, organizationIds: [ORG_A], tenantIds: [] };
const userB: AuthenticatedUser = { sub: 'ub', email: 'b@b.com', userId: 'ub', isWalletzAdmin: false, organizationIds: [ORG_B], tenantIds: [] };
const adminUser: AuthenticatedUser = { sub: 'admin', email: 'admin@w.com', userId: 'admin', isWalletzAdmin: true, organizationIds: [], tenantIds: [] };

const now = new Date();
const startsAt = new Date(now.getTime() + 86400000); // tomorrow
const endsAt = new Date(startsAt.getTime() + 1800000); // +30min

const mockAppt = {
  id: 'appt-1',
  organizationId: ORG_A,
  unitId: 'unit-1',
  professionalId: 'prof-1',
  resourceId: null,
  patientId: 'patient-1',
  seriesId: null,
  type: 'CONSULTA',
  status: 'AGENDADO',
  startsAt,
  endsAt,
  notes: null,
  isOnlineBooking: false,
  cancelReason: null,
  rowVersion: 0,
  patient: { id: 'patient-1', name: 'Paciente Teste', telefone: null },
  professional: { id: 'prof-1', name: 'Dr. Teste' },
  service: null,
  resource: null,
  unit: { id: 'unit-1', name: 'Unidade Teste' },
};

const mockPrisma: Record<string, any> = {
  appointment: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    findFirst: jest.fn(),
  },
  appointmentHistory: { create: jest.fn() },
  appointmentSeries: { create: jest.fn() },
  $transaction: jest.fn((arg: any) => Array.isArray(arg) ? Promise.all(arg) : arg(mockPrisma)),
};

const mockConflict = {
  assertNoConflict: jest.fn(),
  acquireLock: jest.fn(),
  buildLockKey: jest.fn().mockReturnValue('lock-key'),
};

describe('AppointmentsService', () => {
  let service: AppointmentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConflictService, useValue: mockConflict },
      ],
    }).compile();

    service = module.get<AppointmentsService>(AppointmentsService);
    jest.clearAllMocks();
  });

  describe('create — isolamento de tenant', () => {
    it('deve bloquear criação em org sem acesso', async () => {
      await expect(
        service.create(
          { organizationId: ORG_A, unitId: 'u', patientId: 'p', startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() },
          userB,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('deve permitir criação para WALLETZ_ADMIN em qualquer org', async () => {
      mockPrisma.appointment.create.mockResolvedValue(mockAppt);
      mockPrisma.appointmentHistory.create.mockResolvedValue({});
      mockConflict.assertNoConflict.mockResolvedValue(undefined);
      mockConflict.acquireLock.mockResolvedValue(undefined);

      const result = await service.create(
        { organizationId: ORG_A, unitId: 'u', patientId: 'p', startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() },
        adminUser,
      );
      expect(result).toBeDefined();
    });

    it('deve rejeitar endsAt anterior a startsAt', async () => {
      await expect(
        service.create(
          {
            organizationId: ORG_A,
            unitId: 'u',
            patientId: 'p',
            startsAt: endsAt.toISOString(),
            endsAt: startsAt.toISOString(),
          },
          userA,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('transition — máquina de estados', () => {
    it('deve bloquear acesso cross-tenant ao fazer transição', async () => {
      mockPrisma.appointment.findUnique.mockResolvedValue(mockAppt);
      await expect(
        service.transition('appt-1', 'CONFIRMADO', { rowVersion: 0 }, userB),
      ).rejects.toThrow(ForbiddenException);
    });

    it('deve bloquear transição inválida FINALIZADO → AGENDADO', async () => {
      mockPrisma.appointment.findUnique.mockResolvedValue({ ...mockAppt, status: 'FINALIZADO' });
      await expect(
        service.transition('appt-1', 'AGENDADO', { rowVersion: 0 }, userA),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve bloquear transição com rowVersion desatualizado', async () => {
      mockPrisma.appointment.findUnique.mockResolvedValue({ ...mockAppt, rowVersion: 5 });
      await expect(
        service.transition('appt-1', 'CONFIRMADO', { rowVersion: 0 }, userA),
      ).rejects.toThrow(ConflictException);
    });

    it('deve permitir transição AGENDADO → CONFIRMADO', async () => {
      mockPrisma.appointment.findUnique.mockResolvedValue(mockAppt);
      mockPrisma.appointment.update.mockResolvedValue({ ...mockAppt, status: 'CONFIRMADO' });
      mockPrisma.appointmentHistory.create.mockResolvedValue({});

      const result = await service.transition('appt-1', 'CONFIRMADO', { rowVersion: 0 }, userA);
      expect(mockPrisma.appointment.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('findAll — escopo de tenant', () => {
    it('deve filtrar por organizationIds do JWT para usuário comum', async () => {
      mockPrisma.appointment.findMany.mockResolvedValue([]);
      mockPrisma.appointment.count.mockResolvedValue(0);

      await service.findAll({}, userA);

      const whereArg = mockPrisma.appointment.findMany.mock.calls[0][0].where;
      expect(whereArg.organizationId).toEqual({ in: [ORG_A] });
    });

    it('deve retornar nada quando organizationId pedido não é do usuário', async () => {
      mockPrisma.appointment.findMany.mockResolvedValue([]);
      mockPrisma.appointment.count.mockResolvedValue(0);

      await service.findAll({ organizationId: ORG_B }, userA);

      const whereArg = mockPrisma.appointment.findMany.mock.calls[0][0].where;
      expect(whereArg.organizationId).toEqual({ in: [] });
    });

    it('WALLETZ_ADMIN sem filtro vê tudo', async () => {
      mockPrisma.appointment.findMany.mockResolvedValue([]);
      mockPrisma.appointment.count.mockResolvedValue(0);

      await service.findAll({}, adminUser);

      const whereArg = mockPrisma.appointment.findMany.mock.calls[0][0].where;
      expect(whereArg.organizationId).toBeUndefined();
    });
  });
});
