import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { CrmService } from './services/crm.service';

@Controller({ path: 'crm', version: '1' })
@UseGuards(JwtAuthGuard)
export class CrmController {
  constructor(private readonly crm: CrmService) {}

  // ── Funis ──────────────────────────────────────────────────────────────────

  @Get('funis')
  listFunnels(@Query('organizationId') o: string, @CurrentUser() u: AuthenticatedUser) {
    return this.crm.listFunnels(o, u);
  }

  @Post('funis')
  createFunnel(@Query('organizationId') o: string, @Body() b: any, @CurrentUser() u: AuthenticatedUser) {
    return this.crm.createFunnel(o, b, u);
  }

  // ── Leads ──────────────────────────────────────────────────────────────────

  @Get('leads')
  listLeads(
    @Query('organizationId') o: string,
    @Query('status') status: string | undefined,
    @Query('search') search: string | undefined,
    @Query('source') source: string | undefined,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.crm.listLeads(o, u, { status, search, source });
  }

  @Post('leads')
  createLead(@Query('organizationId') o: string, @Body() b: any, @CurrentUser() u: AuthenticatedUser) {
    return this.crm.createLead(o, b, u);
  }

  @Get('leads/:id')
  getLead(@Param('id') id: string, @Query('organizationId') o: string, @CurrentUser() u: AuthenticatedUser) {
    return this.crm.getLead(id, o, u);
  }

  @Patch('leads/:id')
  updateLead(@Param('id') id: string, @Query('organizationId') o: string, @Body() b: any, @CurrentUser() u: AuthenticatedUser) {
    return this.crm.updateLead(id, o, b, u);
  }

  @Post('leads/:id/converter')
  @HttpCode(HttpStatus.OK)
  convertLead(@Param('id') id: string, @Query('organizationId') o: string, @Body() b: any, @CurrentUser() u: AuthenticatedUser) {
    return this.crm.convertLead(id, o, b, u);
  }

  // ── Oportunidades ──────────────────────────────────────────────────────────

  @Get('oportunidades')
  listOpportunities(
    @Query('organizationId') o: string,
    @Query('funnelId') funnelId: string | undefined,
    @Query('status') status: string | undefined,
    @Query('leadId') leadId: string | undefined,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.crm.listOpportunities(o, u, { funnelId, status, leadId });
  }

  @Post('oportunidades')
  createOpportunity(@Query('organizationId') o: string, @Body() b: any, @CurrentUser() u: AuthenticatedUser) {
    return this.crm.createOpportunity(o, b, u);
  }

  @Patch('oportunidades/:id/mover')
  moveOpportunity(@Param('id') id: string, @Query('organizationId') o: string, @Body() b: any, @CurrentUser() u: AuthenticatedUser) {
    return this.crm.moveOpportunity(id, o, b, u);
  }

  // ── Atividades ─────────────────────────────────────────────────────────────

  @Post('atividades')
  createActivity(@Query('organizationId') o: string, @Body() b: any, @CurrentUser() u: AuthenticatedUser) {
    return this.crm.createActivity(o, b, u);
  }

  @Post('atividades/:id/concluir')
  @HttpCode(HttpStatus.OK)
  completeActivity(@Param('id') id: string, @Query('organizationId') o: string, @CurrentUser() u: AuthenticatedUser) {
    return this.crm.completeActivity(id, o, u);
  }

  // ── Propostas ──────────────────────────────────────────────────────────────

  @Post('propostas')
  createProposal(@Query('organizationId') o: string, @Body() b: any, @CurrentUser() u: AuthenticatedUser) {
    return this.crm.createProposal(o, b, u);
  }

  @Post('propostas/:id/aceitar')
  @HttpCode(HttpStatus.OK)
  acceptProposal(@Param('id') id: string, @Query('organizationId') o: string, @CurrentUser() u: AuthenticatedUser) {
    return this.crm.acceptProposal(id, o, u);
  }

  // ── Templates ──────────────────────────────────────────────────────────────

  @Get('templates')
  listTemplates(
    @Query('organizationId') o: string,
    @Query('channel') channel: string | undefined,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.crm.listTemplates(o, u, channel);
  }

  @Post('templates')
  createTemplate(@Query('organizationId') o: string, @Body() b: any, @CurrentUser() u: AuthenticatedUser) {
    return this.crm.createTemplate(o, b, u);
  }

  @Post('templates/:id/aprovar')
  @HttpCode(HttpStatus.OK)
  approveTemplate(@Param('id') id: string, @Query('organizationId') o: string, @CurrentUser() u: AuthenticatedUser) {
    return this.crm.approveTemplate(id, o, u);
  }

  // ── Tickets ────────────────────────────────────────────────────────────────

  @Get('tickets')
  listTickets(
    @Query('organizationId') o: string,
    @Query('status') status: string | undefined,
    @Query('priority') priority: string | undefined,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.crm.listTickets(o, u, { status, priority });
  }

  @Post('tickets')
  createTicket(@Query('organizationId') o: string, @Body() b: any, @CurrentUser() u: AuthenticatedUser) {
    return this.crm.createTicket(o, b, u);
  }

  @Post('tickets/:id/mensagens')
  addTicketMessage(
    @Param('id') id: string,
    @Query('organizationId') o: string,
    @Body() b: any,
    @CurrentUser() u: AuthenticatedUser,
  ) {
    return this.crm.addTicketMessage(id, o, b, u);
  }

  @Patch('tickets/:id/status')
  updateTicketStatus(@Param('id') id: string, @Query('organizationId') o: string, @Body() b: any, @CurrentUser() u: AuthenticatedUser) {
    return this.crm.updateTicketStatus(id, o, b, u);
  }

  // ── Métricas ───────────────────────────────────────────────────────────────

  @Get('metricas')
  getMetrics(@Query('organizationId') o: string, @CurrentUser() u: AuthenticatedUser) {
    return this.crm.getMetrics(o, u);
  }
}
