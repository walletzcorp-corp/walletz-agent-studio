import { Test, TestingModule } from '@nestjs/testing';
import { QuaService } from './qua.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { QualityIncidentStatus, QualityIncidentType, QualityActionStatus, QualityProtocolStatus } from '@prisma/client';

const orgUser = { sub: 'user-1', email: 'user@test.com', isWalletzAdmin: false, organizationIds: ['org-1'], tenantIds: [] };
const outsider = { sub: 'out-1', email: 'out@test.com', isWalletzAdmin: false, organizationIds: ['org-2'], tenantIds: [] };

let mockPrisma: any;

describe('QuaService', () => {
  let service: QuaService;

  beforeEach(async () => {
    mockPrisma = {
      qualityIncident: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        groupBy: jest.fn(),
      },
      qualityIncidentAddendum: {
        create: jest.fn(),
      },
      qualityActionPlan: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      qualityProtocol: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      qualityIndicator: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      qualityIndicatorMeasurement: {
        create: jest.fn(),
      },
      $transaction: jest.fn((fn: any) => (Array.isArray(fn) ? Promise.all(fn) : fn(mockPrisma))),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [QuaService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<QuaService>(QuaService);
  });

  afterEach(() => { jest.resetAllMocks(); });

  // Segurança
  it('rejects outsider reporting incident', async () => {
    await expect(
      service.reportIncident('org-1', outsider, {
        incidentType: QualityIncidentType.QUASE_FALHA, title: 'T', description: 'D', occurredAt: new Date(),
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  // Incidentes
  it('creates incident', async () => {
    mockPrisma.qualityIncident.create.mockResolvedValue({ id: 'qi-1', isAnonymous: false, reportedBy: 'user-1' });
    const result = await service.reportIncident('org-1', orgUser, {
      incidentType: QualityIncidentType.QUASE_FALHA, title: 'Queda', description: 'Paciente quase caiu', occurredAt: new Date(),
    });
    expect(result.reportedBy).toBe('user-1');
  });

  it('creates anonymous incident without reportedBy', async () => {
    mockPrisma.qualityIncident.create.mockResolvedValue({ id: 'qi-1', isAnonymous: true, reportedBy: null });
    const result = await service.reportIncident('org-1', orgUser, {
      incidentType: QualityIncidentType.INCIDENTE_SEM_DANO, title: 'Anon', description: 'D',
      occurredAt: new Date(), isAnonymous: true,
    });
    expect(result.reportedBy).toBeNull();
  });

  it('lists incidents with filters', async () => {
    mockPrisma.qualityIncident.findMany.mockResolvedValue([]);
    await service.listIncidents('org-1', orgUser, { status: QualityIncidentStatus.ABERTO });
    expect(mockPrisma.qualityIncident.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: QualityIncidentStatus.ABERTO }) }),
    );
  });

  // Adendo
  it('adds addendum to incident', async () => {
    mockPrisma.qualityIncident.findFirst.mockResolvedValue({ id: 'qi-1', status: QualityIncidentStatus.ABERTO });
    mockPrisma.qualityIncidentAddendum.create.mockResolvedValue({ id: 'add-1' });
    const result = await service.addAddendum('org-1', orgUser, 'qi-1', { content: 'Nota adicional' });
    expect(result.id).toBe('add-1');
  });

  it('blocks addendum on closed incident', async () => {
    mockPrisma.qualityIncident.findFirst.mockResolvedValue({ id: 'qi-1', status: QualityIncidentStatus.ENCERRADO });
    await expect(service.addAddendum('org-1', orgUser, 'qi-1', { content: 'X' })).rejects.toThrow(BadRequestException);
  });

  // Análise
  it('starts analysis and sets EM_ANALISE', async () => {
    mockPrisma.qualityIncident.findFirst.mockResolvedValue({ id: 'qi-1', status: QualityIncidentStatus.ABERTO });
    mockPrisma.qualityIncident.update.mockResolvedValue({ id: 'qi-1', status: QualityIncidentStatus.EM_ANALISE });
    await service.startAnalysis('org-1', orgUser, 'qi-1', { rootCause: 'Falta de protocolo' });
    expect(mockPrisma.qualityIncident.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: QualityIncidentStatus.EM_ANALISE }) }),
    );
  });

  it('blocks analysis of already-closed incident', async () => {
    mockPrisma.qualityIncident.findFirst.mockResolvedValue({ id: 'qi-1', status: QualityIncidentStatus.ENCERRADO });
    await expect(service.startAnalysis('org-1', orgUser, 'qi-1', {})).rejects.toThrow(BadRequestException);
  });

  // Planos de ação
  it('creates action plan and advances incident to EM_ACAO', async () => {
    mockPrisma.qualityIncident.findFirst.mockResolvedValue({ id: 'qi-1', status: QualityIncidentStatus.EM_ANALISE });
    mockPrisma.qualityIncident.update.mockResolvedValue({});
    mockPrisma.qualityActionPlan.create.mockResolvedValue({ id: 'ap-1' });
    const result = await service.createActionPlan('org-1', orgUser, {
      incidentId: 'qi-1', title: 'Treinar equipe', description: 'D', responsibleId: 'prof-1', dueDate: new Date(),
    });
    expect(result.id).toBe('ap-1');
    expect(mockPrisma.qualityIncident.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: QualityIncidentStatus.EM_ACAO } }),
    );
  });

  it('updates action plan to CONCLUIDA requires evidence', async () => {
    mockPrisma.qualityActionPlan.findFirst.mockResolvedValue({
      id: 'ap-1', status: QualityActionStatus.EM_ANDAMENTO, evidence: null, startedAt: new Date(), completedAt: null,
    });
    await expect(
      service.updateActionPlan('org-1', orgUser, 'ap-1', { status: QualityActionStatus.CONCLUIDA }),
    ).rejects.toThrow(BadRequestException);
  });

  it('updates action plan to CONCLUIDA with evidence', async () => {
    mockPrisma.qualityActionPlan.findFirst.mockResolvedValue({
      id: 'ap-1', status: QualityActionStatus.EM_ANDAMENTO, evidence: null, startedAt: new Date(), completedAt: null,
    });
    mockPrisma.qualityActionPlan.update.mockResolvedValue({ id: 'ap-1', status: QualityActionStatus.CONCLUIDA });
    await service.updateActionPlan('org-1', orgUser, 'ap-1', { status: QualityActionStatus.CONCLUIDA, evidence: 'Foto treinamento' });
    expect(mockPrisma.qualityActionPlan.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: QualityActionStatus.CONCLUIDA }) }),
    );
  });

  it('verifies action plan only when CONCLUIDA', async () => {
    mockPrisma.qualityActionPlan.findFirst.mockResolvedValue({ id: 'ap-1', status: QualityActionStatus.PENDENTE });
    await expect(service.verifyActionPlan('org-1', orgUser, 'ap-1', { verificationNote: 'OK' })).rejects.toThrow(BadRequestException);
  });

  it('verifies action plan when CONCLUIDA', async () => {
    mockPrisma.qualityActionPlan.findFirst.mockResolvedValue({ id: 'ap-1', status: QualityActionStatus.CONCLUIDA });
    mockPrisma.qualityActionPlan.update.mockResolvedValue({ id: 'ap-1', status: QualityActionStatus.VERIFICADA });
    await service.verifyActionPlan('org-1', orgUser, 'ap-1', { verificationNote: 'Efetivo' });
    expect(mockPrisma.qualityActionPlan.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: QualityActionStatus.VERIFICADA }) }),
    );
  });

  // Encerramento
  it('closes incident', async () => {
    mockPrisma.qualityIncident.findFirst.mockResolvedValue({ id: 'qi-1', status: QualityIncidentStatus.EM_ACAO, notes: null });
    mockPrisma.qualityIncident.update.mockResolvedValue({ id: 'qi-1', status: QualityIncidentStatus.ENCERRADO });
    await service.closeIncident('org-1', orgUser, 'qi-1', {});
    expect(mockPrisma.qualityIncident.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: QualityIncidentStatus.ENCERRADO }) }),
    );
  });

  it('throws BadRequest closing already-closed incident', async () => {
    mockPrisma.qualityIncident.findFirst.mockResolvedValue({ id: 'qi-1', status: QualityIncidentStatus.ENCERRADO });
    await expect(service.closeIncident('org-1', orgUser, 'qi-1', {})).rejects.toThrow(BadRequestException);
  });

  // Notificação regulatória — não envia automaticamente
  it('marks incident for regulatory notification without sending', async () => {
    mockPrisma.qualityIncident.findFirst.mockResolvedValue({ id: 'qi-1', status: QualityIncidentStatus.EM_ACAO, notifyRegulatory: false });
    mockPrisma.qualityIncident.update.mockResolvedValue({ notifyRegulatory: true });
    const result = await service.prepareRegulatoryNotification('org-1', orgUser, 'qi-1');
    expect(result.notifyRegulatory).toBe(true);
  });

  it('confirms regulatory notification', async () => {
    mockPrisma.qualityIncident.findFirst.mockResolvedValue({ id: 'qi-1', notifyRegulatory: true });
    mockPrisma.qualityIncident.update.mockResolvedValue({ regulatoryNotifiedBy: 'user-1' });
    await service.confirmRegulatoryNotification('org-1', orgUser, 'qi-1');
    expect(mockPrisma.qualityIncident.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ regulatoryNotifiedBy: 'user-1' }) }),
    );
  });

  it('blocks confirming notification not marked', async () => {
    mockPrisma.qualityIncident.findFirst.mockResolvedValue({ id: 'qi-1', notifyRegulatory: false });
    await expect(service.confirmRegulatoryNotification('org-1', orgUser, 'qi-1')).rejects.toThrow(BadRequestException);
  });

  // Protocolos
  it('publishes protocol', async () => {
    mockPrisma.qualityProtocol.findFirst.mockResolvedValue({ id: 'pr-1' });
    mockPrisma.qualityProtocol.update.mockResolvedValue({ id: 'pr-1', status: QualityProtocolStatus.VIGENTE });
    await service.publishProtocol('org-1', orgUser, 'pr-1');
    expect(mockPrisma.qualityProtocol.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: QualityProtocolStatus.VIGENTE }) }),
    );
  });

  // Dashboard
  it('returns dashboard', async () => {
    mockPrisma.qualityIncident.groupBy.mockResolvedValue([]);
    mockPrisma.qualityActionPlan.count.mockResolvedValue(3);
    const result = await service.getDashboard('org-1', orgUser);
    expect(result).toHaveProperty('openActions', 3);
  });
});
