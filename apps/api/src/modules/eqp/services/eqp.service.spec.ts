import { Test, TestingModule } from '@nestjs/testing';
import { EqpService } from './eqp.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ForbiddenException, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { CredentialStatus, WorkShiftStatus } from '@prisma/client';

const orgUser = { sub: 'user-1', email: 'user@test.com', isWalletzAdmin: false, organizationIds: ['org-1'], tenantIds: [] };
const outsider = { sub: 'out-1', email: 'out@test.com', isWalletzAdmin: false, organizationIds: ['org-2'], tenantIds: [] };

let mockPrisma: any;

describe('EqpService', () => {
  let service: EqpService;

  beforeEach(async () => {
    mockPrisma = {
      eqpCredential: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      teamCompetency: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
      workSchedule: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
      },
      workShift: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
      },
      workShiftAudit: {
        create: jest.fn(),
      },
      $transaction: jest.fn((fn: any) => (Array.isArray(fn) ? Promise.all(fn) : fn(mockPrisma))),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [EqpService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<EqpService>(EqpService);
  });

  afterEach(() => { jest.resetAllMocks(); });

  // Segurança
  it('rejects outsider listing credentials', async () => {
    await expect(service.listCredentials('org-1', outsider)).rejects.toThrow(ForbiddenException);
  });

  // Credenciais
  it('creates credential', async () => {
    mockPrisma.eqpCredential.create.mockResolvedValue({ id: 'cred-1', status: CredentialStatus.ATIVA });
    const result = await service.createCredential('org-1', orgUser, {
      professionalId: 'prof-1', credentialType: 'CRM', number: '12345',
    });
    expect(result.id).toBe('cred-1');
    expect(mockPrisma.eqpCredential.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: CredentialStatus.ATIVA }) }),
    );
  });

  it('lists credentials with filters', async () => {
    mockPrisma.eqpCredential.findMany.mockResolvedValue([]);
    await service.listCredentials('org-1', orgUser, { credentialType: 'CRM', status: CredentialStatus.ATIVA });
    expect(mockPrisma.eqpCredential.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ credentialType: 'CRM' }) }),
    );
  });

  it('updates credential status', async () => {
    mockPrisma.eqpCredential.findFirst.mockResolvedValue({ id: 'cred-1', notes: null });
    mockPrisma.eqpCredential.update.mockResolvedValue({ id: 'cred-1', status: CredentialStatus.SUSPENSA });
    await service.updateCredentialStatus('org-1', orgUser, 'cred-1', { status: CredentialStatus.SUSPENSA });
    expect(mockPrisma.eqpCredential.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: CredentialStatus.SUSPENSA, verifiedBy: 'user-1' }) }),
    );
  });

  it('throws NotFoundException updating missing credential', async () => {
    mockPrisma.eqpCredential.findFirst.mockResolvedValue(null);
    await expect(service.updateCredentialStatus('org-1', orgUser, 'x', { status: CredentialStatus.VENCIDA })).rejects.toThrow(NotFoundException);
  });

  it('lists expiring credentials', async () => {
    mockPrisma.eqpCredential.findMany.mockResolvedValue([{ id: 'cred-1', expiresAt: new Date() }]);
    const result = await service.listExpiringCredentials('org-1', orgUser, 30);
    expect(result).toHaveLength(1);
  });

  // Competências
  it('adds competency', async () => {
    mockPrisma.teamCompetency.create.mockResolvedValue({ id: 'comp-1' });
    const result = await service.addCompetency('org-1', orgUser, {
      professionalId: 'prof-1', competencyName: 'Ventilação mecânica', level: 'AVANCADO',
    });
    expect(result.id).toBe('comp-1');
  });

  it('lists competencies', async () => {
    mockPrisma.teamCompetency.findMany.mockResolvedValue([{ id: 'comp-1', competencyName: 'UTI' }]);
    const result = await service.listCompetencies('org-1', orgUser, { professionalId: 'prof-1' });
    expect(result).toHaveLength(1);
  });

  // Escalas
  it('creates work schedule', async () => {
    mockPrisma.workSchedule.create.mockResolvedValue({ id: 'sched-1', name: 'Escala Outubro' });
    const result = await service.createSchedule('org-1', orgUser, {
      name: 'Escala Outubro', startDate: new Date(),
    });
    expect(result.id).toBe('sched-1');
  });

  it('lists schedules', async () => {
    mockPrisma.workSchedule.findMany.mockResolvedValue([{ id: 'sched-1', _count: { shifts: 5 } }]);
    const result = await service.listSchedules('org-1', orgUser);
    expect(result).toHaveLength(1);
  });

  // Turnos
  it('creates shift without conflict', async () => {
    mockPrisma.workSchedule.findFirst.mockResolvedValue({ id: 'sched-1', organizationId: 'org-1' });
    mockPrisma.workShift.findFirst.mockResolvedValue(null);
    mockPrisma.workShift.create.mockResolvedValue({ id: 'shift-1', status: WorkShiftStatus.AGENDADO });
    const result = await service.createShift('org-1', orgUser, {
      scheduleId: 'sched-1', professionalId: 'prof-1',
      shiftStart: new Date('2026-10-01T08:00:00Z'), shiftEnd: new Date('2026-10-01T16:00:00Z'),
    });
    expect(result.id).toBe('shift-1');
  });

  it('blocks conflicting shift for same professional', async () => {
    mockPrisma.workSchedule.findFirst.mockResolvedValue({ id: 'sched-1', organizationId: 'org-1' });
    mockPrisma.workShift.findFirst.mockResolvedValue({
      id: 'existing', shiftStart: new Date('2026-10-01T10:00:00Z'), shiftEnd: new Date('2026-10-01T18:00:00Z'),
    });
    await expect(service.createShift('org-1', orgUser, {
      scheduleId: 'sched-1', professionalId: 'prof-1',
      shiftStart: new Date('2026-10-01T08:00:00Z'), shiftEnd: new Date('2026-10-01T16:00:00Z'),
    })).rejects.toThrow(ConflictException);
  });

  it('throws NotFoundException creating shift with missing schedule', async () => {
    mockPrisma.workSchedule.findFirst.mockResolvedValue(null);
    await expect(service.createShift('org-1', orgUser, {
      scheduleId: 'x', professionalId: 'prof-1',
      shiftStart: new Date(), shiftEnd: new Date(),
    })).rejects.toThrow(NotFoundException);
  });

  // Atualização de turno
  it('blocks updating concluded shift', async () => {
    mockPrisma.workShift.findFirst.mockResolvedValue({ id: 'shift-1', status: WorkShiftStatus.CONCLUIDO, shiftStart: new Date(), shiftEnd: new Date() });
    await expect(service.updateShiftStatus('org-1', orgUser, 'shift-1', { status: WorkShiftStatus.CANCELADO })).rejects.toThrow(BadRequestException);
  });

  it('updates shift status with audit', async () => {
    mockPrisma.workShift.findFirst.mockResolvedValue({
      id: 'shift-1', status: WorkShiftStatus.AGENDADO, shiftStart: new Date(), shiftEnd: new Date(),
    });
    mockPrisma.workShift.update.mockResolvedValue({ id: 'shift-1', status: WorkShiftStatus.EM_ANDAMENTO });
    mockPrisma.workShiftAudit.create.mockResolvedValue({});
    await service.updateShiftStatus('org-1', orgUser, 'shift-1', { status: WorkShiftStatus.EM_ANDAMENTO });
    expect(mockPrisma.workShiftAudit.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'STATUS_CHANGE', changedBy: 'user-1' }) }),
    );
  });

  it('blocks substitution with conflicting substitute', async () => {
    mockPrisma.workShift.findFirst
      .mockResolvedValueOnce({
        id: 'shift-1', status: WorkShiftStatus.AGENDADO,
        shiftStart: new Date('2026-10-01T08:00:00Z'), shiftEnd: new Date('2026-10-01T16:00:00Z'),
      })
      .mockResolvedValueOnce({
        id: 'conflict', shiftStart: new Date('2026-10-01T10:00:00Z'), shiftEnd: new Date('2026-10-01T18:00:00Z'),
      });
    await expect(service.updateShiftStatus('org-1', orgUser, 'shift-1', {
      status: WorkShiftStatus.SUBSTITUIDO, substituteId: 'sub-prof',
    })).rejects.toThrow(ConflictException);
  });

  // Dashboard
  it('returns team dashboard', async () => {
    mockPrisma.eqpCredential.count.mockResolvedValue(2);
    mockPrisma.workShift.count.mockResolvedValue(8);
    mockPrisma.workSchedule.count.mockResolvedValue(3);
    const result = await service.getDashboard('org-1', orgUser);
    expect(result).toHaveProperty('expiredCredentials', 2);
    expect(result).toHaveProperty('shiftsToday', 8);
    expect(result).toHaveProperty('openSchedules', 3);
  });
});
