import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { MedicalRecordsService } from './services/medical-records.service';
import { ClinicalEntriesService } from './services/clinical-entries.service';
import { SignatureService } from './services/signature.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EntryStatus, SignatureStatus } from '@prisma/client';

const ORG_A = 'org-a-uuid';
const ORG_B = 'org-b-uuid';
const PATIENT_ID = 'patient-uuid';
const RECORD_ID = 'record-uuid';
const ENTRY_ID = 'entry-uuid';

const mockPrisma: Record<string, any> = {
  medicalRecord: { findUnique: jest.fn(), create: jest.fn() },
  clinicalEntry: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), findMany: jest.fn() },
  clinicalEntryAddendum: { create: jest.fn() },
  clinicalEntrySignature: { upsert: jest.fn() },
  pepAuditLog: { create: jest.fn() },
  patient: { findFirst: jest.fn() },
  $transaction: jest.fn((fn) => fn(mockPrisma)),
};

const adminUser = { sub: 'admin-sub', email: 'admin@demo.com', name: 'Admin', isWalletzAdmin: true, organizationIds: [], tenantIds: [] };
const orgAUser = { sub: 'user-a', email: 'a@demo.com', name: 'User A', isWalletzAdmin: false, organizationIds: [ORG_A], tenantIds: [] };
const orgBUser = { sub: 'user-b', email: 'b@demo.com', name: 'User B', isWalletzAdmin: false, organizationIds: [ORG_B], tenantIds: [] };

const mockRecord = { id: RECORD_ID, organizationId: ORG_A, patientId: PATIENT_ID };
const mockEntry = (status: EntryStatus, rv = 0) => ({
  id: ENTRY_ID,
  recordId: RECORD_ID,
  status,
  rowVersion: rv,
  record: { organizationId: ORG_A },
});

describe('MedicalRecordsService', () => {
  let service: MedicalRecordsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MedicalRecordsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<MedicalRecordsService>(MedicalRecordsService);
    jest.resetAllMocks();
    mockPrisma.pepAuditLog.create.mockResolvedValue({});
  });

  it('deve negar acesso cross-tenant ao criar prontuário', async () => {
    mockPrisma.patient.findFirst.mockResolvedValue(null);
    await expect(service.getOrCreate(PATIENT_ID, ORG_A, orgBUser)).rejects.toThrow(ForbiddenException);
  });

  it('deve negar acesso cross-tenant ao ler prontuário', async () => {
    mockPrisma.medicalRecord.findUnique.mockResolvedValue({ ...mockRecord, organizationId: ORG_B });
    await expect(service.getRecord(RECORD_ID, orgAUser)).rejects.toThrow(ForbiddenException);
  });

  it('admin Walletz pode acessar prontuário de qualquer organização', async () => {
    mockPrisma.patient.findFirst.mockResolvedValue({ id: PATIENT_ID });
    mockPrisma.medicalRecord.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(mockRecord);
    mockPrisma.medicalRecord.create.mockResolvedValue(mockRecord);
    const result = await service.getOrCreate(PATIENT_ID, ORG_A, adminUser);
    expect(result!.id).toBe(RECORD_ID);
  });

  it('retorna prontuário existente sem duplicar', async () => {
    mockPrisma.patient.findFirst.mockResolvedValue({ id: PATIENT_ID });
    mockPrisma.medicalRecord.findUnique.mockResolvedValue(mockRecord);
    const result = await service.getOrCreate(PATIENT_ID, ORG_A, orgAUser);
    expect(result!.id).toBe(RECORD_ID);
    expect(mockPrisma.medicalRecord.create).not.toHaveBeenCalled();
  });
});

