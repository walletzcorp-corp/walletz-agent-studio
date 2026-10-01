import { Test, TestingModule } from '@nestjs/testing';
import { PatientsService } from './patients.service';
import { PatientsConsentsService } from './patients-consents.service';
import { PatientsLinksService } from './patients-links.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ForbiddenException, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

const mockPrisma: any = {
  patient: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
  },
  patientConsent: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  patientLink: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  patientAuditLog: {
    create: jest.fn(),
  },
  $transaction: jest.fn(),
};

const adminUser: any = {
  sub: 'admin-sub',
  email: 'admin@dev.local',
  name: 'Admin',
  isWalletzAdmin: true,
  organizationIds: [],
  tenantIds: [],
};

const orgUser: any = {
  sub: 'user-sub',
  email: 'user@org1.local',
  name: 'User',
  isWalletzAdmin: false,
  organizationIds: ['org1'],
  tenantIds: ['org1'],
};

describe('PatientsService', () => {
  let service: PatientsService;

  beforeEach(async () => {
    jest.resetAllMocks();
    mockPrisma.$transaction.mockImplementation((arg: any) =>
      Array.isArray(arg) ? Promise.all(arg) : arg(mockPrisma),
    );
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<PatientsService>(PatientsService);
  });

  // ─── Tenant isolation ────────────────────────────────────────────────────

  it('blocks access when organizationId not in JWT claims', async () => {
    await expect(
      service.findAll({ organizationId: 'org-other' }, orgUser),
    ).rejects.toThrow(ForbiddenException);
  });

  it('admin user can access any org', async () => {
    mockPrisma.patient.findMany.mockResolvedValueOnce([]);
    mockPrisma.patient.count.mockResolvedValueOnce(0);
    const res = await service.findAll({ organizationId: 'any-org' }, adminUser);
    expect(res.data).toEqual([]);
  });

  // ─── CPF/CNS duplicity detection ─────────────────────────────────────────

  it('returns candidates when CPF matches existing patient', async () => {
    const existing = { id: 'p1', name: 'João', cpf: '00000000000', dataNasc: null, telefone: null, deactivatedAt: null };
    mockPrisma.patient.findMany.mockResolvedValueOnce([existing]); // CPF search
    mockPrisma.patient.findMany.mockResolvedValueOnce([]); // CNS search skipped
    mockPrisma.patient.findMany.mockResolvedValueOnce([]); // phone
    const candidates = await service.checkDuplicity(
      { organizationId: 'org1', cpf: '000.000.000-00' },
      orgUser,
    );
    expect(candidates).toHaveLength(1);
    expect(candidates[0].matchReason).toBe('CPF idêntico');
    expect(candidates[0].score).toBe(100);
  });

  it('deduplicates when same patient matches by CPF and name+date', async () => {
    const p = { id: 'p1', name: 'Maria', cpf: '11111111111', dataNasc: new Date('1990-01-01'), telefone: null, deactivatedAt: null };
    mockPrisma.patient.findMany
      .mockResolvedValueOnce([p])   // CPF
      .mockResolvedValueOnce([])    // CNS (skipped, no cns provided)
      .mockResolvedValueOnce([p])   // name+date
      .mockResolvedValueOnce([]);   // phone
    const candidates = await service.checkDuplicity(
      { organizationId: 'org1', cpf: '111.111.111-11', name: 'Maria', dataNasc: '1990-01-01' },
      orgUser,
    );
    expect(candidates).toHaveLength(1);
  });

  // ─── Create patient ──────────────────────────────────────────────────────

  it('rejects create when CPF already exists in same org', async () => {
    mockPrisma.patient.findFirst.mockResolvedValueOnce({ id: 'existing' });
    await expect(
      service.create({ organizationId: 'org1', name: 'Ana', cpf: '111.111.111-11' }, orgUser),
    ).rejects.toThrow(ConflictException);
  });

  it('creates patient without CPF', async () => {
    mockPrisma.patient.create.mockResolvedValueOnce({ id: 'new-id', name: 'Carlos', organizationId: 'org1' });
    mockPrisma.patientAuditLog.create.mockResolvedValueOnce({});
    const result = await service.create({ organizationId: 'org1', name: 'Carlos' }, orgUser);
    expect(result.id).toBe('new-id');
  });

  // ─── Optimistic locking ──────────────────────────────────────────────────

  it('rejects update when rowVersion does not match', async () => {
    mockPrisma.patient.findUnique.mockResolvedValueOnce({ id: 'p1', organizationId: 'org1', rowVersion: 2, cpf: null, cns: null });
    await expect(
      service.update('p1', { rowVersion: 1, name: 'New Name' }, orgUser),
    ).rejects.toThrow(ConflictException);
  });

  // ─── Minor-without-guardian is handled in LinksService ───────────────────

  it('findOne throws NotFoundException for unknown patient', async () => {
    mockPrisma.patient.findUnique.mockResolvedValueOnce(null);
    await expect(service.findOne('unknown', adminUser)).rejects.toThrow(NotFoundException);
  });
});

