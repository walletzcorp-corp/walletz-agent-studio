import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { randomUUID } from 'crypto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class CrmService {
  constructor(private readonly prisma: PrismaService) {}

  private assertAccess(organizationId: string, user: AuthenticatedUser) {
    if (!user.isWalletzAdmin && !user.organizationIds.includes(organizationId)) {
      throw new ForbiddenException('Sem acesso a esta organização');
    }
  }

  // ── Funis e Etapas ────────────────────────────────────────────────────────

  async listFunnels(organizationId: string, user: AuthenticatedUser) {
    this.assertAccess(organizationId, user);
    return this.prisma.crmFunnel.findMany({
      where: { organizationId, active: true },
      include: { stages: { orderBy: { position: 'asc' } }, _count: { select: { opportunities: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async createFunnel(
    organizationId: string,
    dto: { name: string; description?: string; stages: Array<{ name: string; position: number; probability?: number; isWon?: boolean; isLost?: boolean }> },
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);
    return this.prisma.$transaction(async (tx) => {
      const funnel = await tx.crmFunnel.create({
        data: { id: randomUUID(), organizationId, name: dto.name, description: dto.description },
      });
      for (const stage of dto.stages) {
        await tx.crmFunnelStage.create({
          data: {
            id: randomUUID(), funnelId: funnel.id, name: stage.name,
            position: stage.position, probability: stage.probability ?? 50,
            isWon: stage.isWon ?? false, isLost: stage.isLost ?? false,
          },
        });
      }
      return tx.crmFunnel.findUnique({ where: { id: funnel.id }, include: { stages: { orderBy: { position: 'asc' } } } });
    });
  }

  // ── Leads ─────────────────────────────────────────────────────────────────

  async listLeads(
    organizationId: string, user: AuthenticatedUser,
    filters?: { status?: string; search?: string; source?: string },
  ) {
    this.assertAccess(organizationId, user);
    const where: Record<string, unknown> = { organizationId };
    if (filters?.status) where.status = filters.status;
    if (filters?.source) where.source = filters.source;
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.crmLead.findMany({
      where,
      include: { _count: { select: { opportunities: true, activities: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async createLead(
    organizationId: string,
    dto: {
      name: string; email?: string; phone?: string; source?: string; campaign?: string;
      interest?: string; consentGiven?: boolean; consentChannel?: string; notes?: string;
    },
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);
    return this.prisma.crmLead.create({
      data: {
        id: randomUUID(), organizationId,
        name: dto.name, email: dto.email, phone: dto.phone,
        source: dto.source, campaign: dto.campaign, interest: dto.interest,
        consentGiven: dto.consentGiven ?? false,
        consentDate: dto.consentGiven ? new Date() : undefined,
        consentChannel: dto.consentChannel,
        notes: dto.notes, ownedBy: user.sub,
      },
    });
  }

  async getLead(id: string, organizationId: string, user: AuthenticatedUser) {
    this.assertAccess(organizationId, user);
    const lead = await this.prisma.crmLead.findFirst({
      where: { id, organizationId },
      include: {
        opportunities: { include: { stage: true, funnel: true } },
        activities: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!lead) throw new NotFoundException('Lead não encontrado');
    return lead;
  }

  async updateLead(id: string, organizationId: string, dto: Partial<{ name: string; status: string; ownedBy: string; lossReason: string; notes: string }>, user: AuthenticatedUser) {
    this.assertAccess(organizationId, user);
    const lead = await this.prisma.crmLead.findFirst({ where: { id, organizationId } });
    if (!lead) throw new NotFoundException('Lead não encontrado');
    return this.prisma.crmLead.update({ where: { id }, data: dto as any });
  }

  async convertLead(
    id: string, organizationId: string,
    dto: { patientId: string },
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);
    const lead = await this.prisma.crmLead.findFirst({ where: { id, organizationId } });
    if (!lead) throw new NotFoundException('Lead não encontrado');
    if (lead.status === 'CONVERTIDO') throw new BadRequestException('Lead já foi convertido');
    // Validate patient exists in same org
    const patient = await this.prisma.patient.findFirst({ where: { id: dto.patientId, organizationId } });
    if (!patient) throw new NotFoundException('Paciente não encontrado na organização');
    return this.prisma.crmLead.update({
      where: { id },
      data: { status: 'CONVERTIDO', convertedAt: new Date(), convertedToPatientId: dto.patientId },
    });
  }

  // ── Oportunidades ─────────────────────────────────────────────────────────

  async listOpportunities(organizationId: string, user: AuthenticatedUser, filters?: { funnelId?: string; status?: string; leadId?: string }) {
    this.assertAccess(organizationId, user);
    const where: Record<string, unknown> = { organizationId };
    if (filters?.funnelId) where.funnelId = filters.funnelId;
    if (filters?.status) where.status = filters.status;
    if (filters?.leadId) where.leadId = filters.leadId;
    return this.prisma.crmOpportunity.findMany({
      where,
      include: { stage: true, funnel: true, lead: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createOpportunity(
    organizationId: string,
    dto: {
      leadId?: string; funnelId: string; stageId: string; title: string;
      serviceId?: string; value?: number; probability?: number; expectedCloseDate?: string;
    },
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);
    const funnel = await this.prisma.crmFunnel.findFirst({ where: { id: dto.funnelId, organizationId } });
    if (!funnel) throw new NotFoundException('Funil não encontrado');
    return this.prisma.crmOpportunity.create({
      data: {
        id: randomUUID(), organizationId, leadId: dto.leadId,
        funnelId: dto.funnelId, stageId: dto.stageId, title: dto.title,
        serviceId: dto.serviceId,
        value: dto.value != null ? new Decimal(dto.value) : undefined,
        probability: dto.probability ?? 50,
        expectedCloseDate: dto.expectedCloseDate ? new Date(dto.expectedCloseDate) : undefined,
        ownedBy: user.sub,
      },
      include: { stage: true, funnel: true },
    });
  }

  async moveOpportunity(
    id: string, organizationId: string,
    dto: { stageId: string },
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);
    const opp = await this.prisma.crmOpportunity.findFirst({ where: { id, organizationId } });
    if (!opp) throw new NotFoundException('Oportunidade não encontrada');
    const stage = await this.prisma.crmFunnelStage.findFirst({
      where: { id: dto.stageId, funnelId: opp.funnelId },
    });
    if (!stage) throw new NotFoundException('Etapa não encontrada no funil');
    const newStatus = stage.isWon ? 'GANHA' : stage.isLost ? 'PERDIDA' : 'ABERTA';
    return this.prisma.crmOpportunity.update({
      where: { id },
      data: { stageId: dto.stageId, status: newStatus as any },
      include: { stage: true },
    });
  }

  // ── Atividades ────────────────────────────────────────────────────────────

  async createActivity(
    organizationId: string,
    dto: { leadId?: string; opportunityId?: string; type: string; subject: string; description?: string; dueDate?: string },
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);
    return this.prisma.crmActivity.create({
      data: {
        id: randomUUID(), organizationId,
        leadId: dto.leadId, opportunityId: dto.opportunityId,
        type: dto.type as any, subject: dto.subject, description: dto.description,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        performedBy: user.sub,
      },
    });
  }

  async completeActivity(id: string, organizationId: string, user: AuthenticatedUser) {
    this.assertAccess(organizationId, user);
    const act = await this.prisma.crmActivity.findFirst({ where: { id, organizationId } });
    if (!act) throw new NotFoundException('Atividade não encontrada');
    return this.prisma.crmActivity.update({ where: { id }, data: { completedAt: new Date() } });
  }

  // ── Propostas ─────────────────────────────────────────────────────────────

  async createProposal(
    organizationId: string,
    dto: { opportunityId: string; title: string; value: number; validUntil?: string; content?: string },
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);
    const opp = await this.prisma.crmOpportunity.findFirst({ where: { id: dto.opportunityId, organizationId } });
    if (!opp) throw new NotFoundException('Oportunidade não encontrada');
    return this.prisma.crmProposal.create({
      data: {
        id: randomUUID(), organizationId, opportunityId: dto.opportunityId,
        title: dto.title, value: new Decimal(dto.value),
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        content: dto.content, createdBy: user.sub,
      },
    });
  }

  async acceptProposal(id: string, organizationId: string, user: AuthenticatedUser) {
    this.assertAccess(organizationId, user);
    const proposal = await this.prisma.crmProposal.findFirst({ where: { id, organizationId } });
    if (!proposal) throw new NotFoundException('Proposta não encontrada');
    if (proposal.status === 'ACEITA') throw new BadRequestException('Proposta já aceita');
    return this.prisma.crmProposal.update({ where: { id }, data: { status: 'ACEITA', acceptedAt: new Date(), acceptedBy: user.sub } });
  }

  // ── Templates ─────────────────────────────────────────────────────────────

  async listTemplates(organizationId: string, user: AuthenticatedUser, channel?: string) {
    this.assertAccess(organizationId, user);
    return this.prisma.crmTemplate.findMany({
      where: { organizationId, active: true, ...(channel ? { channel } : {}) },
      orderBy: { name: 'asc' },
    });
  }

  async createTemplate(
    organizationId: string,
    dto: { name: string; channel: string; purpose: string; subject?: string; body: string },
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);
    return this.prisma.crmTemplate.create({
      data: { id: randomUUID(), organizationId, ...dto, createdBy: user.sub },
    });
  }

  async approveTemplate(id: string, organizationId: string, user: AuthenticatedUser) {
    this.assertAccess(organizationId, user);
    const tmpl = await this.prisma.crmTemplate.findFirst({ where: { id, organizationId } });
    if (!tmpl) throw new NotFoundException('Template não encontrado');
    return this.prisma.crmTemplate.update({
      where: { id },
      data: { approved: true, approvedBy: user.sub, approvedAt: new Date() },
    });
  }

  // ── Tickets ───────────────────────────────────────────────────────────────

  async listTickets(organizationId: string, user: AuthenticatedUser, filters?: { status?: string; priority?: string }) {
    this.assertAccess(organizationId, user);
    const where: Record<string, unknown> = { organizationId };
    if (filters?.status) where.status = filters.status;
    if (filters?.priority) where.priority = filters.priority;
    return this.prisma.crmTicket.findMany({
      where,
      include: { messages: { orderBy: { createdAt: 'asc' }, take: 1 } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createTicket(
    organizationId: string,
    dto: { subject: string; category?: string; priority?: string; channel?: string; leadId?: string; patientId?: string; firstMessage?: string },
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);
    return this.prisma.$transaction(async (tx) => {
      const slaDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h default SLA
      const ticket = await tx.crmTicket.create({
        data: {
          id: randomUUID(), organizationId,
          subject: dto.subject, category: dto.category,
          priority: (dto.priority as any) ?? 'MEDIA', channel: dto.channel,
          leadId: dto.leadId, patientId: dto.patientId,
          slaDeadline, createdBy: user.sub,
        },
      });
      if (dto.firstMessage) {
        await tx.crmTicketMessage.create({
          data: {
            id: randomUUID(), ticketId: ticket.id, body: dto.firstMessage,
            authorSub: user.sub, authorName: user.name ?? user.email ?? user.sub,
          },
        });
      }
      return tx.crmTicket.findUnique({
        where: { id: ticket.id },
        include: { messages: true },
      });
    });
  }

  async addTicketMessage(
    ticketId: string, organizationId: string,
    dto: { body: string; isInternal?: boolean },
    user: AuthenticatedUser,
  ) {
    this.assertAccess(organizationId, user);
    const ticket = await this.prisma.crmTicket.findFirst({ where: { id: ticketId, organizationId } });
    if (!ticket) throw new NotFoundException('Ticket não encontrado');
    if (ticket.status === 'FECHADO') throw new BadRequestException('Ticket fechado');
    return this.prisma.crmTicketMessage.create({
      data: {
        id: randomUUID(), ticketId, body: dto.body,
        authorSub: user.sub, authorName: user.name ?? user.email ?? user.sub,
        isInternal: dto.isInternal ?? false,
      },
    });
  }

  async updateTicketStatus(id: string, organizationId: string, dto: { status: string }, user: AuthenticatedUser) {
    this.assertAccess(organizationId, user);
    const ticket = await this.prisma.crmTicket.findFirst({ where: { id, organizationId } });
    if (!ticket) throw new NotFoundException('Ticket não encontrado');
    const now = new Date();
    const extra: Record<string, unknown> = {};
    if (dto.status === 'RESOLVIDO') extra.resolvedAt = now;
    if (dto.status === 'FECHADO') extra.closedAt = now;
    return this.prisma.crmTicket.update({ where: { id }, data: { status: dto.status as any, ...extra } });
  }

  // ── Métricas ──────────────────────────────────────────────────────────────

  async getMetrics(organizationId: string, user: AuthenticatedUser) {
    this.assertAccess(organizationId, user);
    const [leads, opps, tickets] = await Promise.all([
      this.prisma.crmLead.findMany({ where: { organizationId } }),
      this.prisma.crmOpportunity.findMany({ where: { organizationId } }),
      this.prisma.crmTicket.findMany({ where: { organizationId } }),
    ]);
    const totalLeads = leads.length;
    const converted = leads.filter((l) => l.status === 'CONVERTIDO').length;
    const conversionRate = totalLeads > 0 ? (converted / totalLeads) * 100 : 0;
    const wonOpps = opps.filter((o) => o.status === 'GANHA');
    const wonRevenue = wonOpps.reduce((s, o) => s.plus(o.value ?? new Decimal(0)), new Decimal(0));
    const avgCycleMs = wonOpps.length > 0
      ? wonOpps.reduce((s, o) => s + (o.updatedAt.getTime() - o.createdAt.getTime()), 0) / wonOpps.length
      : 0;
    const openTickets = tickets.filter((t) => !['RESOLVIDO', 'FECHADO'].includes(t.status)).length;
    return {
      leads: { total: totalLeads, converted, conversionRate: +conversionRate.toFixed(1) },
      opportunities: { total: opps.length, won: wonOpps.length, wonRevenue },
      avgSalesCycleDays: +(avgCycleMs / 86400000).toFixed(1),
      tickets: { total: tickets.length, open: openTickets },
    };
  }
}
