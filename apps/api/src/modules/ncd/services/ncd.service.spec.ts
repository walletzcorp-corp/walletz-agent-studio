import { Test, TestingModule } from '@nestjs/testing';
import { NcdService } from './ncd.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { NcdTemplateType, NcdVersionStatus, NcdAutomationStatus } from '@prisma/client';

const orgUser = { sub: 'user-1', email: 'u@t.com', isWalletzAdmin: false, organizationIds: ['org-1'], tenantIds: [] };
const outsider = { sub: 'out-1', email: 'o@t.com', isWalletzAdmin: false, organizationIds: ['org-2'], tenantIds: [] };

let mockPrisma: any;

describe('NcdService', () => {
  let service: NcdService;

  beforeEach(async () => {
    mockPrisma = {
      ncdTemplate: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn(), count: jest.fn() },
      ncdVersion: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn(), updateMany: jest.fn(), count: jest.fn() },
      ncdAutomation: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn(), count: jest.fn() },
      ncdSimulation: { create: jest.fn(), count: jest.fn() },
      $transaction: jest.fn((fn: any) => (Array.isArray(fn) ? Promise.all(fn) : fn(mockPrisma))),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [NcdService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<NcdService>(NcdService);
  });

  afterEach(() => { jest.resetAllMocks(); });

  // Segurança
  it('rejects outsider listing templates', async () => {
    await expect(service.listTemplates('org-1', outsider)).rejects.toThrow(ForbiddenException);
  });

  // Templates
  it('creates template', async () => {
    mockPrisma.ncdTemplate.create.mockResolvedValue({ id: 'tpl1', name: 'Anamnese', templateType: NcdTemplateType.FORMULARIO });
    const result = await service.createTemplate('org-1', orgUser, { name: 'Anamnese', templateType: NcdTemplateType.FORMULARIO });
    expect(result.id).toBe('tpl1');
  });

  it('lists templates with count', async () => {
    mockPrisma.ncdTemplate.findMany.mockResolvedValue([{ id: 'tpl1', _count: { versions: 3 } }]);
    const result = await service.listTemplates('org-1', orgUser);
    expect(result).toHaveLength(1);
  });

  // Versionamento
  it('creates version with incremented number', async () => {
    mockPrisma.ncdTemplate.findFirst.mockResolvedValue({ id: 'tpl1' });
    mockPrisma.ncdVersion.findFirst.mockResolvedValue({ versionNumber: 2 });
    mockPrisma.ncdVersion.create.mockResolvedValue({ id: 'v1', versionNumber: 3 });
    const result = await service.createVersion('org-1', orgUser, { templateId: 'tpl1', schema: { fields: [] } });
    expect(result.versionNumber).toBe(3);
  });

  it('throws NotFoundException for missing template on version create', async () => {
    mockPrisma.ncdTemplate.findFirst.mockResolvedValue(null);
    await expect(service.createVersion('org-1', orgUser, { templateId: 'x', schema: {} })).rejects.toThrow(NotFoundException);
  });

  it('blocks approving version not in AGUARDANDO_APROVACAO', async () => {
    mockPrisma.ncdVersion.findFirst.mockResolvedValue({ id: 'v1', status: NcdVersionStatus.RASCUNHO });
    await expect(service.approveVersion('org-1', orgUser, 'v1')).rejects.toThrow(BadRequestException);
  });

  it('publishes version retiring previous PUBLICADO', async () => {
    mockPrisma.ncdVersion.findFirst.mockResolvedValue({ id: 'v2', templateId: 'tpl1', status: NcdVersionStatus.RASCUNHO, approvedBy: null, approvedAt: null });
    mockPrisma.ncdVersion.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.ncdVersion.update.mockResolvedValue({ id: 'v2', status: NcdVersionStatus.PUBLICADO });
    mockPrisma.ncdTemplate.update.mockResolvedValue({});
    await service.publishVersion('org-1', orgUser, 'v2');
    expect(mockPrisma.ncdVersion.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: NcdVersionStatus.RETIRADO }) }),
    );
  });

  it('blocks publishing RETIRADO version', async () => {
    mockPrisma.ncdVersion.findFirst.mockResolvedValue({ id: 'v1', status: NcdVersionStatus.RETIRADO });
    await expect(service.publishVersion('org-1', orgUser, 'v1')).rejects.toThrow(BadRequestException);
  });

  it('blocks retiring non-PUBLICADO version', async () => {
    mockPrisma.ncdVersion.findFirst.mockResolvedValue({ id: 'v1', status: NcdVersionStatus.RASCUNHO });
    await expect(service.retireVersion('org-1', orgUser, 'v1')).rejects.toThrow(BadRequestException);
  });

  // Simulação com dados fictícios
  it('runs simulation with required fields and passes', async () => {
    mockPrisma.ncdVersion.findFirst.mockResolvedValue({
      id: 'v1',
      schema: { fields: [{ name: 'nome', required: true }, { name: 'idade', required: true }] },
    });
    mockPrisma.ncdSimulation.create.mockResolvedValue({ id: 'sim1', passed: true });
    const result = await service.runSimulation('org-1', orgUser, { versionId: 'v1', inputData: { nome: 'João', idade: 30 } });
    expect(result.passed).toBe(true);
  });

  it('runs simulation and fails missing required fields', async () => {
    mockPrisma.ncdVersion.findFirst.mockResolvedValue({
      id: 'v1',
      schema: { fields: [{ name: 'nome', required: true }] },
    });
    mockPrisma.ncdSimulation.create.mockResolvedValue({ id: 'sim2', passed: false });
    const result = await service.runSimulation('org-1', orgUser, { versionId: 'v1', inputData: {} });
    expect(result.passed).toBe(false);
  });

  // Automações com limites
  it('creates automation with maxExecutions', async () => {
    mockPrisma.ncdAutomation.create.mockResolvedValue({ id: 'a1', status: NcdAutomationStatus.ATIVO, maxExecutions: 100 });
    const result = await service.createAutomation('org-1', orgUser, { name: 'Alerta pós-consulta', triggerEvent: 'appointment.completed', maxExecutions: 100 });
    expect(result.maxExecutions).toBe(100);
  });

  it('pauses automation', async () => {
    mockPrisma.ncdAutomation.findFirst.mockResolvedValue({ id: 'a1', status: NcdAutomationStatus.ATIVO });
    mockPrisma.ncdAutomation.update.mockResolvedValue({ id: 'a1', status: NcdAutomationStatus.PAUSADO });
    await service.updateAutomationStatus('org-1', orgUser, 'a1', { status: NcdAutomationStatus.PAUSADO });
    expect(mockPrisma.ncdAutomation.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: NcdAutomationStatus.PAUSADO }) }),
    );
  });

  it('throws NotFoundException updating missing automation', async () => {
    mockPrisma.ncdAutomation.findFirst.mockResolvedValue(null);
    await expect(service.updateAutomationStatus('org-1', orgUser, 'x', { status: NcdAutomationStatus.INATIVO })).rejects.toThrow(NotFoundException);
  });

  // Dashboard
  it('returns ncd dashboard', async () => {
    mockPrisma.ncdTemplate.count.mockResolvedValue(5);
    mockPrisma.ncdVersion.count.mockResolvedValue(3);
    mockPrisma.ncdAutomation.count.mockResolvedValue(4);
    mockPrisma.ncdSimulation.count.mockResolvedValue(12);
    const result = await service.getDashboard('org-1', orgUser);
    expect(result).toHaveProperty('totalTemplates', 5);
    expect(result).toHaveProperty('activeAutomations', 4);
  });
});
