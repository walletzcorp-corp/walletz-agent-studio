import { Test, TestingModule } from '@nestjs/testing';
import { EstoqueService } from './estoque.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';

const adminUser = {
  sub: 'admin-sub',
  email: 'admin@test.com',
  isWalletzAdmin: true,
  organizationIds: ['org-1'],
  tenantIds: ['org-1'],
};

const orgUser = {
  sub: 'user-sub',
  email: 'user@test.com',
  isWalletzAdmin: false,
  organizationIds: ['org-1'],
  tenantIds: ['org-1'],
};

const otherOrgUser = {
  sub: 'other-sub',
  email: 'other@test.com',
  isWalletzAdmin: false,
  organizationIds: ['org-2'],
  tenantIds: ['org-2'],
};

const mockItem = {
  id: 'item-1',
  organizationId: 'org-1',
  name: 'Seringa 5ml',
  unitOfMeasure: 'UN',
  type: 'CONSUMIVEL',
  requiresLot: false,
  active: true,
  minStock: new Decimal(10),
  maxStock: null,
};

const mockBalance = {
  id: 'bal-1',
  itemId: 'item-1',
  organizationId: 'org-1',
  unitId: 'unit-1',
  quantity: new Decimal(50),
  reservedQty: new Decimal(5),
  updatedAt: new Date(),
};

const mockMovement = {
  id: 'mov-1',
  itemId: 'item-1',
  organizationId: 'org-1',
  unitId: 'unit-1',
  type: 'ENTRADA',
  quantity: new Decimal(20),
  performedBy: 'user-sub',
  performedAt: new Date(),
};

let mockPrisma: any;

describe('EstoqueService', () => {
  let service: EstoqueService;

  beforeEach(async () => {
    mockPrisma = {
      stockCategory: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
      stockItem: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      stockLot: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
      stockBalance: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      stockMovement: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      stockReservation: {
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      stockTransfer: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      stockTransferLine: {
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((fn) =>
        Array.isArray(fn) ? Promise.all(fn) : fn(mockPrisma),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EstoqueService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<EstoqueService>(EstoqueService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('assertAccess', () => {
    it('rejects user from another organization', async () => {
      mockPrisma.stockCategory.findMany.mockResolvedValueOnce([]);
      await expect(service.listCategories('org-1', otherOrgUser)).rejects.toThrow(ForbiddenException);
    });

    it('allows walletz admin to access any org', async () => {
      mockPrisma.stockCategory.findMany.mockResolvedValueOnce([]);
      await expect(service.listCategories('org-99', adminUser)).resolves.toEqual([]);
    });
  });

  describe('createItem', () => {
    it('creates item successfully', async () => {
      mockPrisma.stockItem.findUnique.mockResolvedValueOnce(null);
      mockPrisma.stockItem.create.mockResolvedValueOnce(mockItem);
      const result = await service.createItem(
        'org-1',
        { name: 'Seringa 5ml', unitOfMeasure: 'UN' },
        orgUser,
      );
      expect(result).toEqual(mockItem);
    });

    it('rejects duplicate code within org', async () => {
      mockPrisma.stockItem.findUnique.mockResolvedValueOnce(mockItem);
      await expect(
        service.createItem('org-1', { name: 'X', unitOfMeasure: 'UN', code: 'SER-001' }, orgUser),
      ).rejects.toThrow('Código já existe');
    });
  });

  describe('recordMovement', () => {
    it('rejects negative quantity', async () => {
      await expect(
        service.recordMovement(
          'org-1',
          { itemId: 'item-1', unitId: 'unit-1', type: 'ENTRADA', quantity: -5 },
          orgUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects saida when balance insufficient', async () => {
      mockPrisma.stockMovement.findUnique.mockResolvedValueOnce(null);
      mockPrisma.stockBalance.findUnique.mockResolvedValueOnce({
        ...mockBalance,
        quantity: new Decimal(5),
        reservedQty: new Decimal(5),
      });
      await expect(
        service.recordMovement(
          'org-1',
          { itemId: 'item-1', unitId: 'unit-1', type: 'SAIDA', quantity: 10 },
          orgUser,
        ),
      ).rejects.toThrow('Saldo insuficiente');
    });

    it('returns existing movement on duplicate idempotency key', async () => {
      mockPrisma.stockMovement.findUnique.mockResolvedValueOnce(mockMovement);
      const result = await service.recordMovement(
        'org-1',
        {
          itemId: 'item-1',
          unitId: 'unit-1',
          type: 'ENTRADA',
          quantity: 20,
          idempotencyKey: 'key-123',
        },
        orgUser,
      );
      expect(result).toEqual(mockMovement);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('creates balance if none exists on ENTRADA', async () => {
      mockPrisma.stockMovement.findUnique.mockResolvedValueOnce(null);
      mockPrisma.stockBalance.findUnique.mockResolvedValueOnce(null);
      mockPrisma.stockBalance.create.mockResolvedValueOnce(mockBalance);
      mockPrisma.stockBalance.update.mockResolvedValueOnce(mockBalance);
      mockPrisma.stockMovement.create.mockResolvedValueOnce(mockMovement);
      const result = await service.recordMovement(
        'org-1',
        { itemId: 'item-1', unitId: 'unit-1', type: 'ENTRADA', quantity: 20 },
        orgUser,
      );
      expect(result).toEqual(mockMovement);
    });

    it('correctly reduces balance on SAIDA', async () => {
      mockPrisma.stockMovement.findUnique.mockResolvedValueOnce(null);
      mockPrisma.stockBalance.findUnique.mockResolvedValueOnce(mockBalance);
      mockPrisma.stockBalance.update.mockResolvedValueOnce({ ...mockBalance, quantity: new Decimal(35) });
      mockPrisma.stockMovement.create.mockResolvedValueOnce({ ...mockMovement, type: 'SAIDA' });
      const result = await service.recordMovement(
        'org-1',
        { itemId: 'item-1', unitId: 'unit-1', type: 'SAIDA', quantity: 10 },
        orgUser,
      );
      expect(result.type).toBe('SAIDA');
      const updateCall = mockPrisma.stockBalance.update.mock.calls[0][0];
      expect(updateCall.data.quantity.increment.toString()).toBe('-10');
    });
  });

  describe('getAlerts', () => {
    it('returns items below minimum stock', async () => {
      const lowBalance = { ...mockBalance, quantity: new Decimal(3), item: { ...mockItem, minStock: new Decimal(10) } };
      const okBalance = { ...mockBalance, id: 'bal-2', quantity: new Decimal(20), item: { ...mockItem, id: 'item-2', minStock: new Decimal(5) } };
      mockPrisma.stockBalance.findMany.mockResolvedValueOnce([lowBalance, okBalance]);
      const alerts = await service.getAlerts('org-1', orgUser);
      expect(alerts).toHaveLength(1);
      expect(alerts[0].id).toBe('bal-1');
    });
  });

  describe('createTransfer', () => {
    it('rejects same origin and destination unit', async () => {
      await expect(
        service.createTransfer(
          'org-1',
          { fromUnitId: 'unit-1', toUnitId: 'unit-1', lines: [] },
          orgUser,
        ),
      ).rejects.toThrow('Unidade de origem e destino devem ser diferentes');
    });
  });
});
