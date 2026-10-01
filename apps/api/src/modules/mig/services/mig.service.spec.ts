import { Test, TestingModule } from '@nestjs/testing';
import { MigService } from './mig.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { MigJobStatus, MigTicketStatus, MigTicketPriority } from '@prisma/client';

const orgUser = { sub: 'user-1', email: 'u@t.com', isWalletzAdmin: false, organizationIds: ['org-1'], tenantIds: [] };
const outsider = { sub: 'out-1', email: 'o@t.com', isWalletzAdmin: false, organizationIds: ['org-2'], tenantIds: [] };

let mockPrisma: any;

describe('MigService', () => {
  let service: MigService;

  beforeEach(async () => {
    mockPrisma = {
      migJob: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn(), count: jest.fn() },
      migHealthScore: { upsert: jest.fn(), findMany: jest.fn(), count: jest.fn() },
      migTicket: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn(), count: jest.fn() },
      migAccessGrant: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn(), count: jest.fn() },
      migOnboardingConfig: { upsert: jest.fn() },
      $transaction: jest.fn((fn: any) => (Array.isArray(fn) ? Promise.all(fn) : fn(mockPrisma))),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [MigService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<MigService>(MigService);
  });

  afterEach(() => { jest.resetAllMocks(); });

  // Segurança
  it('rejects outsider listing jobs', async () => {
    await expect(service.listJobs('org-1', outsider)).rejects.toThrow(ForbiddenException);
  });

  // Jobs de migração (RF-MIG-001 a 005)
  it('creates migration job in RASCUNHO', async () => {
    mockPrisma.migJob.create.mockResolvedValue({ id: 'j1', status: MigJobStatus.RASCUNHO });
    const result = await service.createJob('org-1', orgUser, { name: 'Pacientes CSV', sourceFormat: 'CSV', targetModule: 'PAC' });
    expect(result.status).toBe(MigJobStatus.RASCUNHO);
  });

  it('validates job with counts and hash', async () => {
    mockPrisma.migJob.findFirst.mockResolvedValue({ id: 'j1', status: MigJobStatus.RASCUNHO });
    mockPrisma.migJob.update.mockResolvedValue({ id: 'j1', status: MigJobStatus.VALIDADO, totalRows: 100, validRows: 95 });
    const result = await service.validateJob('org-1', orgUser, 'j1', { totalRows: 100, validRows: 95, rejectedRows: 5, duplicateRows: 0, inputHash: 'abc123' });
    expect(result.status).toBe(MigJobStatus.VALIDADO);
  });

  it('blocks validating already approved job', async () => {
    mockPrisma.migJob.findFirst.mockResolvedValue({ id: 'j1', status: MigJobStatus.APROVADO });
    await expect(service.validateJob('org-1', orgUser, 'j1', { totalRows: 10, validRows: 10, rejectedRows: 0, duplicateRows: 0, inputHash: 'x' })).rejects.toThrow(BadRequestException);
  });

  it('approves validated job', async () => {
    mockPrisma.migJob.findFirst.mockResolvedValue({ id: 'j1', status: MigJobStatus.VALIDADO });
    mockPrisma.migJob.update.mockResolvedValue({ id: 'j1', status: MigJobStatus.APROVADO, approvedBy: 'user-1' });
    await service.approveJob('org-1', orgUser, 'j1');
    expect(mockPrisma.migJob.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: MigJobStatus.APROVADO, approvedBy: 'user-1' }) }),
    );
  });

  it('blocks executing non-approved job', async () => {
    mockPrisma.migJob.findFirst.mockResolvedValue({ id: 'j1', status: MigJobStatus.VALIDADO });
    await expect(service.executeJob('org-1', orgUser, 'j1')).rejects.toThrow(BadRequestException);
  });

  it('executes approved job and enables rollback', async () => {
    mockPrisma.migJob.findFirst.mockResolvedValue({ id: 'j1', status: MigJobStatus.APROVADO });
    mockPrisma.migJob.update.mockResolvedValue({ id: 'j1', status: MigJobStatus.EXECUTANDO, rollbackAvailable: true });
    const result = await service.executeJob('org-1', orgUser, 'j1');
    expect(result.rollbackAvailable).toBe(true);
  });

  it('rollbacks job when available', async () => {
    mockPrisma.migJob.findFirst.mockResolvedValue({ id: 'j1', status: MigJobStatus.EXECUTANDO, rollbackAvailable: true });
    mockPrisma.migJob.update.mockResolvedValue({ id: 'j1', status: MigJobStatus.REVERTIDO });
    await service.rollbackJob('org-1', orgUser, 'j1', {});
    expect(mockPrisma.migJob.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: MigJobStatus.REVERTIDO }) }),
    );
  });

  it('blocks rollback when not available', async () => {
    mockPrisma.migJob.findFirst.mockResolvedValue({ id: 'j1', status: MigJobStatus.EXECUTANDO, rollbackAvailable: false });
    await expect(service.rollbackJob('org-1', orgUser, 'j1', {})).rejects.toThrow(BadRequestException);
  });

  it('formal accept completes job', async () => {
    mockPrisma.migJob.findFirst.mockResolvedValue({ id: 'j1', status: MigJobStatus.EXECUTANDO });
    mockPrisma.migJob.update.mockResolvedValue({ id: 'j1', status: MigJobStatus.CONCLUIDO });
    await service.formalAccept('org-1', orgUser, 'j1');
    expect(mockPrisma.migJob.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: MigJobStatus.CONCLUIDO }) }),
    );
  });

  // Health Score (RF-MIG-008)
  it('records health score with formula', async () => {
    mockPrisma.migHealthScore.upsert.mockResolvedValue({ id: 'hs1', overallScore: 75 });
    const result = await service.recordHealthScore('org-1', orgUser, {
      scoreDate: new Date('2026-10-02'),
      implantationScore: 80, adoptionScore: 70, securityScore: 75, operationScore: 75,
      criteria: { implantation: ['Migração concluída'] },
    });
    expect(result.overallScore).toBe(75);
  });

  // Tickets (RF-MIG-009)
  it('creates support ticket', async () => {
    mockPrisma.migTicket.create.mockResolvedValue({ id: 't1', status: MigTicketStatus.ABERTO, priority: MigTicketPriority.ALTA });
    const result = await service.createTicket('org-1', orgUser, { title: 'Erro na migração', description: 'Detalhe', priority: MigTicketPriority.ALTA });
    expect(result.id).toBe('t1');
  });

  it('closes ticket once', async () => {
    mockPrisma.migTicket.findFirst.mockResolvedValue({ id: 't1', status: MigTicketStatus.EM_ATENDIMENTO });
    mockPrisma.migTicket.update.mockResolvedValue({ id: 't1', status: MigTicketStatus.FECHADO });
    await service.updateTicketStatus('org-1', orgUser, 't1', { status: MigTicketStatus.FECHADO });
    expect(mockPrisma.migTicket.update).toHaveBeenCalled();
  });

  it('blocks updating closed ticket', async () => {
    mockPrisma.migTicket.findFirst.mockResolvedValue({ id: 't1', status: MigTicketStatus.FECHADO });
    await expect(service.updateTicketStatus('org-1', orgUser, 't1', { status: MigTicketStatus.EM_ATENDIMENTO })).rejects.toThrow(BadRequestException);
  });

  // Acesso temporário (RF-MIG-010)
  it('grants temporary access with expiry in future', async () => {
    const future = new Date(Date.now() + 3600000);
    mockPrisma.migAccessGrant.create.mockResolvedValue({ id: 'ag1', grantedTo: 'suporte@walletz.com', maskingEnabled: true });
    const result = await service.grantTemporaryAccess('org-1', orgUser, { grantedTo: 'suporte@walletz.com', scope: 'read', reason: 'Debug', expiresAt: future });
    expect(result.maskingEnabled).toBe(true);
  });

  it('blocks granting access with past expiry', async () => {
    const past = new Date(Date.now() - 1000);
    await expect(service.grantTemporaryAccess('org-1', orgUser, { grantedTo: 'x', scope: 'read', reason: 'y', expiresAt: past })).rejects.toThrow(BadRequestException);
  });

  it('revokes access and adds audit entry', async () => {
    mockPrisma.migAccessGrant.findFirst.mockResolvedValue({ id: 'ag1', revokedAt: null, auditLog: [] });
    mockPrisma.migAccessGrant.update.mockResolvedValue({ id: 'ag1', revokedAt: new Date() });
    await service.revokeAccess('org-1', orgUser, 'ag1');
    expect(mockPrisma.migAccessGrant.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ revokedBy: 'user-1' }) }),
    );
  });

  it('blocks revoking already revoked access', async () => {
    mockPrisma.migAccessGrant.findFirst.mockResolvedValue({ id: 'ag1', revokedAt: new Date() });
    await expect(service.revokeAccess('org-1', orgUser, 'ag1')).rejects.toThrow(BadRequestException);
  });

  // Dashboard
  it('returns mig dashboard', async () => {
    mockPrisma.migJob.count.mockResolvedValueOnce(5).mockResolvedValueOnce(2);
    mockPrisma.migTicket.count.mockResolvedValueOnce(3).mockResolvedValueOnce(1);
    mockPrisma.migAccessGrant.count.mockResolvedValue(2);
    const result = await service.getDashboard('org-1', orgUser);
    expect(result).toHaveProperty('totalJobs', 5);
    expect(result).toHaveProperty('criticalTickets', 1);
    expect(result).toHaveProperty('activeGrants', 2);
  });
});
