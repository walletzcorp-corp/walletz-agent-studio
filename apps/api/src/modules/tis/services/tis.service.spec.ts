import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { TisService } from './tis.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

let mockPrisma: any;

const adminUser = {
  sub: 'user-1', email: 'admin@test.com', name: 'Admin',
  isWalletzAdmin: true, organizationIds: ['org-1'], tenantIds: [],
};
const orgUser = {
  sub: 'user-2', email: 'user@test.com',
  isWalletzAdmin: false, organizationIds: ['org-1'], tenantIds: [],
};
const outsideUser = {
  sub: 'user-3', email: 'other@test.com',
  isWalletzAdmin: false, organizationIds: ['org-2'], tenantIds: [],
};

describe('TisService', () => {
  let service: TisService;

  beforeEach(async () => {
    mockPrisma = {
      insuranceCarrier: { findMany: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
      insurancePlan: { create: jest.fn() },
      insuranceContract: { findMany: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
      tussCode: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      insuranceGuide: { findMany: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
      insuranceGuideItem: { create: jest.fn() },
      insuranceLot: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
      insuranceLotItem: { create: jest.fn() },
      insuranceClaim: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
      insuranceClaimAppeal: { create: jest.fn() },
      $transaction: jest.fn((fn: any) => (Array.isArray(fn) ? Promise.all(fn) : fn(mockPrisma))),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [TisService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<TisService>(TisService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // ── Acesso ─────────────────────────────────────────────────────────────────

  it('listCarriers — rejeita acesso externo', async () => {
    await expect(service.listCarriers('org-1', outsideUser)).rejects.toThrow(ForbiddenException);
  });

  it('listCarriers — admin pode acessar qualquer org', async () => {
    mockPrisma.insuranceCarrier.findMany.mockResolvedValue([]);
    const result = await service.listCarriers('org-x', adminUser);
    expect(result).toEqual([]);
    expect(mockPrisma.insuranceCarrier.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: 'org-x', active: true } }),
    );
  });

  // ── Operadoras ─────────────────────────────────────────────────────────────

  it('createCarrier — cria operadora com código ANS único', async () => {
    mockPrisma.insuranceCarrier.findUnique.mockResolvedValue(null);
    const carrier = { id: 'c-1', organizationId: 'org-1', ansCode: '100', name: 'Operadora A' };
    mockPrisma.insuranceCarrier.create.mockResolvedValue(carrier);
    const result = await service.createCarrier('org-1', { ansCode: '100', name: 'Operadora A' }, orgUser);
    expect(result.ansCode).toBe('100');
  });

  it('createCarrier — rejeita código ANS duplicado', async () => {
    mockPrisma.insuranceCarrier.findUnique.mockResolvedValue({ id: 'c-1' });
    await expect(service.createCarrier('org-1', { ansCode: '100', name: 'X' }, orgUser)).rejects.toThrow(ConflictException);
  });

  it('updateCarrier — 404 se não encontrada', async () => {
    mockPrisma.insuranceCarrier.findFirst.mockResolvedValue(null);
    await expect(service.updateCarrier('c-x', 'org-1', { name: 'Y' }, orgUser)).rejects.toThrow(NotFoundException);
  });

  it('updateCarrier — atualiza campos', async () => {
    mockPrisma.insuranceCarrier.findFirst.mockResolvedValue({ id: 'c-1' });
    mockPrisma.insuranceCarrier.update.mockResolvedValue({ id: 'c-1', active: false });
    const result = await service.updateCarrier('c-1', 'org-1', { active: false }, orgUser);
    expect(result.active).toBe(false);
  });

  // ── Planos ─────────────────────────────────────────────────────────────────

  it('createPlan — 404 se operadora não encontrada', async () => {
    mockPrisma.insuranceCarrier.findFirst.mockResolvedValue(null);
    await expect(service.createPlan('c-x', 'org-1', { name: 'P1', planCode: 'P001', planType: 'INDIVIDUAL' }, orgUser)).rejects.toThrow(NotFoundException);
  });

  it('createPlan — cria plano', async () => {
    mockPrisma.insuranceCarrier.findFirst.mockResolvedValue({ id: 'c-1' });
    mockPrisma.insurancePlan.create.mockResolvedValue({ id: 'plan-1', name: 'P1' });
    const result = await service.createPlan('c-1', 'org-1', { name: 'P1', planCode: 'P001', planType: 'INDIVIDUAL' }, orgUser);
    expect(result.name).toBe('P1');
  });

  // ── Contratos ──────────────────────────────────────────────────────────────

  it('createContract — rejeita número duplicado', async () => {
    mockPrisma.insuranceContract.findUnique.mockResolvedValue({ id: 'ct-1' });
    await expect(service.createContract('org-1', {
      carrierId: 'c-1', contractNumber: 'CT001', tissVersion: '3.05.00',
      operatorCode: 'OP1', providerCode: 'PR1', validFrom: '2026-01-01',
    }, orgUser)).rejects.toThrow(ConflictException);
  });

  it('createContract — cria contrato', async () => {
    mockPrisma.insuranceContract.findUnique.mockResolvedValue(null);
    mockPrisma.insuranceContract.create.mockResolvedValue({ id: 'ct-1', contractNumber: 'CT001' });
    const result = await service.createContract('org-1', {
      carrierId: 'c-1', contractNumber: 'CT001', tissVersion: '3.05.00',
      operatorCode: 'OP1', providerCode: 'PR1', validFrom: '2026-01-01',
    }, orgUser);
    expect(result.contractNumber).toBe('CT001');
  });

  // ── Tabela TUSS ────────────────────────────────────────────────────────────

  it('upsertTussCode — cria novo código', async () => {
    mockPrisma.tussCode.findUnique.mockResolvedValue(null);
    mockPrisma.tussCode.create.mockResolvedValue({ id: 't-1', code: '10101012', version: '1.0' });
    const result = await service.upsertTussCode('org-1', {
      code: '10101012', description: 'Consulta', tableCode: '22', version: '1.0', validFrom: '2026-01-01',
    }, orgUser);
    expect(result.code).toBe('10101012');
    expect(mockPrisma.tussCode.create).toHaveBeenCalled();
  });

  it('upsertTussCode — atualiza código existente', async () => {
    mockPrisma.tussCode.findUnique.mockResolvedValue({ id: 't-1' });
    mockPrisma.tussCode.update.mockResolvedValue({ id: 't-1', description: 'Consulta v2' });
    const result = await service.upsertTussCode('org-1', {
      code: '10101012', description: 'Consulta v2', tableCode: '22', version: '1.0', validFrom: '2026-01-01',
    }, orgUser);
    expect(mockPrisma.tussCode.update).toHaveBeenCalled();
    expect(result.description).toBe('Consulta v2');
  });

  // ── Guias ──────────────────────────────────────────────────────────────────

  it('createGuide — idempotência: retorna guia existente', async () => {
    const existingGuide = { id: 'g-1', items: [] };
    mockPrisma.insuranceGuide.findUnique.mockResolvedValue(existingGuide);
    const result = await service.createGuide('org-1', {
      contractId: 'ct-1', guideType: 'CONSULTA', serviceDate: '2026-10-01', unitId: 'u-1',
      idempotencyKey: 'idem-abc', items: [],
    }, orgUser);
    expect(result).toBe(existingGuide);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('createGuide — 404 se contrato inativo', async () => {
    mockPrisma.insuranceGuide.findUnique.mockResolvedValue(null);
    mockPrisma.insuranceContract.findFirst.mockResolvedValue(null);
    await expect(service.createGuide('org-1', {
      contractId: 'ct-x', guideType: 'CONSULTA', serviceDate: '2026-10-01', unitId: 'u-1', items: [],
    }, orgUser)).rejects.toThrow(NotFoundException);
  });

  it('createGuide — cria guia com itens NUMERIC', async () => {
    mockPrisma.insuranceGuide.findUnique.mockResolvedValue(null);
    mockPrisma.insuranceContract.findFirst.mockResolvedValue({ id: 'ct-1', active: true });
    const createdGuide = { id: 'g-1' };
    mockPrisma.insuranceGuide.create.mockResolvedValue(createdGuide);
    mockPrisma.insuranceGuideItem.create.mockResolvedValue({});
    mockPrisma.insuranceGuide.findUnique.mockResolvedValue({ id: 'g-1', items: [{ totalValue: new Decimal('250.00') }] });
    const result = await service.createGuide('org-1', {
      contractId: 'ct-1', guideType: 'CONSULTA', serviceDate: '2026-10-01', unitId: 'u-1',
      items: [{ description: 'Consulta médica', quantity: 1, unitValue: 250 }],
    }, orgUser);
    expect(result).toBeTruthy();
    expect(mockPrisma.insuranceGuideItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          totalValue: expect.any(Decimal),
          unitValue: expect.any(Decimal),
          quantity: expect.any(Decimal),
        }),
      }),
    );
  });

  it('validateGuide — 404 se não encontrada', async () => {
    mockPrisma.insuranceGuide.findFirst.mockResolvedValue(null);
    await expect(service.validateGuide('g-x', 'org-1', orgUser)).rejects.toThrow(NotFoundException);
  });

  it('validateGuide — registra erros de validação', async () => {
    mockPrisma.insuranceGuide.findFirst.mockResolvedValue({
      id: 'g-1', patientId: null, items: [{ unitValue: new Decimal('0') }],
      contract: { active: true },
    });
    mockPrisma.insuranceGuide.update.mockResolvedValue({ id: 'g-1', validationErrors: ['Paciente não informado', 'Item com valor zero ou negativo'] });
    const result = await service.validateGuide('g-1', 'org-1', orgUser);
    expect(result.validationErrors).toHaveLength(2);
  });

  it('updateGuideStatus — não altera guia cancelada', async () => {
    mockPrisma.insuranceGuide.findFirst.mockResolvedValue({ id: 'g-1', status: 'CANCELADO' });
    await expect(service.updateGuideStatus('g-1', 'org-1', { status: 'AUTORIZADO' }, orgUser)).rejects.toThrow(BadRequestException);
  });

  // ── Lotes ──────────────────────────────────────────────────────────────────

  it('createLot — rejeita lote sem guias', async () => {
    mockPrisma.insuranceContract.findFirst.mockResolvedValue({ id: 'ct-1' });
    await expect(service.createLot('org-1', { contractId: 'ct-1', competenceMonth: 10, competenceYear: 2026, guideIds: [] }, orgUser)).rejects.toThrow(BadRequestException);
  });

  it('createLot — cria lote com totalValue NUMERIC', async () => {
    mockPrisma.insuranceContract.findFirst.mockResolvedValue({ id: 'ct-1' });
    mockPrisma.insuranceGuide.findMany.mockResolvedValue([
      { id: 'g-1', items: [{ totalValue: new Decimal('500.00') }] },
    ]);
    const createdLot = { id: 'lot-1', totalValue: new Decimal('500.00') };
    mockPrisma.insuranceLot.create.mockResolvedValue(createdLot);
    mockPrisma.insuranceLotItem.create.mockResolvedValue({});
    mockPrisma.insuranceGuide.update.mockResolvedValue({});
    mockPrisma.insuranceLot.findUnique.mockResolvedValue({ id: 'lot-1', items: [] });
    const result = await service.createLot('org-1', { contractId: 'ct-1', competenceMonth: 10, competenceYear: 2026, guideIds: ['g-1'] }, orgUser);
    expect(mockPrisma.insuranceLot.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ totalValue: expect.any(Decimal) }) }),
    );
    expect(mockPrisma.insuranceGuide.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'ENVIADO' } }),
    );
  });

  it('closeLot — 400 se lote não ABERTO', async () => {
    mockPrisma.insuranceLot.findFirst.mockResolvedValue({ id: 'lot-1', status: 'ENVIADO' });
    await expect(service.closeLot('lot-1', 'org-1', orgUser)).rejects.toThrow(BadRequestException);
  });

  it('exportLotXml — 400 se lote não FECHADO', async () => {
    mockPrisma.insuranceLot.findFirst.mockResolvedValue({ id: 'lot-1', status: 'ABERTO' });
    await expect(service.exportLotXml('lot-1', 'org-1', orgUser)).rejects.toThrow(BadRequestException);
  });

  it('exportLotXml — retorna XML em modo simulação', async () => {
    const lot = {
      id: 'lot-1', status: 'FECHADO', lotNumber: 'LOT-202610-ABCD1234',
      contract: { tissVersion: '3.05.00', carrier: { ansCode: '000100' }, providerCode: 'PR1' },
      items: [{ guide: { id: 'g-1', guideNumber: 'GN001', serviceDate: new Date('2026-10-01'), items: [
        { itemCode: '10101012', description: 'Consulta', quantity: new Decimal('1'), unitValue: new Decimal('250.00') },
      ] } }],
    };
    mockPrisma.insuranceLot.findFirst.mockResolvedValue(lot);
    mockPrisma.insuranceLot.update.mockResolvedValue({});
    const result = await service.exportLotXml('lot-1', 'org-1', orgUser);
    expect(result.xml).toContain('SIMULAÇÃO');
    expect(result.xml).toContain('3.05.00');
    expect(result.note).toContain('simulação');
    expect(mockPrisma.insuranceLot.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'ENVIADO' }) }),
    );
  });

  // ── Glosas ─────────────────────────────────────────────────────────────────

  it('createClaim — 404 se guia não encontrada', async () => {
    mockPrisma.insuranceGuide.findFirst.mockResolvedValue(null);
    await expect(service.createClaim('org-1', {
      guideId: 'g-x', itemDescription: 'X', claimReason: 'Y', glosedValue: 100, responsibleParty: 'OPERADORA',
    }, orgUser)).rejects.toThrow(NotFoundException);
  });

  it('createClaim — atualiza guia para GLOSADO', async () => {
    mockPrisma.insuranceGuide.findFirst.mockResolvedValue({ id: 'g-1', status: 'ENVIADO' });
    mockPrisma.insuranceClaim.create.mockResolvedValue({ id: 'cl-1', glosedValue: new Decimal('100.00') });
    mockPrisma.insuranceGuide.update.mockResolvedValue({});
    await service.createClaim('org-1', {
      guideId: 'g-1', itemDescription: 'Item X', claimReason: 'Documentação incompleta',
      glosedValue: 100, responsibleParty: 'OPERADORA',
    }, orgUser);
    expect(mockPrisma.insuranceGuide.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'GLOSADO' } }),
    );
  });

  it('createClaim — glosedValue é Decimal', async () => {
    mockPrisma.insuranceGuide.findFirst.mockResolvedValue({ id: 'g-1', status: 'ENVIADO' });
    mockPrisma.insuranceClaim.create.mockResolvedValue({ id: 'cl-1' });
    mockPrisma.insuranceGuide.update.mockResolvedValue({});
    await service.createClaim('org-1', {
      guideId: 'g-1', itemDescription: 'Y', claimReason: 'Z', glosedValue: 250.75, responsibleParty: 'PRESTADOR',
    }, orgUser);
    expect(mockPrisma.insuranceClaim.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ glosedValue: expect.any(Decimal) }) }),
    );
  });

  it('createAppeal — 400 se glosa já resolvida', async () => {
    mockPrisma.insuranceClaim.findFirst.mockResolvedValue({ id: 'cl-1', status: 'ACEITA' });
    await expect(service.createAppeal('cl-1', 'org-1', { appealText: 'Recurso X' }, orgUser)).rejects.toThrow(BadRequestException);
  });

  it('createAppeal — cria recurso e atualiza status para RECURSO', async () => {
    mockPrisma.insuranceClaim.findFirst.mockResolvedValue({ id: 'cl-1', status: 'ABERTA' });
    mockPrisma.insuranceClaimAppeal.create.mockResolvedValue({ id: 'ap-1' });
    mockPrisma.insuranceClaim.update.mockResolvedValue({});
    await service.createAppeal('cl-1', 'org-1', { appealText: 'Recurso X' }, orgUser);
    expect(mockPrisma.insuranceClaim.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'RECURSO' } }),
    );
  });

  // ── Indicadores ────────────────────────────────────────────────────────────

  it('getIndicators — calcula taxa de glosa', async () => {
    const carrier = { id: 'c-1', name: 'Op A', ansCode: '100' };
    mockPrisma.insuranceGuide.findMany.mockResolvedValue([
      { id: 'g-1', items: [{ totalValue: new Decimal('1000.00') }], contract: { carrier } },
    ]);
    mockPrisma.insuranceClaim.findMany.mockResolvedValue([
      { id: 'cl-1', status: 'ABERTA', glosedValue: new Decimal('200.00'), guide: { contract: { carrier } } },
    ]);
    mockPrisma.insuranceLot.findMany.mockResolvedValue([]);
    const result = await service.getIndicators('org-1', orgUser);
    expect(Number(result.glosaRate)).toBeCloseTo(20, 1);
    expect(result.openClaims).toBe(1);
  });
});
