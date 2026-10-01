import { Test, TestingModule } from '@nestjs/testing';
import { MedService } from './med.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ForbiddenException, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { MedRecordStatus, MedRouteType, MedAdverseReactionSeverity, MedLotAlertType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const adminUser = { sub: 'admin-1', email: 'admin@test.com', isWalletzAdmin: true, organizationIds: [], tenantIds: [] };
const orgUser = { sub: 'user-1', email: 'user@test.com', isWalletzAdmin: false, organizationIds: ['org-1'], tenantIds: [] };
const outsider = { sub: 'out-1', email: 'out@test.com', isWalletzAdmin: false, organizationIds: ['org-2'], tenantIds: [] };

let mockPrisma: any;

describe('MedService', () => {
  let service: MedService;

  beforeEach(async () => {
    mockPrisma = {
      medProtocol: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      medAdministrationRecord: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      medVerification: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        upsert: jest.fn(),
      },
      medAdverseReaction: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
      medLotAlert: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      medRecordAudit: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
      $transaction: jest.fn((fn: any) => (Array.isArray(fn) ? Promise.all(fn) : fn(mockPrisma))),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [MedService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<MedService>(MedService);
  });

  afterEach(() => { jest.resetAllMocks(); });

  // Segurança / acesso
  it('rejects outsider listing records', async () => {
    await expect(service.listRecords('org-1', outsider)).rejects.toThrow(ForbiddenException);
  });

  it('allows walletz admin', async () => {
    mockPrisma.medAdministrationRecord.findMany.mockResolvedValue([]);
    await expect(service.listRecords('org-1', adminUser)).resolves.toEqual([]);
  });

  // Protocolos
  it('lists protocols', async () => {
    mockPrisma.medProtocol.findMany.mockResolvedValue([{ id: 'p1', name: 'POP' }]);
    const result = await service.listProtocols('org-1', orgUser);
    expect(result).toHaveLength(1);
    expect(mockPrisma.medProtocol.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: 'org-1', active: true } }),
    );
  });

  it('creates protocol', async () => {
    mockPrisma.medProtocol.findFirst.mockResolvedValue(null);
    mockPrisma.medProtocol.create.mockResolvedValue({ id: 'p1', name: 'POP IV' });
    const result = await service.createProtocol('org-1', orgUser, { name: 'POP IV', code: 'IV-001' });
    expect(result.id).toBe('p1');
  });

  it('rejects duplicate protocol code', async () => {
    mockPrisma.medProtocol.findFirst.mockResolvedValue({ id: 'p1' });
    await expect(service.createProtocol('org-1', orgUser, { name: 'POP', code: 'DUP' })).rejects.toThrow(ConflictException);
  });

  it('approves protocol', async () => {
    mockPrisma.medProtocol.findFirst.mockResolvedValue({ id: 'p1', organizationId: 'org-1' });
    mockPrisma.medProtocol.update.mockResolvedValue({ id: 'p1', approvedBy: 'user-1' });
    await service.approveProtocol('org-1', orgUser, 'p1');
    expect(mockPrisma.medProtocol.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ approvedBy: 'user-1' }) }),
    );
  });

  it('throws NotFoundException approving missing protocol', async () => {
    mockPrisma.medProtocol.findFirst.mockResolvedValue(null);
    await expect(service.approveProtocol('org-1', orgUser, 'p1')).rejects.toThrow(NotFoundException);
  });

  // Registros de administração
  it('blocks lot alert on create record', async () => {
    mockPrisma.medLotAlert.findFirst.mockResolvedValue({ id: 'la1', reason: 'Recolhimento oficial' });
    await expect(
      service.createRecord('org-1', orgUser, {
        patientId: 'pat-1', medicationName: 'Med A', dose: 10, doseUnit: 'mg',
        route: MedRouteType.ORAL, lotNumber: 'LOT-001', scheduledAt: new Date(),
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('blocks expired lot on create record', async () => {
    mockPrisma.medLotAlert.findFirst.mockResolvedValue(null);
    await expect(
      service.createRecord('org-1', orgUser, {
        patientId: 'pat-1', medicationName: 'Med A', dose: 10, doseUnit: 'mg',
        route: MedRouteType.ORAL, lotNumber: 'LOT-001',
        expiryDate: new Date('2020-01-01'), scheduledAt: new Date(),
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('creates record when lot is clear', async () => {
    mockPrisma.medLotAlert.findFirst.mockResolvedValue(null);
    mockPrisma.medAdministrationRecord.create.mockResolvedValue({ id: 'rec-1' });
    const result = await service.createRecord('org-1', orgUser, {
      patientId: 'pat-1', medicationName: 'Med A', dose: 10, doseUnit: 'mg',
      route: MedRouteType.ORAL, scheduledAt: new Date(),
    });
    expect(result.id).toBe('rec-1');
  });

  // Preparação
  it('registers preparation', async () => {
    mockPrisma.medAdministrationRecord.findFirst.mockResolvedValue({
      id: 'rec-1', organizationId: 'org-1', status: MedRecordStatus.RESERVADO, notes: null,
    });
    mockPrisma.medAdministrationRecord.update.mockResolvedValue({ id: 'rec-1', status: MedRecordStatus.PREPARADO });
    mockPrisma.medRecordAudit.create.mockResolvedValue({});
    await service.registerPreparation('org-1', orgUser, 'rec-1', {});
    expect(mockPrisma.medAdministrationRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: MedRecordStatus.PREPARADO }) }),
    );
  });

  it('blocks preparation of non-RESERVADO record', async () => {
    mockPrisma.medAdministrationRecord.findFirst.mockResolvedValue({
      id: 'rec-1', status: MedRecordStatus.ADMINISTRADO,
    });
    await expect(service.registerPreparation('org-1', orgUser, 'rec-1', {})).rejects.toThrow(BadRequestException);
  });

  // Administração
  it('requires two identifiers on administration', async () => {
    mockPrisma.medAdministrationRecord.findFirst.mockResolvedValue({
      id: 'rec-1', status: MedRecordStatus.PREPARADO, protocolId: null, notes: null,
    });
    await expect(
      service.registerAdministration('org-1', orgUser, 'rec-1', { patient1stId: '', patient2ndId: '' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('registers administration with two identifiers', async () => {
    mockPrisma.medAdministrationRecord.findFirst.mockResolvedValue({
      id: 'rec-1', status: MedRecordStatus.PREPARADO, protocolId: null, notes: null,
    });
    mockPrisma.medAdministrationRecord.update.mockResolvedValue({ id: 'rec-1', status: MedRecordStatus.ADMINISTRADO });
    mockPrisma.medRecordAudit.create.mockResolvedValue({});
    await service.registerAdministration('org-1', orgUser, 'rec-1', { patient1stId: 'CPF123', patient2ndId: 'DOB1990' });
    expect(mockPrisma.medAdministrationRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: MedRecordStatus.ADMINISTRADO }) }),
    );
  });

  it('enforces dual check when protocol requires it', async () => {
    mockPrisma.medAdministrationRecord.findFirst.mockResolvedValue({
      id: 'rec-1', status: MedRecordStatus.PREPARADO, protocolId: 'prot-1', notes: null,
    });
    mockPrisma.medProtocol.findUnique.mockResolvedValue({ id: 'prot-1', requiresDualCheck: true });
    mockPrisma.medVerification.findMany.mockResolvedValue([
      { verifiedBy: 'user-1', role: 'VERIFICADOR_1' },
    ]);
    await expect(
      service.registerAdministration('org-1', orgUser, 'rec-1', { patient1stId: 'CPF', patient2ndId: 'DOB' }),
    ).rejects.toThrow(BadRequestException);
  });

  // Dupla verificação
  it('blocks same user doing both verifications', async () => {
    mockPrisma.medAdministrationRecord.findFirst.mockResolvedValue({ id: 'rec-1', organizationId: 'org-1' });
    mockPrisma.medVerification.findFirst.mockResolvedValue({ verifiedBy: 'user-1', role: 'VERIFICADOR_1' });
    await expect(
      service.addVerification('org-1', orgUser, 'rec-1', { role: 'VERIFICADOR_2' }),
    ).rejects.toThrow(BadRequestException);
  });

  // Lote
  it('creates lot alert', async () => {
    mockPrisma.medLotAlert.create.mockResolvedValue({ id: 'la-1', active: true });
    const result = await service.createLotAlert('org-1', orgUser, {
      lotNumber: 'LOT-X', medicationName: 'Med X', alertType: MedLotAlertType.RECOLHIMENTO, reason: 'Anvisa',
    });
    expect(result.id).toBe('la-1');
  });

  it('resolves lot alert', async () => {
    mockPrisma.medLotAlert.findFirst.mockResolvedValue({ id: 'la-1', active: true });
    mockPrisma.medLotAlert.update.mockResolvedValue({ id: 'la-1', active: false });
    await service.resolveLotAlert('org-1', orgUser, 'la-1', { resolutionNotes: 'Lote liberado' });
    expect(mockPrisma.medLotAlert.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ active: false }) }),
    );
  });

  it('throws BadRequest resolving already-resolved alert', async () => {
    mockPrisma.medLotAlert.findFirst.mockResolvedValue({ id: 'la-1', active: false });
    await expect(service.resolveLotAlert('org-1', orgUser, 'la-1', { resolutionNotes: 'X' })).rejects.toThrow(BadRequestException);
  });

  // Reação adversa
  it('reports adverse reaction', async () => {
    mockPrisma.medAdverseReaction.create.mockResolvedValue({ id: 'ar-1' });
    const result = await service.reportAdverseReaction('org-1', orgUser, {
      patientId: 'pat-1', medicationName: 'Med', reactionDesc: 'Urticária',
      severity: MedAdverseReactionSeverity.MODERADA, onsetAt: new Date(),
    });
    expect(result.id).toBe('ar-1');
  });

  // Auditoria
  it('returns audit trail', async () => {
    mockPrisma.medAdministrationRecord.findFirst.mockResolvedValue({ id: 'rec-1', organizationId: 'org-1' });
    mockPrisma.medRecordAudit.findMany.mockResolvedValue([{ id: 'a1', action: 'PREPARADO' }]);
    const result = await service.getAuditTrail('org-1', orgUser, 'rec-1');
    expect(result).toHaveLength(1);
  });

  it('throws NotFoundException on audit trail for missing record', async () => {
    mockPrisma.medAdministrationRecord.findFirst.mockResolvedValue(null);
    await expect(service.getAuditTrail('org-1', orgUser, 'rec-x')).rejects.toThrow(NotFoundException);
  });

  // Correção
  it('blocks correction on non-ADMINISTRADO record', async () => {
    mockPrisma.medAdministrationRecord.findFirst.mockResolvedValue({ id: 'rec-1', status: MedRecordStatus.PREPARADO });
    await expect(
      service.correctRecord('org-1', orgUser, 'rec-1', { fieldName: 'notes', newValue: 'X', reason: 'Erro' }),
    ).rejects.toThrow(BadRequestException);
  });
});
