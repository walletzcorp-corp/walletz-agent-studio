import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { UnitsService } from './units.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

const adminUser: AuthenticatedUser = { sub: 'a', email: 'a@t.com', userId: 'actor-1', isWalletzAdmin: true, organizationIds: ['org-1'], tenantIds: [] };

const mockPrisma: Record<string, any> = {
  organization: { findUnique: jest.fn() },
  unit: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  outboxEvent: { create: jest.fn() },
  auditEvent: { create: jest.fn() },
  unitStatusHistory: { create: jest.fn() },
  $transaction: jest.fn((fn: (tx: any) => any) => fn(mockPrisma)),
};

describe('UnitsService', () => {
  let service: UnitsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnitsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UnitsService>(UnitsService);
    jest.clearAllMocks();
  });

  describe('changeStatus — ativação', () => {
    it('deve bloquear ativação se checklist incompleto', async () => {
      mockPrisma.unit.findUnique.mockResolvedValue({
        id: 'unit-1',
        organizationId: 'org-1',
        organization: { tenantId: 'tenant-1' },
        status: 'RASCUNHO',
        checklistCompleted: false,
        name: 'Unidade',
        telefone: null,
        email: null,
        cidade: 'SP',
        uf: 'SP',
        rowVersion: 0,
      });

      await expect(
        service.changeStatus('unit-1', { status: 'ATIVA' }, 'actor-1', adminUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve ativar quando checklist está completo', async () => {
      mockPrisma.unit.findUnique.mockResolvedValue({
        id: 'unit-1',
        organizationId: 'org-1',
        organization: { tenantId: 'tenant-1' },
        status: 'RASCUNHO',
        checklistCompleted: true,
        name: 'Unidade',
        telefone: '11 9000-0000',
        email: 'u@u.com',
        cidade: 'SP',
        uf: 'SP',
        rowVersion: 0,
      });
      mockPrisma.unit.update.mockResolvedValue({ status: 'ATIVA' });
      mockPrisma.unitStatusHistory.create.mockResolvedValue({});
      mockPrisma.outboxEvent.create.mockResolvedValue({});
      mockPrisma.auditEvent.create.mockResolvedValue({});

      const result = await service.changeStatus('unit-1', { status: 'ATIVA' }, 'actor-1', adminUser);
      expect(mockPrisma.unit.update).toHaveBeenCalledTimes(1);
    });

    it('deve exigir motivo ao bloquear', async () => {
      mockPrisma.unit.findUnique.mockResolvedValue({
        id: 'unit-1',
        organizationId: 'org-1',
        organization: { tenantId: 'tenant-1' },
        status: 'ATIVA',
        checklistCompleted: true,
        rowVersion: 0,
      });

      await expect(
        service.changeStatus('unit-1', { status: 'BLOQUEADA' }, 'actor-1', adminUser),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('deve recusar update com rowVersion desatualizado', async () => {
      mockPrisma.unit.findUnique.mockResolvedValue({
        id: 'unit-1',
        organizationId: 'org-1',
        status: 'ATIVA',
        rowVersion: 10,
        organization: { tenantId: 'tenant-1' },
      });

      await expect(
        service.update('unit-1', { name: 'Novo Nome', rowVersion: 5 }, 'actor-1', adminUser),
      ).rejects.toThrow(ConflictException);
    });
  });
});