describe('ClinicalEntriesService', () => {
  let service: ClinicalEntriesService;

  beforeEach(async () => {
    const recordsService = {
      writeAudit: jest.fn().mockResolvedValue(undefined),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClinicalEntriesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MedicalRecordsService, useValue: recordsService },
      ],
    }).compile();
    service = module.get<ClinicalEntriesService>(ClinicalEntriesService);
    jest.resetAllMocks();
    mockPrisma.pepAuditLog.create.mockResolvedValue({});
  });

  it('deve negar criação de entrada para organização sem acesso', async () => {
    await expect(
      service.create({ recordId: RECORD_ID, organizationId: ORG_A, unitId: 'u1' }, orgBUser),
    ).rejects.toThrow(ForbiddenException);
  });

  it('deve negar edição de entrada assinada', async () => {
    mockPrisma.clinicalEntry.findUnique.mockResolvedValue(mockEntry(EntryStatus.ASSINADO));
    await expect(service.update(ENTRY_ID, { rowVersion: 0 }, orgAUser)).rejects.toThrow(ForbiddenException);
  });

  it('deve negar adendo em rascunho', async () => {
    mockPrisma.clinicalEntry.findUnique.mockResolvedValue(mockEntry(EntryStatus.RASCUNHO));
    await expect(
      service.createAddendum(ENTRY_ID, { content: 'x', reason: 'y' }, orgAUser),
    ).rejects.toThrow(BadRequestException);
  });

  it('deve detectar conflito de rowVersion', async () => {
    mockPrisma.clinicalEntry.findUnique.mockResolvedValue(mockEntry(EntryStatus.RASCUNHO, 3));
    await expect(service.update(ENTRY_ID, { rowVersion: 0 }, orgAUser)).rejects.toThrow(ConflictException);
  });

  it('deve permitir adendo em entrada assinada', async () => {
    mockPrisma.clinicalEntry.findUnique.mockResolvedValue(mockEntry(EntryStatus.ASSINADO));
    mockPrisma.clinicalEntryAddendum.create.mockResolvedValue({ id: 'add-1', entryId: ENTRY_ID });
    const result = await service.createAddendum(ENTRY_ID, { content: 'correção', reason: 'erro digitação' }, orgAUser);
    expect(result.id).toBe('add-1');
  });

  it('deve criar entrada com SOAP e vinculação ao prontuário', async () => {
    mockPrisma.medicalRecord.findUnique.mockResolvedValue(mockRecord);
    mockPrisma.clinicalEntry.create.mockResolvedValue({
      id: ENTRY_ID, status: EntryStatus.RASCUNHO, recordId: RECORD_ID,
      vitalSigns: null, signature: null, addenda: [],
    });
    const result = await service.create(
      { recordId: RECORD_ID, organizationId: ORG_A, unitId: 'u1', subjective: 'dor de cabeça' },
      orgAUser,
    );
    expect(result.status).toBe(EntryStatus.RASCUNHO);
  });
});

describe('SignatureService', () => {
  let service: SignatureService;

  beforeEach(async () => {
    const recordsService = { writeAudit: jest.fn().mockResolvedValue(undefined) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SignatureService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MedicalRecordsService, useValue: recordsService },
      ],
    }).compile();
    service = module.get<SignatureService>(SignatureService);
    jest.resetAllMocks();
  });

  it('deve assinar entrada aguardando assinatura com status DEMO', async () => {
    mockPrisma.clinicalEntry.findUnique.mockResolvedValue(mockEntry(EntryStatus.AGUARDANDO_ASSINATURA));
    mockPrisma.$transaction.mockImplementation((fn: any) => fn(mockPrisma));
    mockPrisma.clinicalEntrySignature.upsert.mockResolvedValue({});
    mockPrisma.clinicalEntry.update.mockResolvedValue({ status: EntryStatus.ASSINADO });

    const result = await service.sign(ENTRY_ID, 'CRM/SP 12345', orgAUser);
    expect(result.signatureStatus).toBe(SignatureStatus.DEMO);
    expect(result.warning).toContain('[DEMONSTRAÇÃO]');
  });

  it('deve rejeitar assinatura de entrada já cancelada', async () => {
    mockPrisma.clinicalEntry.findUnique.mockResolvedValue(mockEntry(EntryStatus.CANCELADO));
    await expect(service.sign(ENTRY_ID, undefined, orgAUser)).rejects.toThrow(BadRequestException);
  });

  it('deve negar assinatura por usuário de outra organização', async () => {
    mockPrisma.clinicalEntry.findUnique.mockResolvedValue(mockEntry(EntryStatus.AGUARDANDO_ASSINATURA));
    await expect(service.sign(ENTRY_ID, undefined, orgBUser)).rejects.toThrow(ForbiddenException);
  });
});
