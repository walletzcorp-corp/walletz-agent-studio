import { Test, TestingModule } from '@nestjs/testing';
import { DiaService } from './dia.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { DiaOrderStatus, DiaSampleStatus, DiaResultStatus } from '@prisma/client';

const orgUser = { sub: 'user-1', email: 'u@t.com', isWalletzAdmin: false, organizationIds: ['org-1'], tenantIds: [] };
const outsider = { sub: 'out-1', email: 'o@t.com', isWalletzAdmin: false, organizationIds: ['org-2'], tenantIds: [] };

let mockPrisma: any;

describe('DiaService', () => {
  let service: DiaService;

  beforeEach(async () => {
    mockPrisma = {
      diaOrder: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn(), count: jest.fn() },
      diaSample: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn(), count: jest.fn() },
      diaResult: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn(), count: jest.fn() },
      diaWorkItem: { create: jest.fn(), findMany: jest.fn() },
      $transaction: jest.fn((fn: any) => (Array.isArray(fn) ? Promise.all(fn) : fn(mockPrisma))),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [DiaService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<DiaService>(DiaService);
  });

  afterEach(() => { jest.resetAllMocks(); });

  // Segurança
  it('rejects outsider listing orders', async () => {
    await expect(service.listOrders('org-1', outsider)).rejects.toThrow(ForbiddenException);
  });

  // Pedidos
  it('creates exam order', async () => {
    mockPrisma.diaOrder.create.mockResolvedValue({ id: 'o1', status: DiaOrderStatus.SOLICITADO });
    const result = await service.createOrder('org-1', orgUser, { patientId: 'pat-1', examCode: 'HMG', examName: 'Hemograma', examType: 'LAB' });
    expect(result.id).toBe('o1');
  });

  it('blocks updating cancelled order', async () => {
    mockPrisma.diaOrder.findFirst.mockResolvedValue({ id: 'o1', status: DiaOrderStatus.CANCELADO });
    await expect(service.updateOrderStatus('org-1', orgUser, 'o1', { status: DiaOrderStatus.COLETADO })).rejects.toThrow(BadRequestException);
  });

  it('throws NotFoundException updating missing order', async () => {
    mockPrisma.diaOrder.findFirst.mockResolvedValue(null);
    await expect(service.updateOrderStatus('org-1', orgUser, 'x', { status: DiaOrderStatus.COLETADO })).rejects.toThrow(NotFoundException);
  });

  // Amostras
  it('registers sample', async () => {
    mockPrisma.diaOrder.findFirst.mockResolvedValue({ id: 'o1' });
    mockPrisma.diaSample.findFirst.mockResolvedValue(null);
    mockPrisma.diaSample.create.mockResolvedValue({ id: 's1', barcode: 'BC001' });
    const result = await service.registerSample('org-1', orgUser, { orderId: 'o1', barcode: 'BC001', sampleType: 'SANGUE' });
    expect(result.barcode).toBe('BC001');
  });

  it('blocks duplicate barcode', async () => {
    mockPrisma.diaOrder.findFirst.mockResolvedValue({ id: 'o1' });
    mockPrisma.diaSample.findFirst.mockResolvedValue({ id: 'existing' });
    await expect(service.registerSample('org-1', orgUser, { orderId: 'o1', barcode: 'DUP', sampleType: 'SANGUE' })).rejects.toThrow(BadRequestException);
  });

  it('rejects sample with reason', async () => {
    mockPrisma.diaSample.findFirst.mockResolvedValue({ id: 's1', status: DiaSampleStatus.RECEBIDA });
    mockPrisma.diaSample.update.mockResolvedValue({ id: 's1', status: DiaSampleStatus.REJEITADA });
    await service.rejectSample('org-1', orgUser, 's1', { rejectionReason: 'Hemolisada' });
    expect(mockPrisma.diaSample.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: DiaSampleStatus.REJEITADA, rejectedBy: 'user-1' }) }),
    );
  });

  it('blocks rejecting already rejected sample', async () => {
    mockPrisma.diaSample.findFirst.mockResolvedValue({ id: 's1', status: DiaSampleStatus.REJEITADA });
    await expect(service.rejectSample('org-1', orgUser, 's1', { rejectionReason: 'x' })).rejects.toThrow(BadRequestException);
  });

  it('creates recollect from rejected sample', async () => {
    mockPrisma.diaSample.findFirst.mockResolvedValueOnce({ id: 'parent', status: DiaSampleStatus.REJEITADA, orderId: 'o1' });
    mockPrisma.diaSample.findFirst.mockResolvedValueOnce(null);
    mockPrisma.diaSample.create.mockResolvedValue({ id: 's2', parentSampleId: 'parent' });
    const result = await service.recolectSample('org-1', orgUser, 'parent', { barcode: 'BC002', sampleType: 'SANGUE' });
    expect(result.parentSampleId).toBe('parent');
  });

  it('blocks recollect from non-rejected sample', async () => {
    mockPrisma.diaSample.findFirst.mockResolvedValue({ id: 's1', status: DiaSampleStatus.RECEBIDA, orderId: 'o1' });
    await expect(service.recolectSample('org-1', orgUser, 's1', { barcode: 'BC003', sampleType: 'SANGUE' })).rejects.toThrow(BadRequestException);
  });

  // Resultados
  it('creates result with incremented version', async () => {
    mockPrisma.diaOrder.findFirst.mockResolvedValue({ id: 'o1' });
    mockPrisma.diaResult.findFirst.mockResolvedValue({ version: 1 });
    mockPrisma.diaResult.create.mockResolvedValue({ id: 'res1', version: 2 });
    const result = await service.createResult('org-1', orgUser, { orderId: 'o1', resultData: { hgb: 12 } });
    expect(result.version).toBe(2);
  });

  it('releases result', async () => {
    mockPrisma.diaResult.findFirst.mockResolvedValue({ id: 'res1', status: DiaResultStatus.RASCUNHO });
    mockPrisma.diaResult.update.mockResolvedValue({ id: 'res1', status: DiaResultStatus.LIBERADO });
    await service.releaseResult('org-1', orgUser, 'res1');
    expect(mockPrisma.diaResult.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: DiaResultStatus.LIBERADO, releasedBy: 'user-1' }) }),
    );
  });

  it('blocks releasing already liberado result', async () => {
    mockPrisma.diaResult.findFirst.mockResolvedValue({ id: 'res1', status: DiaResultStatus.RETIFICADO });
    await expect(service.releaseResult('org-1', orgUser, 'res1')).rejects.toThrow(BadRequestException);
  });

  it('acknowledges critical value', async () => {
    mockPrisma.diaResult.findFirst.mockResolvedValue({ id: 'res1', isCritical: true, criticalAckedBy: null });
    mockPrisma.diaResult.update.mockResolvedValue({ id: 'res1', criticalAckedBy: 'user-1' });
    await service.acknowledgeCritical('org-1', orgUser, 'res1');
    expect(mockPrisma.diaResult.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ criticalAckedBy: 'user-1' }) }),
    );
  });

  it('blocks acknowledging non-critical result', async () => {
    mockPrisma.diaResult.findFirst.mockResolvedValue({ id: 'res1', isCritical: false });
    await expect(service.acknowledgeCritical('org-1', orgUser, 'res1')).rejects.toThrow(BadRequestException);
  });

  it('blocks double acknowledgment of critical', async () => {
    mockPrisma.diaResult.findFirst.mockResolvedValue({ id: 'res1', isCritical: true, criticalAckedBy: 'other-user' });
    await expect(service.acknowledgeCritical('org-1', orgUser, 'res1')).rejects.toThrow(BadRequestException);
  });

  it('rectifies released result creating new version', async () => {
    mockPrisma.diaResult.findFirst.mockResolvedValue({ id: 'res1', status: DiaResultStatus.LIBERADO, version: 1, orderId: 'o1', isCritical: false });
    mockPrisma.diaResult.update.mockResolvedValue({});
    mockPrisma.diaResult.create.mockResolvedValue({ id: 'res2', version: 2 });
    const result = await service.rectifyResult('org-1', orgUser, 'res1', { resultData: { hgb: 13 }, rectificationNote: 'Erro de digitação' });
    expect(result.version).toBe(2);
  });

  it('blocks rectifying non-liberado result', async () => {
    mockPrisma.diaResult.findFirst.mockResolvedValue({ id: 'res1', status: DiaResultStatus.RASCUNHO });
    await expect(service.rectifyResult('org-1', orgUser, 'res1', { resultData: {}, rectificationNote: 'x' })).rejects.toThrow(BadRequestException);
  });

  // Dashboard
  it('returns dia dashboard', async () => {
    mockPrisma.diaOrder.count.mockResolvedValueOnce(20).mockResolvedValueOnce(15);
    mockPrisma.diaResult.count.mockResolvedValue(1);
    mockPrisma.diaSample.count.mockResolvedValueOnce(25).mockResolvedValueOnce(3);
    const result = await service.getDashboard('org-1', orgUser);
    expect(result).toHaveProperty('totalOrders', 20);
    expect(result).toHaveProperty('criticalUnacked', 1);
  });
});