describe('PatientsConsentsService', () => {
  let service: PatientsConsentsService;

  beforeEach(async () => {
    jest.resetAllMocks();
    mockPrisma.$transaction.mockImplementation((arg: any) =>
      Array.isArray(arg) ? Promise.all(arg) : arg(mockPrisma),
    );
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientsConsentsService,
        PatientsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<PatientsConsentsService>(PatientsConsentsService);
  });

  it('creates a consent and records audit', async () => {
    mockPrisma.patient.findFirst.mockResolvedValueOnce({ id: 'p1', organizationId: 'org1' });
    mockPrisma.patientConsent.create.mockResolvedValueOnce({ id: 'c1', type: 'LGPD_TRATAMENTO', status: 'VIGENTE' });
    mockPrisma.patientAuditLog.create.mockResolvedValueOnce({});
    const result = await service.create('p1', 'org1', { type: 'LGPD_TRATAMENTO', channel: 'PRESENCIAL', version: '1.0' }, orgUser);
    expect(result.status).toBe('VIGENTE');
  });

  it('revoke requires reason', async () => {
    mockPrisma.patientConsent.findFirst.mockResolvedValueOnce({ id: 'c1', status: 'VIGENTE', patientId: 'p1', organizationId: 'org1' });
    await expect(
      service.revoke('c1', 'org1', { reason: '' }, orgUser),
    ).rejects.toThrow(BadRequestException);
  });

  it('cannot revoke already-revoked consent', async () => {
    mockPrisma.patientConsent.findFirst.mockResolvedValueOnce({ id: 'c1', status: 'REVOGADO', patientId: 'p1', organizationId: 'org1' });
    await expect(
      service.revoke('c1', 'org1', { reason: 'Teste' }, orgUser),
    ).rejects.toThrow(BadRequestException);
  });

  it('marketing block returns blocked:true when patient has marketingBlocked=true', async () => {
    mockPrisma.patient.findFirst.mockResolvedValueOnce({ marketingBlocked: true });
    const result = await service.checkMarketingBlock('p1', 'org1', orgUser);
    expect(result.blocked).toBe(true);
  });

  it('marketing block returns blocked:false when no block', async () => {
    mockPrisma.patient.findFirst.mockResolvedValueOnce({ marketingBlocked: false });
    mockPrisma.patientConsent.findFirst.mockResolvedValueOnce(null);
    const result = await service.checkMarketingBlock('p1', 'org1', orgUser);
    expect(result.blocked).toBe(false);
  });
});

describe('PatientsLinksService', () => {
  let service: PatientsLinksService;

  beforeEach(async () => {
    jest.resetAllMocks();
    mockPrisma.$transaction.mockImplementation((arg: any) =>
      Array.isArray(arg) ? Promise.all(arg) : arg(mockPrisma),
    );
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientsLinksService,
        PatientsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<PatientsLinksService>(PatientsLinksService);
  });

  it('rejects link where guardianId === dependentId', async () => {
    await expect(
      service.create('org1', { guardianId: 'same', dependentId: 'same', linkType: 'PAI' }, orgUser),
    ).rejects.toThrow(BadRequestException);
  });

  it('requires legal link type for minor dependent', async () => {
    mockPrisma.patient.findFirst
      .mockResolvedValueOnce({ id: 'guardian', organizationId: 'org1' })  // guardian check
      .mockResolvedValueOnce({ dataNasc: new Date('2015-01-01'), name: 'Minor' }); // dependent check (minor)
    await expect(
      service.create('org1', { guardianId: 'guardian', dependentId: 'minor', linkType: 'ACOMPANHANTE' }, orgUser),
    ).rejects.toThrow(BadRequestException);
  });

  it('allows legal link type for minor dependent', async () => {
    mockPrisma.patient.findFirst
      .mockResolvedValueOnce({ id: 'guardian', organizationId: 'org1' })
      .mockResolvedValueOnce({ dataNasc: new Date('2015-01-01'), name: 'Minor' });
    mockPrisma.patientLink.create.mockResolvedValueOnce({ id: 'link1', linkType: 'PAI' });
    mockPrisma.patientAuditLog.create.mockResolvedValueOnce({});
    const result = await service.create('org1', { guardianId: 'guardian', dependentId: 'minor', linkType: 'PAI' }, orgUser);
    expect(result.linkType).toBe('PAI');
  });

  it('org isolation: user cannot create link in org they do not belong to', async () => {
    await expect(
      service.create('other-org', { guardianId: 'g', dependentId: 'd', linkType: 'PAI' }, orgUser),
    ).rejects.toThrow(ForbiddenException);
  });
});
