import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { CrmService } from './crm.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

let mockPrisma: any;

const orgUser = {
  sub: 'u-1', email: 'user@test.com', name: 'User',
  isWalletzAdmin: false, organizationIds: ['org-1'], tenantIds: [],
};
const adminUser = {
  sub: 'admin-1', email: 'admin@test.com',
  isWalletzAdmin: true, organizationIds: [], tenantIds: [],
};
const outsideUser = {
  sub: 'u-2', email: 'other@test.com',
  isWalletzAdmin: false, organizationIds: ['org-2'], tenantIds: [],
};

describe('CrmService', () => {
  let service: CrmService;

  beforeEach(async () => {
    mockPrisma = {
      crmFunnel: { findMany: jest.fn(), create: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn() },
      crmFunnelStage: { create: jest.fn(), findFirst: jest.fn() },
      crmLead: { findMany: jest.fn(), create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
      crmOpportunity: { findMany: jest.fn(), create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
      crmActivity: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
      crmProposal: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
      crmTemplate: { findMany: jest.fn(), create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
      crmTicket: { findMany: jest.fn(), create: jest.fn(), findFirst: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
      crmTicketMessage: { create: jest.fn() },
      patient: { findFirst: jest.fn() },
      $transaction: jest.fn((fn: any) => (Array.isArray(fn) ? Promise.all(fn) : fn(mockPrisma))),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [CrmService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<CrmService>(CrmService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // ── Isolamento multi-tenant ────────────────────────────────────────────────

  it('listFunnels — rejeita acesso externo', async () => {
    await expect(service.listFunnels('org-1', outsideUser)).rejects.toThrow(ForbiddenException);
  });

  it('listFunnels — admin acessa qualquer org', async () => {
    mockPrisma.crmFunnel.findMany.mockResolvedValue([]);
    await expect(service.listFunnels('org-x', adminUser)).resolves.toEqual([]);
  });

  // ── Funis ──────────────────────────────────────────────────────────────────

  it('createFunnel — cria funil com etapas em transação', async () => {
    const funnel = { id: 'f-1', name: 'Vendas' };
    mockPrisma.crmFunnel.create.mockResolvedValue(funnel);
    mockPrisma.crmFunnelStage.create.mockResolvedValue({});
    mockPrisma.crmFunnel.findUnique.mockResolvedValue({ ...funnel, stages: [] });
    const result = await service.createFunnel('org-1', {
      name: 'Vendas',
      stages: [
        { name: 'Contato', position: 1, probability: 20 },
        { name: 'Proposta', position: 2, probability: 60 },
        { name: 'Ganho', position: 3, isWon: true },
      ],
    }, orgUser);
    expect(mockPrisma.crmFunnelStage.create).toHaveBeenCalledTimes(3);
    expect(result).toBeTruthy();
  });

  // ── Leads ──────────────────────────────────────────────────────────────────

  it('createLead — cria lead com consentimento', async () => {
    const lead = { id: 'l-1', name: 'João Silva', consentGiven: true, status: 'NOVO' };
    mockPrisma.crmLead.create.mockResolvedValue(lead);
    const result = await service.createLead('org-1', {
      name: 'João Silva', email: 'joao@test.com', phone: '11999999999',
      source: 'SITE', consentGiven: true, consentChannel: 'WEB',
    }, orgUser);
    expect(result.consentGiven).toBe(true);
    expect(mockPrisma.crmLead.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ organizationId: 'org-1', consentGiven: true }),
      }),
    );
  });

  it('getLead — 404 se não encontrado', async () => {
    mockPrisma.crmLead.findFirst.mockResolvedValue(null);
    await expect(service.getLead('l-x', 'org-1', orgUser)).rejects.toThrow(NotFoundException);
  });

  it('getLead — retorna lead com oportunidades e atividades', async () => {
    const lead = { id: 'l-1', name: 'Maria', opportunities: [], activities: [] };
    mockPrisma.crmLead.findFirst.mockResolvedValue(lead);
    const result = await service.getLead('l-1', 'org-1', orgUser);
    expect(result.opportunities).toEqual([]);
  });

  it('convertLead — 400 se já convertido', async () => {
    mockPrisma.crmLead.findFirst.mockResolvedValue({ id: 'l-1', status: 'CONVERTIDO' });
    await expect(service.convertLead('l-1', 'org-1', { patientId: 'p-1' }, orgUser)).rejects.toThrow(BadRequestException);
  });

  it('convertLead — 404 se paciente não encontrado', async () => {
    mockPrisma.crmLead.findFirst.mockResolvedValue({ id: 'l-1', status: 'NOVO' });
    mockPrisma.patient.findFirst.mockResolvedValue(null);
    await expect(service.convertLead('l-1', 'org-1', { patientId: 'p-x' }, orgUser)).rejects.toThrow(NotFoundException);
  });

  it('convertLead — converte lead para paciente', async () => {
    mockPrisma.crmLead.findFirst.mockResolvedValue({ id: 'l-1', status: 'NOVO' });
    mockPrisma.patient.findFirst.mockResolvedValue({ id: 'p-1' });
    mockPrisma.crmLead.update.mockResolvedValue({ id: 'l-1', status: 'CONVERTIDO', convertedToPatientId: 'p-1' });
    const result = await service.convertLead('l-1', 'org-1', { patientId: 'p-1' }, orgUser);
    expect(result.status).toBe('CONVERTIDO');
    expect(result.convertedToPatientId).toBe('p-1');
  });

  // ── Oportunidades ──────────────────────────────────────────────────────────

  it('createOpportunity — 404 se funil não encontrado', async () => {
    mockPrisma.crmFunnel.findFirst.mockResolvedValue(null);
    await expect(service.createOpportunity('org-1', {
      funnelId: 'f-x', stageId: 's-1', title: 'Negócio',
    }, orgUser)).rejects.toThrow(NotFoundException);
  });

  it('createOpportunity — valor monetário é Decimal', async () => {
    mockPrisma.crmFunnel.findFirst.mockResolvedValue({ id: 'f-1' });
    mockPrisma.crmOpportunity.create.mockResolvedValue({ id: 'o-1', value: new Decimal('5000.00') });
    await service.createOpportunity('org-1', {
      funnelId: 'f-1', stageId: 's-1', title: 'Negócio', value: 5000,
    }, orgUser);
    expect(mockPrisma.crmOpportunity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ value: expect.any(Decimal) }),
      }),
    );
  });

  it('moveOpportunity — 404 se oportunidade não encontrada', async () => {
    mockPrisma.crmOpportunity.findFirst.mockResolvedValue(null);
    await expect(service.moveOpportunity('o-x', 'org-1', { stageId: 's-1' }, orgUser)).rejects.toThrow(NotFoundException);
  });

  it('moveOpportunity — 404 se etapa não pertence ao funil', async () => {
    mockPrisma.crmOpportunity.findFirst.mockResolvedValue({ id: 'o-1', funnelId: 'f-1' });
    mockPrisma.crmFunnelStage.findFirst.mockResolvedValue(null);
    await expect(service.moveOpportunity('o-1', 'org-1', { stageId: 's-x' }, orgUser)).rejects.toThrow(NotFoundException);
  });

  it('moveOpportunity — define status GANHA para etapa isWon', async () => {
    mockPrisma.crmOpportunity.findFirst.mockResolvedValue({ id: 'o-1', funnelId: 'f-1' });
    mockPrisma.crmFunnelStage.findFirst.mockResolvedValue({ id: 's-1', isWon: true, isLost: false });
    mockPrisma.crmOpportunity.update.mockResolvedValue({ id: 'o-1', status: 'GANHA' });
    const result = await service.moveOpportunity('o-1', 'org-1', { stageId: 's-1' }, orgUser);
    expect(mockPrisma.crmOpportunity.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'GANHA' }) }),
    );
  });

  it('moveOpportunity — define status PERDIDA para etapa isLost', async () => {
    mockPrisma.crmOpportunity.findFirst.mockResolvedValue({ id: 'o-1', funnelId: 'f-1' });
    mockPrisma.crmFunnelStage.findFirst.mockResolvedValue({ id: 's-2', isWon: false, isLost: true });
    mockPrisma.crmOpportunity.update.mockResolvedValue({ id: 'o-1', status: 'PERDIDA' });
    await service.moveOpportunity('o-1', 'org-1', { stageId: 's-2' }, orgUser);
    expect(mockPrisma.crmOpportunity.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'PERDIDA' }) }),
    );
  });

  // ── Atividades ─────────────────────────────────────────────────────────────

  it('createActivity — cria atividade para lead', async () => {
    mockPrisma.crmActivity.create.mockResolvedValue({ id: 'a-1', type: 'LIGACAO', subject: 'Primeiro contato' });
    const result = await service.createActivity('org-1', {
      leadId: 'l-1', type: 'LIGACAO', subject: 'Primeiro contato',
    }, orgUser);
    expect(result.subject).toBe('Primeiro contato');
  });

  it('completeActivity — 404 se atividade não encontrada', async () => {
    mockPrisma.crmActivity.findFirst.mockResolvedValue(null);
    await expect(service.completeActivity('a-x', 'org-1', orgUser)).rejects.toThrow(NotFoundException);
  });

  it('completeActivity — registra completedAt', async () => {
    mockPrisma.crmActivity.findFirst.mockResolvedValue({ id: 'a-1' });
    mockPrisma.crmActivity.update.mockResolvedValue({ id: 'a-1', completedAt: new Date() });
    const result = await service.completeActivity('a-1', 'org-1', orgUser);
    expect(mockPrisma.crmActivity.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ completedAt: expect.any(Date) }) }),
    );
  });

  // ── Propostas ──────────────────────────────────────────────────────────────

  it('createProposal — 404 se oportunidade não encontrada', async () => {
    mockPrisma.crmOpportunity.findFirst.mockResolvedValue(null);
    await expect(service.createProposal('org-1', {
      opportunityId: 'o-x', title: 'Proposta A', value: 1000,
    }, orgUser)).rejects.toThrow(NotFoundException);
  });

  it('createProposal — valor é Decimal', async () => {
    mockPrisma.crmOpportunity.findFirst.mockResolvedValue({ id: 'o-1' });
    mockPrisma.crmProposal.create.mockResolvedValue({ id: 'pr-1', value: new Decimal('1500.00') });
    await service.createProposal('org-1', { opportunityId: 'o-1', title: 'P1', value: 1500 }, orgUser);
    expect(mockPrisma.crmProposal.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ value: expect.any(Decimal) }) }),
    );
  });

  it('acceptProposal — 400 se já aceita', async () => {
    mockPrisma.crmProposal.findFirst.mockResolvedValue({ id: 'pr-1', status: 'ACEITA' });
    await expect(service.acceptProposal('pr-1', 'org-1', orgUser)).rejects.toThrow(BadRequestException);
  });

  it('acceptProposal — registra acceptedAt e acceptedBy', async () => {
    mockPrisma.crmProposal.findFirst.mockResolvedValue({ id: 'pr-1', status: 'RASCUNHO' });
    mockPrisma.crmProposal.update.mockResolvedValue({ id: 'pr-1', status: 'ACEITA' });
    await service.acceptProposal('pr-1', 'org-1', orgUser);
    expect(mockPrisma.crmProposal.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'ACEITA', acceptedBy: orgUser.sub }),
      }),
    );
  });

  // ── Templates ──────────────────────────────────────────────────────────────

  it('createTemplate — cria template de comunicação', async () => {
    const tmpl = { id: 'tm-1', name: 'Boas-vindas', channel: 'EMAIL', purpose: 'COMERCIAL' };
    mockPrisma.crmTemplate.create.mockResolvedValue(tmpl);
    const result = await service.createTemplate('org-1', {
      name: 'Boas-vindas', channel: 'EMAIL', purpose: 'COMERCIAL', body: 'Olá, seja bem-vindo!',
    }, orgUser);
    expect(result.channel).toBe('EMAIL');
  });

  it('approveTemplate — 404 se template não encontrado', async () => {
    mockPrisma.crmTemplate.findFirst.mockResolvedValue(null);
    await expect(service.approveTemplate('tm-x', 'org-1', orgUser)).rejects.toThrow(NotFoundException);
  });

  it('approveTemplate — registra aprovação', async () => {
    mockPrisma.crmTemplate.findFirst.mockResolvedValue({ id: 'tm-1' });
    mockPrisma.crmTemplate.update.mockResolvedValue({ id: 'tm-1', approved: true });
    await service.approveTemplate('tm-1', 'org-1', orgUser);
    expect(mockPrisma.crmTemplate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ approved: true, approvedBy: orgUser.sub }),
      }),
    );
  });

  // ── Tickets ────────────────────────────────────────────────────────────────

  it('createTicket — cria ticket com primeira mensagem', async () => {
    const ticket = { id: 't-1', subject: 'Dúvida', status: 'ABERTO', messages: [] };
    mockPrisma.crmTicket.create.mockResolvedValue(ticket);
    mockPrisma.crmTicketMessage.create.mockResolvedValue({});
    mockPrisma.crmTicket.findUnique.mockResolvedValue({ ...ticket, messages: [{ id: 'msg-1' }] });
    const result = await service.createTicket('org-1', {
      subject: 'Dúvida sobre agendamento', firstMessage: 'Como faço para reagendar?',
    }, orgUser);
    expect(mockPrisma.crmTicketMessage.create).toHaveBeenCalled();
    expect(result?.messages).toHaveLength(1);
  });

  it('addTicketMessage — 400 se ticket fechado', async () => {
    mockPrisma.crmTicket.findFirst.mockResolvedValue({ id: 't-1', status: 'FECHADO' });
    await expect(service.addTicketMessage('t-1', 'org-1', { body: 'Oi' }, orgUser)).rejects.toThrow(BadRequestException);
  });

  it('addTicketMessage — 404 se ticket não encontrado', async () => {
    mockPrisma.crmTicket.findFirst.mockResolvedValue(null);
    await expect(service.addTicketMessage('t-x', 'org-1', { body: 'Oi' }, orgUser)).rejects.toThrow(NotFoundException);
  });

  it('addTicketMessage — cria mensagem com authorSub', async () => {
    mockPrisma.crmTicket.findFirst.mockResolvedValue({ id: 't-1', status: 'ABERTO' });
    mockPrisma.crmTicketMessage.create.mockResolvedValue({ id: 'msg-1', authorSub: orgUser.sub });
    const result = await service.addTicketMessage('t-1', 'org-1', { body: 'Resposta' }, orgUser);
    expect(mockPrisma.crmTicketMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ authorSub: orgUser.sub }) }),
    );
  });

  it('updateTicketStatus — registra resolvedAt ao resolver', async () => {
    mockPrisma.crmTicket.findFirst.mockResolvedValue({ id: 't-1', status: 'EM_ANDAMENTO' });
    mockPrisma.crmTicket.update.mockResolvedValue({ id: 't-1', status: 'RESOLVIDO' });
    await service.updateTicketStatus('t-1', 'org-1', { status: 'RESOLVIDO' }, orgUser);
    expect(mockPrisma.crmTicket.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'RESOLVIDO', resolvedAt: expect.any(Date) }),
      }),
    );
  });

  it('updateTicketStatus — registra closedAt ao fechar', async () => {
    mockPrisma.crmTicket.findFirst.mockResolvedValue({ id: 't-1', status: 'RESOLVIDO' });
    mockPrisma.crmTicket.update.mockResolvedValue({ id: 't-1', status: 'FECHADO' });
    await service.updateTicketStatus('t-1', 'org-1', { status: 'FECHADO' }, orgUser);
    expect(mockPrisma.crmTicket.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'FECHADO', closedAt: expect.any(Date) }),
      }),
    );
  });

  // ── Métricas ───────────────────────────────────────────────────────────────

  it('getMetrics — calcula taxa de conversão de leads', async () => {
    mockPrisma.crmLead.findMany.mockResolvedValue([
      { id: 'l-1', status: 'NOVO', createdAt: new Date(), updatedAt: new Date() },
      { id: 'l-2', status: 'CONVERTIDO', createdAt: new Date(), updatedAt: new Date() },
      { id: 'l-3', status: 'CONVERTIDO', createdAt: new Date(), updatedAt: new Date() },
      { id: 'l-4', status: 'NOVO', createdAt: new Date(), updatedAt: new Date() },
    ]);
    mockPrisma.crmOpportunity.findMany.mockResolvedValue([
      { id: 'o-1', status: 'GANHA', value: new Decimal('2000.00'), createdAt: new Date(), updatedAt: new Date() },
    ]);
    mockPrisma.crmTicket.findMany.mockResolvedValue([
      { id: 't-1', status: 'ABERTO' },
      { id: 't-2', status: 'FECHADO' },
    ]);
    const result = await service.getMetrics('org-1', orgUser);
    expect(result.leads.total).toBe(4);
    expect(result.leads.converted).toBe(2);
    expect(result.leads.conversionRate).toBe(50);
    expect(Number(result.opportunities.wonRevenue)).toBe(2000);
    expect(result.tickets.open).toBe(1);
  });

  it('getMetrics — rejeita acesso externo', async () => {
    await expect(service.getMetrics('org-1', outsideUser)).rejects.toThrow(ForbiddenException);
  });
});
