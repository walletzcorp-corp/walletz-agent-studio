import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SalService } from './services/sal.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RoomStatus, RoomBookingStatus, ChecklistType } from '@prisma/client';

@Controller({ path: 'sal', version: '1' })
@UseGuards(JwtAuthGuard)
export class SalController {
  constructor(private readonly salService: SalService) {}

  @Get(':organizationId/salas')
  listRooms(
    @Param('organizationId') org: string,
    @Query() q: any,
    @Request() req: any,
  ) {
    return this.salService.listRooms(org, req.user, q);
  }

  @Post(':organizationId/salas')
  createRoom(
    @Param('organizationId') org: string,
    @Body() dto: any,
    @Request() req: any,
  ) {
    return this.salService.createRoom(org, dto, req.user);
  }

  @Patch(':organizationId/salas/:roomId')
  updateRoom(
    @Param('organizationId') org: string,
    @Param('roomId') roomId: string,
    @Body() dto: any,
    @Request() req: any,
  ) {
    return this.salService.updateRoom(org, roomId, dto, req.user);
  }

  @Patch(':organizationId/salas/:roomId/status')
  changeRoomStatus(
    @Param('organizationId') org: string,
    @Param('roomId') roomId: string,
    @Body() dto: { toStatus: RoomStatus; reason?: string; bookingId?: string; force?: boolean },
    @Request() req: any,
  ) {
    return this.salService.changeRoomStatus(org, roomId, dto, req.user);
  }

  @Get(':organizationId/salas/:roomId/historico')
  getRoomHistory(
    @Param('organizationId') org: string,
    @Param('roomId') roomId: string,
    @Request() req: any,
  ) {
    return this.salService.getRoomStateHistory(org, roomId, req.user);
  }

  @Post(':organizationId/salas/:roomId/posicoes')
  addPosition(
    @Param('organizationId') org: string,
    @Param('roomId') roomId: string,
    @Body() dto: any,
    @Request() req: any,
  ) {
    return this.salService.addPosition(org, roomId, dto, req.user);
  }

  @Patch(':organizationId/posicoes/:positionId/status')
  updatePositionStatus(
    @Param('organizationId') org: string,
    @Param('positionId') positionId: string,
    @Body() dto: { status: any },
    @Request() req: any,
  ) {
    return this.salService.updatePositionStatus(org, positionId, dto.status, req.user);
  }

  @Get(':organizationId/reservas')
  listBookings(
    @Param('organizationId') org: string,
    @Query() q: any,
    @Request() req: any,
  ) {
    return this.salService.listBookings(org, req.user, q);
  }

  @Post(':organizationId/reservas')
  createBooking(
    @Param('organizationId') org: string,
    @Body() dto: any,
    @Request() req: any,
  ) {
    return this.salService.createBooking(org, dto, req.user);
  }

  @Patch(':organizationId/reservas/:bookingId/status')
  advanceBookingStatus(
    @Param('organizationId') org: string,
    @Param('bookingId') bookingId: string,
    @Body() dto: { toStatus: RoomBookingStatus },
    @Request() req: any,
  ) {
    return this.salService.advanceBookingStatus(org, bookingId, dto.toStatus, req.user);
  }

  @Post(':organizationId/reservas/:bookingId/cancelar')
  cancelBooking(
    @Param('organizationId') org: string,
    @Param('bookingId') bookingId: string,
    @Body() dto: { reason: string },
    @Request() req: any,
  ) {
    return this.salService.cancelBooking(org, bookingId, dto.reason, req.user);
  }

  @Post(':organizationId/reservas/:bookingId/eventos')
  recordFlowEvent(
    @Param('organizationId') org: string,
    @Param('bookingId') bookingId: string,
    @Body() dto: any,
    @Request() req: any,
  ) {
    return this.salService.recordFlowEvent(org, bookingId, dto, req.user);
  }

  @Post(':organizationId/checklists/templates')
  createChecklistTemplate(
    @Param('organizationId') org: string,
    @Body() dto: any,
    @Request() req: any,
  ) {
    return this.salService.createChecklistTemplate(org, dto, req.user);
  }

  @Get(':organizationId/checklists/templates')
  listChecklistTemplates(
    @Param('organizationId') org: string,
    @Query() q: any,
    @Request() req: any,
  ) {
    return this.salService.listChecklistTemplates(org, req.user, q);
  }

  @Post(':organizationId/checklists/execucoes')
  startChecklist(
    @Param('organizationId') org: string,
    @Body() dto: any,
    @Request() req: any,
  ) {
    return this.salService.startChecklist(org, dto, req.user);
  }

  @Patch(':organizationId/checklists/execucoes/:executionId/itens/:itemId/concluir')
  completeItem(
    @Param('organizationId') org: string,
    @Param('itemId') itemId: string,
    @Body() dto: any,
    @Request() req: any,
  ) {
    return this.salService.completeChecklistItem(org, itemId, dto, req.user);
  }

  @Patch(':organizationId/checklists/execucoes/:executionId/concluir')
  completeChecklist(
    @Param('organizationId') org: string,
    @Param('executionId') executionId: string,
    @Body() dto: any,
    @Request() req: any,
  ) {
    return this.salService.completeChecklist(org, executionId, dto, req.user);
  }

  @Post(':organizationId/incidentes')
  reportIncident(
    @Param('organizationId') org: string,
    @Body() dto: any,
    @Request() req: any,
  ) {
    return this.salService.reportIncident(org, dto, req.user);
  }

  @Patch(':organizationId/incidentes/:incidentId/resolver')
  resolveIncident(
    @Param('organizationId') org: string,
    @Param('incidentId') incidentId: string,
    @Body() dto: any,
    @Request() req: any,
  ) {
    return this.salService.resolveIncident(org, incidentId, dto, req.user);
  }

  @Get(':organizationId/painel-ocupacao')
  getOccupancyDashboard(
    @Param('organizationId') org: string,
    @Request() req: any,
  ) {
    return this.salService.getOccupancyDashboard(org, req.user);
  }
}
