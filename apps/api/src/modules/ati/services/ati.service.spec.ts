import { Test, TestingModule } from '@nestjs/testing';
import { AtiService } from './ati.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { AssetStatus, AssetMaintenanceType, AssetMaintenanceStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const orgUser = { sub: 'user-1', email: 'user@test.com', isWalletzAdmin: false, organizationIds: ['org-1'], tenantIds: [] };
const outsider = { sub: 'out-1', email: 'out@test.com', isWalletzAdmin: false, organizationIds: ['org-2'], tenantIds: [] };

let mockPrisma: any;

describe('AtiService', () => {
  let service: AtiService;

  beforeEach(async () => {
    mockPrisma = {
      asset: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        groupBy: jest.fn(),
        count: jest.fn(),
      },
      assetMaintenanceOrder: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      assetSterilizationCycle: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      assetColdChainLog: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
      assetColdChainExcursion: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((fn: any) => (Array.isArray(fn) ? Promise.all(fn) : fn(mockPrisma))),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AtiService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<AtiService>(AtiService);
  });

  afterEach(() => { jest.resetAllMocks(); });

  // Segurança
  it('rejects outsider listing assets', async () => {
    await expect(service.listAssets('org-1', outsider)).rejects.toThrow(ForbiddenException);
  });

  // Ativos
  it('lists assets', async () => {
    mockPrisma.asset.findMany.mockResolvedValue([{ id: 'a1', name: 'Bisturi' }]);
    const result = await service.listAssets('org-1', orgUser);
    expect(result).toHaveLength(1);
  });

  it('creates asset', async () => {
    mockPrisma.asset.findFirst.mockResolvedValue(null);
    mockPrisma.asset.create.mockResolvedValue({ id: 'a1', name: 'Monitor' });
    const result = await service.createAsset('org-1', orgUser, { name: 'Monitor', tag: 'MON-001' });
    expect(result.id).toBe('a1');
  });

  it('blocks duplicate asset tag', async () => {
    mockPrisma.asset.findFirst.mockResolvedValue({ id: 'a0' });
    await expect(service.createAsset('org-1', orgUser, { name: 'Monitor', tag: 'DUP' })).rejects.toThrow(BadRequestException);
  });

  it('blocks asset', async () => {
    mockPrisma.asset.findFirst.mockResolvedValue({ id: 'a1', status: AssetStatus.DISPONIVEL });
    mockPrisma.asset.update.mockResolvedValue({ id: 'a1', status: AssetStatus.BLOQUEADO });
    await service.blockAsset('org-1', orgUser, 'a1', { reason: 'Manutenção emergencial' });
    expect(mockPrisma.asset.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: AssetStatus.BLOQUEADO }) }),
    );
  });

  it('throws BadRequest blocking already-blocked asset', async () => {
    mockPrisma.asset.findFirst.mockResolvedValue({ id: 'a1', status: AssetStatus.BLOQUEADO });
    await expect(service.blockAsset('org-1', orgUser, 'a1', { reason: 'X' })).rejects.toThrow(BadRequestException);
  });

  it('unblocks asset', async () => {
    mockPrisma.asset.findFirst.mockResolvedValue({ id: 'a1', status: AssetStatus.BLOQUEADO });
    mockPrisma.asset.update.mockResolvedValue({ id: 'a1', status: AssetStatus.DISPONIVEL });
    await service.unblockAsset('org-1', orgUser, 'a1');
    expect(mockPrisma.asset.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: AssetStatus.DISPONIVEL }) }),
    );
  });

  it('throws BadRequest unblocking non-blocked asset', async () => {
    mockPrisma.asset.findFirst.mockResolvedValue({ id: 'a1', status: AssetStatus.DISPONIVEL });
    await expect(service.unblockAsset('org-1', orgUser, 'a1')).rejects.toThrow(BadRequestException);
  });

  // Manutenção
  it('creates maintenance order', async () => {
    mockPrisma.asset.findFirst.mockResolvedValue({ id: 'a1', organizationId: 'org-1' });
    mockPrisma.assetMaintenanceOrder.create.mockResolvedValue({ id: 'mo-1' });
    const result = await service.createMaintenanceOrder('org-1', orgUser, {
      assetId: 'a1', maintenanceType: AssetMaintenanceType.PREVENTIVA, title: 'Revisão mensal',
    });
    expect(result.id).toBe('mo-1');
  });

  it('throws NotFoundException on maintenance for missing asset', async () => {
    mockPrisma.asset.findFirst.mockResolvedValue(null);
    await expect(service.createMaintenanceOrder('org-1', orgUser, {
      assetId: 'x', maintenanceType: AssetMaintenanceType.CORRETIVA, title: 'Conserto',
    })).rejects.toThrow(NotFoundException);
  });

  it('advancing to EM_EXECUCAO blocks the asset', async () => {
    const order = { id: 'mo-1', assetId: 'a1', maintenanceType: AssetMaintenanceType.PREVENTIVA, status: AssetMaintenanceStatus.APROVADA };
    mockPrisma.assetMaintenanceOrder.findFirst.mockResolvedValue(order);
    mockPrisma.assetMaintenanceOrder.update.mockResolvedValue({ id: 'mo-1', status: AssetMaintenanceStatus.EM_EXECUCAO });
    mockPrisma.asset.update.mockResolvedValue({});
    await service.updateMaintenanceStatus('org-1', orgUser, 'mo-1', { status: AssetMaintenanceStatus.EM_EXECUCAO });
    expect(mockPrisma.asset.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: AssetStatus.EM_MANUTENCAO }) }),
    );
  });

  it('completing maintenance releases the asset', async () => {
    const order = { id: 'mo-1', assetId: 'a1', maintenanceType: AssetMaintenanceType.PREVENTIVA, status: AssetMaintenanceStatus.EM_EXECUCAO };
    mockPrisma.assetMaintenanceOrder.findFirst.mockResolvedValue(order);
    mockPrisma.assetMaintenanceOrder.update.mockResolvedValue({ id: 'mo-1', status: AssetMaintenanceStatus.CONCLUIDA });
    mockPrisma.asset.update.mockResolvedValue({});
    await service.updateMaintenanceStatus('org-1', orgUser, 'mo-1', { status: AssetMaintenanceStatus.CONCLUIDA });
    expect(mockPrisma.asset.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: AssetStatus.DISPONIVEL }) }),
    );
  });

  // Esterilização
  it('creates sterilization cycle', async () => {
    mockPrisma.asset.findFirst.mockResolvedValue({ id: 'a1', organizationId: 'org-1' });
    mockPrisma.assetSterilizationCycle.create.mockResolvedValue({ id: 'sc-1' });
    const result = await service.createSterilizationCycle('org-1', orgUser, {
      assetId: 'a1', method: 'AUTOCLAVE', processStart: new Date(),
    });
    expect(result.id).toBe('sc-1');
  });

  it('validates sterilization cycle', async () => {
    mockPrisma.assetSterilizationCycle.findFirst.mockResolvedValue({ id: 'sc-1', organizationId: 'org-1', notes: null });
    mockPrisma.assetSterilizationCycle.update.mockResolvedValue({ id: 'sc-1', passed: true });
    await service.validateSterilizationCycle('org-1', orgUser, 'sc-1', { passed: true, processEnd: new Date() });
    expect(mockPrisma.assetSterilizationCycle.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ passed: true, validatedBy: 'user-1' }) }),
    );
  });

  // Cadeia do frio
  it('records cold chain reading within range — no excursion', async () => {
    mockPrisma.asset.findFirst.mockResolvedValue({
      id: 'a1', requiresColdChain: true, minTempC: new Decimal(2), maxTempC: new Decimal(8),
    });
    mockPrisma.assetColdChainLog.create.mockResolvedValue({ id: 'log-1', isExcursion: false });
    const result = await service.recordColdChainReading('org-1', orgUser, {
      assetId: 'a1', readingAt: new Date(), temperatureC: 5,
    });
    expect(result.isExcursion).toBe(false);
    expect(mockPrisma.assetColdChainExcursion.create).not.toHaveBeenCalled();
  });

  it('records cold chain reading out of range — creates excursion', async () => {
    mockPrisma.asset.findFirst.mockResolvedValue({
      id: 'a1', requiresColdChain: true, minTempC: new Decimal(2), maxTempC: new Decimal(8),
    });
    mockPrisma.assetColdChainLog.create.mockResolvedValue({ id: 'log-2', isExcursion: true });
    mockPrisma.assetColdChainExcursion.create.mockResolvedValue({ id: 'exc-1' });
    const result = await service.recordColdChainReading('org-1', orgUser, {
      assetId: 'a1', readingAt: new Date(), temperatureC: 15,
    });
    expect(result.isExcursion).toBe(true);
    expect(mockPrisma.assetColdChainExcursion.create).toHaveBeenCalled();
  });

  it('resolves excursion with human decision', async () => {
    mockPrisma.assetColdChainExcursion.findFirst.mockResolvedValue({ id: 'exc-1', decidedAt: null });
    mockPrisma.assetColdChainExcursion.update.mockResolvedValue({ id: 'exc-1', decision: 'QUARENTENA' });
    await service.resolveExcursion('org-1', orgUser, 'exc-1', {
      endedAt: new Date(), assessment: 'Temp alta por 2h', decision: 'QUARENTENA',
    });
    expect(mockPrisma.assetColdChainExcursion.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ decision: 'QUARENTENA', decidedBy: 'user-1' }) }),
    );
  });

  it('throws BadRequest resolving already-decided excursion', async () => {
    mockPrisma.assetColdChainExcursion.findFirst.mockResolvedValue({ id: 'exc-1', decidedAt: new Date() });
    await expect(service.resolveExcursion('org-1', orgUser, 'exc-1', {
      endedAt: new Date(), assessment: 'A', decision: 'LIBERAR',
    })).rejects.toThrow(BadRequestException);
  });

  // Dashboard
  it('returns asset dashboard', async () => {
    mockPrisma.asset.groupBy.mockResolvedValue([]);
    mockPrisma.asset.count.mockResolvedValue(2);
    mockPrisma.assetMaintenanceOrder.count.mockResolvedValue(1);
    const result = await service.getDashboard('org-1', orgUser);
    expect(result).toHaveProperty('pendingCalibration', 2);
    expect(result).toHaveProperty('openMaintenances', 1);
  });
});
