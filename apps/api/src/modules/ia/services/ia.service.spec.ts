import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { IaService } from './ia.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AiDraftStatus, AiRiskLevel, Prisma } from '@prisma/client';

const adminUser = { sub: 'admin1', email: 'a@b.com', isWalletzAdmin: true, organizationIds: [], tenantIds: [] };
const orgUser = { sub: 'user1', email: 'u@b.com', isWalletzAdmin: false, organizationIds: ['org1'], tenantIds: ['t1'] };
const outsiderUser = { sub: 'other', email: 'o@b.com', isWalletzAdmin: false, organizationIds: ['org2'], tenantIds: [] };

let mockPrisma: any;

describe('IaService', () => {
  let service: IaService;

  beforeEach(async () => {
    mockPrisma = {
      aiConfig: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
      aiDraft: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      aiUsageLog: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      aiQualityMetric: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      $transaction: jest.fn((fn: any) => (Array.isArray(fn) ? Promise.all(fn) : fn(mockPrisma))),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IaService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<IaService>(IaService);
  });

  afterEach(() => { jest.resetAllMocks(); });

  // ---- Access Control ----

  it('blocks outsider from listConfigs', async () => {
    await expect(service.listConfigs('org1', outsiderUser)).rejects.toThrow(ForbiddenException);
  });

  it('admin bypasses tenant check in listConfigs', async () => {
    mockPrisma.aiConfig.findMany.mockResolvedValue([]);
    await expect(service.listConfigs('org1', adminUser)).resolves.toEqual([]);
  });

  // ---- RF-IA-001: listConfigs ----

  it('returns configs for organization', async () => {
    const configs = [{ id: 'c1', useCase: 'ANAMNESE', enabled: true }];
    mockPrisma.aiConfig.findMany.mockResolvedValue(configs);
    const result = await service.listConfigs('org1', orgUser);
    expect(result).toEqual(configs);
    expect(mockPrisma.aiConfig.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: 'org1' } }),
    );
  });

  // ---- RF-IA-002: upsertConfig ----

  it('upserts config with defaults', async () => {
    const dto = { useCase: 'ANAMNESE', riskClassification: 'APOIO', purpose: 'Apoio clínico' };
    mockPrisma.aiConfig.upsert.mockResolvedValue({ id: 'c1', ...dto });
    const result = await service.upsertConfig('org1', dto, orgUser);
    expect(result.id).toBe('c1');
    expect(mockPrisma.aiConfig.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ enabled: false, provider: 'simulated' }),
      }),
    );
  });

  // ---- RF-IA-003: approveConfig ----

  it('approves existing config', async () => {
    mockPrisma.aiConfig.findUnique.mockResolvedValue({ id: 'c1', useCase: 'ANAMNESE' });
    mockPrisma.aiConfig.update.mockResolvedValue({ id: 'c1', approvedBy: 'user1' });
    const result = await service.approveConfig('org1', 'ANAMNESE', orgUser);
    expect(result.approvedBy).toBe('user1');
  });

  it('throws NotFoundException when config not found for approval', async () => {
    mockPrisma.aiConfig.findUnique.mockResolvedValue(null);
    await expect(service.approveConfig('org1', 'NONEXISTENT', orgUser)).rejects.toThrow(NotFoundException);
  });

  // ---- RF-IA-004: disableConfig ----

  it('disables config', async () => {
    mockPrisma.aiConfig.findUnique.mockResolvedValue({ id: 'c1' });
    mockPrisma.aiConfig.update.mockResolvedValue({ id: 'c1', enabled: false });
    const result = await service.disableConfig('org1', 'ANAMNESE', orgUser);
    expect(result.enabled).toBe(false);
  });

  // ---- RF-IA-005: generateDraft ----

  it('generates simulated draft with disclaimer', async () => {
    const config = { id: 'c1', enabled: true, useCase: 'ANAMNESE', modelId: 'sim', modelVersion: '1', promptVersion: 'v1' };
    const draft = {
      id: 'd1',
      status: AiDraftStatus.PENDENTE,
      output: { _notice: 'SIMULAÇÃO', draft: 'test' },
    };
    mockPrisma.aiConfig.findUnique.mockResolvedValue(config);
    mockPrisma.aiDraft.create.mockResolvedValue(draft);
    mockPrisma.aiUsageLog.create.mockResolvedValue({});

    const result = await service.generateDraft('org1', {
      useCase: 'ANAMNESE',
      inputSummary: 'Paciente com febre',
    }, orgUser);

    expect(result.status).toBe(AiDraftStatus.PENDENTE);
    expect(result.output).toHaveProperty('_notice');
  });

  it('throws BadRequestException when use case is disabled', async () => {
    mockPrisma.aiConfig.findUnique.mockResolvedValue({ id: 'c1', enabled: false, useCase: 'ANAMNESE' });
    await expect(service.generateDraft('org1', { useCase: 'ANAMNESE', inputSummary: 'Test' }, orgUser))
      .rejects.toThrow(BadRequestException);
  });

  it('throws NotFoundException when config does not exist', async () => {
    mockPrisma.aiConfig.findUnique.mockResolvedValue(null);
    await expect(service.generateDraft('org1', { useCase: 'MISSING', inputSummary: 'Test' }, orgUser))
      .rejects.toThrow(NotFoundException);
  });

  // ---- RF-IA-006: listPendingDrafts ----

  it('lists pending drafts filtered by useCase', async () => {
    const drafts = [{ id: 'd1', status: AiDraftStatus.PENDENTE }];
    mockPrisma.aiDraft.findMany.mockResolvedValue(drafts);
    const result = await service.listPendingDrafts('org1', orgUser, { useCase: 'ANAMNESE' });
    expect(result).toEqual(drafts);
    expect(mockPrisma.aiDraft.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: AiDraftStatus.PENDENTE }) }),
    );
  });

  // ---- RF-IA-007: acceptDraft ----

  it('accepts a pending draft', async () => {
    mockPrisma.aiDraft.findFirst.mockResolvedValue({ id: 'd1', status: AiDraftStatus.PENDENTE, useCase: 'ANAMNESE' });
    mockPrisma.aiDraft.update.mockResolvedValue({ id: 'd1', status: AiDraftStatus.ACEITO });
    mockPrisma.aiUsageLog.create.mockResolvedValue({});

    const result = await service.acceptDraft('org1', 'd1', 'OK', orgUser);
    expect(result.status).toBe(AiDraftStatus.ACEITO);
  });

  it('throws when accepting non-pending draft', async () => {
    mockPrisma.aiDraft.findFirst.mockResolvedValue({ id: 'd1', status: AiDraftStatus.ACEITO, useCase: 'X' });
    await expect(service.acceptDraft('org1', 'd1', undefined, orgUser)).rejects.toThrow(BadRequestException);
  });

  // ---- RF-IA-008: rejectDraft ----

  it('rejects a pending draft', async () => {
    mockPrisma.aiDraft.findFirst.mockResolvedValue({ id: 'd1', status: AiDraftStatus.PENDENTE, useCase: 'ANAMNESE' });
    mockPrisma.aiDraft.update.mockResolvedValue({ id: 'd1', status: AiDraftStatus.REJEITADO });
    mockPrisma.aiUsageLog.create.mockResolvedValue({});

    const result = await service.rejectDraft('org1', 'd1', 'Incorreto', orgUser);
    expect(result.status).toBe(AiDraftStatus.REJEITADO);
  });

  it('throws when rejecting non-pending draft', async () => {
    mockPrisma.aiDraft.findFirst.mockResolvedValue({ id: 'd1', status: AiDraftStatus.REJEITADO, useCase: 'X' });
    await expect(service.rejectDraft('org1', 'd1', 'Motivo', orgUser)).rejects.toThrow(BadRequestException);
  });

  // ---- RF-IA-009: expireOldDrafts ----

  it('expires drafts past their expiry', async () => {
    mockPrisma.aiDraft.updateMany.mockResolvedValue({ count: 3 });
    const result = await service.expireOldDrafts('org1', orgUser);
    expect(result).toEqual({ count: 3 });
    expect(mockPrisma.aiDraft.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: AiDraftStatus.PENDENTE }),
        data: { status: AiDraftStatus.EXPIRADO },
      }),
    );
  });

  // ---- RF-IA-010: recordQualityMetric ----

  it('records quality metric', async () => {
    mockPrisma.aiQualityMetric.create.mockResolvedValue({ id: 'm1' });
    const dto = {
      useCase: 'ANAMNESE',
      modelId: 'gpt-4',
      periodStart: new Date('2026-09-01'),
      periodEnd: new Date('2026-09-30'),
      totalRequests: 100,
      acceptedCount: 80,
      rejectedCount: 20,
    };
    const result = await service.recordQualityMetric('org1', dto, orgUser);
    expect(result.id).toBe('m1');
  });

  // ---- RF-IA-011: listQualityMetrics ----

  it('lists quality metrics', async () => {
    mockPrisma.aiQualityMetric.findMany.mockResolvedValue([{ id: 'm1' }]);
    const result = await service.listQualityMetrics('org1', orgUser);
    expect(result).toHaveLength(1);
  });

  // ---- RF-IA-012: listUsageLogs ----

  it('lists usage logs', async () => {
    mockPrisma.aiUsageLog.findMany.mockResolvedValue([{ id: 'l1', action: 'generate' }]);
    const result = await service.listUsageLogs('org1', orgUser);
    expect(result[0].action).toBe('generate');
  });
});
