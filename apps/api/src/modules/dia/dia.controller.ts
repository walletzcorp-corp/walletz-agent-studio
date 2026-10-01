import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { DiaService } from './services/dia.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { DiaOrderStatus } from '@prisma/client';

@Controller({ path: 'dia', version: '1' })
@UseGuards(JwtAuthGuard)
export class DiaController {
  constructor(private readonly diaService: DiaService) {}

  @Post(':orgId/orders')
  createOrder(@Param('orgId') orgId: string, @CurrentUser() user: AuthenticatedUser, @Body() body: any) {
    return this.diaService.createOrder(orgId, user, body);
  }

  @Get(':orgId/orders')
  listOrders(@Param('orgId') orgId: string, @CurrentUser() user: AuthenticatedUser, @Query() q: { patientId?: string; status?: DiaOrderStatus; examType?: string }) {
    return this.diaService.listOrders(orgId, user, q);
  }

  @Patch(':orgId/orders/:id/status')
  updateOrderStatus(@Param('orgId') orgId: string, @Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Body() body: any) {
    return this.diaService.updateOrderStatus(orgId, user, id, body);
  }

  @Post(':orgId/samples')
  registerSample(@Param('orgId') orgId: string, @CurrentUser() user: AuthenticatedUser, @Body() body: any) {
    return this.diaService.registerSample(orgId, user, body);
  }

  @Patch(':orgId/samples/:id/reject')
  rejectSample(@Param('orgId') orgId: string, @Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Body() body: { rejectionReason: string }) {
    return this.diaService.rejectSample(orgId, user, id, body);
  }

  @Post(':orgId/samples/:id/recollect')
  recolectSample(@Param('orgId') orgId: string, @Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Body() body: { barcode: string; sampleType: string }) {
    return this.diaService.recolectSample(orgId, user, id, body);
  }

  @Post(':orgId/results')
  createResult(@Param('orgId') orgId: string, @CurrentUser() user: AuthenticatedUser, @Body() body: any) {
    return this.diaService.createResult(orgId, user, body);
  }

  @Post(':orgId/results/:id/release')
  releaseResult(@Param('orgId') orgId: string, @Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.diaService.releaseResult(orgId, user, id);
  }

  @Post(':orgId/results/:id/acknowledge-critical')
  acknowledgeCritical(@Param('orgId') orgId: string, @Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.diaService.acknowledgeCritical(orgId, user, id);
  }

  @Post(':orgId/results/:id/rectify')
  rectifyResult(@Param('orgId') orgId: string, @Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Body() body: any) {
    return this.diaService.rectifyResult(orgId, user, id, body);
  }

  @Post(':orgId/work-items')
  createWorkItem(@Param('orgId') orgId: string, @CurrentUser() user: AuthenticatedUser, @Body() body: any) {
    return this.diaService.createWorkItem(orgId, user, body);
  }

  @Get(':orgId/work-items')
  listWorkItems(@Param('orgId') orgId: string, @CurrentUser() user: AuthenticatedUser, @Query() q: { assignedTo?: string }) {
    return this.diaService.listWorkItems(orgId, user, q);
  }

  @Get(':orgId/dashboard')
  getDashboard(@Param('orgId') orgId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.diaService.getDashboard(orgId, user);
  }
}
