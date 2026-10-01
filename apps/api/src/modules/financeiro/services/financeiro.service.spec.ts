import { Test, TestingModule } from '@nestjs/testing';
import { FinanceiroService } from './financeiro.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';

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

const now = new Date();
const mockTx = {
  id: 'tx-1',
  organizationId: 'org-1',
  type: 'RECEITA',
  status: 'PENDENTE',
  description: 'Consulta',
  amount: new Decimal(150),
  paidAmount: new Decimal(0),
  dueDate: new Date(now.getFullYear(), now.getMonth(), 15),
  createdBy: 'user-sub',
  createdAt: now,
  updatedAt: now,
};

const mockPayment = {
  id: 'pay-1',
  transactionId: 'tx-1',
  amount: new Decimal(150),
  method: 'PIX',
  paidAt: now,
  recordedBy: 'user-sub',
  transaction: mockTx,
};

let mockPrisma: any;

describe('FinanceiroService', () => {
  let service: FinanceiroService;

  beforeEach(async () => {
    mockPrisma = {
      financialAccount: { findMany: jest.fn(), create: jest.fn() },
      financialCategory: { findMany: jest.fn(), create: jest.fn() },
      financialTransaction: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      financialPayment: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      financialPeriod: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((fn) =>
        Array.isArray(fn) ? Promise.all(fn) : fn(mockPrisma),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinanceiroService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<FinanceiroService>(FinanceiroService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('assertAccess', () => {
    it('rejects user from wrong org', async () => {
      mockPrisma.financialAccount.findMany.mockResolvedValueOnce([]);
      await expect(service.listAccounts('org-1', otherOrgUser)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('createTransaction', () => {
    it('rejects negative amount', async () => {
      mockPrisma.financialPeriod.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.createTransaction('org-1', { type: 'RECEITA', description: 'X', amount: -10, dueDate: '2026-10-01' }, orgUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects transaction in closed period', async () => {
      mockPrisma.financialPeriod.findUnique.mockResolvedValueOnce({
        id: 'period-1',
        organizationId: 'org-1',
        year: 2026,
        month: 10,
        status: 'FECHADO',
      });
      await expect(
        service.createTransaction('org-1', { type: 'RECEITA', description: 'X', amount: 100, dueDate: '2026-10-15' }, orgUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('returns existing transaction on duplicate idempotency key', async () => {
      mockPrisma.financialTransaction.findUnique.mockResolvedValueOnce({ ...mockTx, payments: [] });
      const result = await service.createTransaction(
        'org-1',
        { type: 'RECEITA', description: 'Consulta', amount: 150, dueDate: '2026-10-15', idempotencyKey: 'key-abc' },
        orgUser,
      );
      expect(result.id).toBe('tx-1');
      expect(mockPrisma.financialTransaction.create).not.toHaveBeenCalled();
    });

    it('creates transaction successfully', async () => {
      mockPrisma.financialTransaction.findUnique.mockResolvedValueOnce(null);
      mockPrisma.financialPeriod.findUnique.mockResolvedValueOnce(null);
      mockPrisma.financialTransaction.create.mockResolvedValueOnce({ ...mockTx, payments: [] });
      const result = await service.createTransaction(
        'org-1',
        { type: 'RECEITA', description: 'Consulta', amount: 150, dueDate: '2026-10-15', idempotencyKey: 'key-new' },
        orgUser,
      );
      expect(result.id).toBe('tx-1');
    });
  });

  describe('recordPayment', () => {
    it('rejects payment exceeding remaining amount', async () => {
      mockPrisma.financialPayment.findUnique.mockResolvedValueOnce(null);
      mockPrisma.financialTransaction.findFirst.mockResolvedValueOnce(mockTx);
      mockPrisma.financialPeriod.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.recordPayment('tx-1', 'org-1', { amount: 200, method: 'PIX' }, orgUser),
      ).rejects.toThrow('Valor excede saldo pendente');
    });

    it('marks transaction as PAGO when fully paid', async () => {
      mockPrisma.financialPayment.findUnique.mockResolvedValueOnce(null);
      mockPrisma.financialTransaction.findFirst.mockResolvedValueOnce(mockTx);
      mockPrisma.financialPeriod.findUnique.mockResolvedValueOnce(null);
      mockPrisma.financialPayment.create.mockResolvedValueOnce(mockPayment);
      mockPrisma.financialTransaction.update.mockResolvedValueOnce({ ...mockTx, status: 'PAGO', paidAmount: new Decimal(150) });
      await service.recordPayment('tx-1', 'org-1', { amount: 150, method: 'PIX' }, orgUser);
      const updateCall = mockPrisma.financialTransaction.update.mock.calls[0][0];
      expect(updateCall.data.status).toBe('PAGO');
    });

    it('marks transaction as PARCIALMENTE_PAGO on partial payment', async () => {
      mockPrisma.financialPayment.findUnique.mockResolvedValueOnce(null);
      mockPrisma.financialTransaction.findFirst.mockResolvedValueOnce(mockTx);
      mockPrisma.financialPeriod.findUnique.mockResolvedValueOnce(null);
      mockPrisma.financialPayment.create.mockResolvedValueOnce({ ...mockPayment, amount: new Decimal(50) });
      mockPrisma.financialTransaction.update.mockResolvedValueOnce({ ...mockTx, status: 'PARCIALMENTE_PAGO', paidAmount: new Decimal(50) });
      await service.recordPayment('tx-1', 'org-1', { amount: 50, method: 'DINHEIRO' }, orgUser);
      const updateCall = mockPrisma.financialTransaction.update.mock.calls[0][0];
      expect(updateCall.data.status).toBe('PARCIALMENTE_PAGO');
    });

    it('is idempotent on duplicate payment key', async () => {
      mockPrisma.financialPayment.findUnique.mockResolvedValueOnce(mockPayment);
      const result = await service.recordPayment(
        'tx-1', 'org-1', { amount: 150, method: 'PIX', idempotencyKey: 'pay-key-1' }, orgUser,
      );
      expect(result).toEqual(mockPayment);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('reversePayment', () => {
    it('rejects reversing an already-reversed payment', async () => {
      mockPrisma.financialPayment.findFirst.mockResolvedValueOnce({
        ...mockPayment,
        reversedAt: new Date(),
        transaction: mockTx,
      });
      mockPrisma.financialPeriod.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.reversePayment('pay-1', 'org-1', { reason: 'Erro' }, orgUser),
      ).rejects.toThrow('Pagamento já estornado');
    });
  });

  describe('closePeriod', () => {
    it('closes an open period', async () => {
      mockPrisma.financialPeriod.findUnique.mockResolvedValueOnce({
        id: 'period-1', organizationId: 'org-1', year: 2026, month: 9, status: 'ABERTO',
      });
      mockPrisma.financialPeriod.update.mockResolvedValueOnce({
        id: 'period-1', status: 'FECHADO',
      });
      const result = await service.closePeriod('org-1', { year: 2026, month: 9 }, orgUser);
      expect(result.status).toBe('FECHADO');
    });

    it('rejects closing an already-closed period', async () => {
      mockPrisma.financialPeriod.findUnique.mockResolvedValueOnce({
        id: 'period-1', status: 'FECHADO',
      });
      await expect(
        service.closePeriod('org-1', { year: 2026, month: 9 }, orgUser),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('cancelTransaction', () => {
    it('rejects cancel on transaction with payments', async () => {
      mockPrisma.financialTransaction.findFirst.mockResolvedValueOnce({
        ...mockTx, paidAmount: new Decimal(50),
      });
      await expect(
        service.cancelTransaction('tx-1', 'org-1', { reason: 'Erro' }, orgUser),
      ).rejects.toThrow('Não é possível cancelar lançamento parcialmente pago');
    });

    it('rejects cancel in a closed period', async () => {
      mockPrisma.financialTransaction.findFirst.mockResolvedValueOnce({
        ...mockTx, paidAmount: new Decimal(0),
      });
      mockPrisma.financialPeriod.findUnique.mockResolvedValueOnce({
        status: 'FECHADO',
      });
      await expect(
        service.cancelTransaction('tx-1', 'org-1', { reason: 'Erro' }, orgUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
