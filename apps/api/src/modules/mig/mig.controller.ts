import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { MigService } from './services/mig.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { MigJobStatus, MigTicketStatus, MigTicketPriority } from '@prisma/client';

@Controller({ path: 'mig', version: '1' })
@UseGuards(JwtAuthGuard)
export class MigController {
  constructor(private readonly migService: MigService) {}

  @Post(':orgId/jobs')
  createJob(@Param('orgId') orgId: string, @CurrentUser() user: AuthenticatedUser, @Body() body: any) {
    return this.migService.createJob(orgId, user, body);
  }

  @Get(':orgId/jobs')
  listJobs(@Param('orgId') orgId: string, @CurrentUser() user: AuthenticatedUser, @Query() q: { status?: MigJobStatus; targetModule?: string }) {
    return this.migService.listJobs(orgId, user, q);
  }

  @Post(':orgId/jobs/:id/validate')
  validateJob(@Param('orgId') orgId: string, @Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Body() body: any) {
    return this.migService.validateJob(orgId, user, id, body);
  }

  @Post(':orgId/jobs/:id/approve')
  approveJob(@Param('orgId') orgId: string, @Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.migService.approveJob(orgId, user, id);
  }

  @Post(':orgId/jobs/:id/execute')
  executeJob(@Param('orgId') orgId: string, @Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.migService.executeJob(orgId, user, id);
  }

  @Post(':orgId/jobs/:id/accept')
  formalAccept(@Param('orgId') orgId: string, @Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.migService.formalAccept(orgId, user, id);
  }

  @Post(':orgId/jobs/:id/rollback')
  rollbackJob(@Param('orgId') orgId: string, @Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Body() body: { notes?: string }) {
    return this.migService.rollbackJob(orgId, user, id, body);
  }

  @Post(':orgId/health-scores')
  recordHealthScore(@Param('orgId') orgId: string, @CurrentUser() user: AuthenticatedUser, @Body() body: any) {
    return this.migService.recordHealthScore(orgId, user, body);
  }

  @Get(':orgId/health-scores')
  listHealthScores(@Param('orgId') orgId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.migService.listHealthScores(orgId, user);
  }

  @Post(':orgId/tickets')
  createTicket(@Param('orgId') orgId: string, @CurrentUser() user: AuthenticatedUser, @Body() body: any) {
    return this.migService.createTicket(orgId, user, body);
  }

  @Get(':orgId/tickets')
  listTickets(@Param('orgId') orgId: string, @CurrentUser() user: AuthenticatedUser, @Query() q: { status?: MigTicketStatus; priority?: MigTicketPriority }) {
    return this.migService.listTickets(orgId, user, q);
  }

  @Patch(':orgId/tickets/:id/status')
  updateTicketStatus(@Param('orgId') orgId: string, @Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Body() body: any) {
    return this.migService.updateTicketStatus(orgId, user, id, body);
  }

  @Post(':orgId/access-grants')
  grantAccess(@Param('orgId') orgId: string, @CurrentUser() user: AuthenticatedUser, @Body() body: any) {
    return this.migService.grantTemporaryAccess(orgId, user, body);
  }

  @Post(':orgId/access-grants/:id/revoke')
  revokeAccess(@Param('orgId') orgId: string, @Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.migService.revokeAccess(orgId, user, id);
  }

  @Get(':orgId/access-grants')
  listGrants(@Param('orgId') orgId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.migService.listActiveGrants(orgId, user);
  }

  @Post(':orgId/onboarding')
  upsertOnboarding(@Param('orgId') orgId: string, @CurrentUser() user: AuthenticatedUser, @Body() body: any) {
    return this.migService.upsertOnboarding(orgId, user, body);
  }

  @Get(':orgId/dashboard')
  getDashboard(@Param('orgId') orgId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.migService.getDashboard(orgId, user);
  }
}
