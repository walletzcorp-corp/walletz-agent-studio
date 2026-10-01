import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { NcdService } from './services/ncd.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { NcdTemplateType, NcdAutomationStatus } from '@prisma/client';

@Controller({ path: 'ncd', version: '1' })
@UseGuards(JwtAuthGuard)
export class NcdController {
  constructor(private readonly ncdService: NcdService) {}

  @Post(':orgId/templates')
  createTemplate(@Param('orgId') orgId: string, @CurrentUser() user: AuthenticatedUser, @Body() body: any) {
    return this.ncdService.createTemplate(orgId, user, body);
  }

  @Get(':orgId/templates')
  listTemplates(@Param('orgId') orgId: string, @CurrentUser() user: AuthenticatedUser, @Query() q: { templateType?: NcdTemplateType; specialty?: string }) {
    return this.ncdService.listTemplates(orgId, user, q);
  }

  @Post(':orgId/versions')
  createVersion(@Param('orgId') orgId: string, @CurrentUser() user: AuthenticatedUser, @Body() body: any) {
    return this.ncdService.createVersion(orgId, user, body);
  }

  @Post(':orgId/versions/:id/approve')
  approveVersion(@Param('orgId') orgId: string, @Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.ncdService.approveVersion(orgId, user, id);
  }

  @Post(':orgId/versions/:id/publish')
  publishVersion(@Param('orgId') orgId: string, @Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.ncdService.publishVersion(orgId, user, id);
  }

  @Post(':orgId/versions/:id/retire')
  retireVersion(@Param('orgId') orgId: string, @Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.ncdService.retireVersion(orgId, user, id);
  }

  @Post(':orgId/simulations')
  runSimulation(@Param('orgId') orgId: string, @CurrentUser() user: AuthenticatedUser, @Body() body: { versionId: string; inputData: Record<string, unknown> }) {
    return this.ncdService.runSimulation(orgId, user, body);
  }

  @Post(':orgId/automations')
  createAutomation(@Param('orgId') orgId: string, @CurrentUser() user: AuthenticatedUser, @Body() body: any) {
    return this.ncdService.createAutomation(orgId, user, body);
  }

  @Patch(':orgId/automations/:id/status')
  updateAutomationStatus(@Param('orgId') orgId: string, @Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Body() body: { status: NcdAutomationStatus }) {
    return this.ncdService.updateAutomationStatus(orgId, user, id, body);
  }

  @Get(':orgId/automations')
  listAutomations(@Param('orgId') orgId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.ncdService.listAutomations(orgId, user);
  }

  @Get(':orgId/dashboard')
  getDashboard(@Param('orgId') orgId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.ncdService.getDashboard(orgId, user);
  }
}
