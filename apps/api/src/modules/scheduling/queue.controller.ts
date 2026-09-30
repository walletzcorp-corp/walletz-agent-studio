import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { QueueService } from './services/queue.service';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { TicketStatus } from '@prisma/client';

@Controller({ path: 'queue', version: '1' })
@UseGuards(JwtAuthGuard)
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  // RF-AGE-015: Get or create queue for a unit/date
  @Get()
  getQueue(
    @Query('unitId') unitId: string,
    @Query('date') date: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.queueService.getOrCreateQueue(unitId, date, user);
  }

  @Post(':queueId/tickets')
  issueTicket(
    @Param('queueId', ParseUUIDPipe) queueId: string,
    @Body() body: any,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.queueService.issueTicket(queueId, body, user);
  }

  @Post(':queueId/call-next')
  @HttpCode(HttpStatus.OK)
  callNext(@Param('queueId', ParseUUIDPipe) queueId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.queueService.callNext(queueId, user);
  }

  @Patch('tickets/:ticketId/status')
  updateTicketStatus(
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @Body() body: { status: TicketStatus },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.queueService.updateTicketStatus(ticketId, body.status, user);
  }

  @Patch(':queueId/status')
  setQueueStatus(
    @Param('queueId', ParseUUIDPipe) queueId: string,
    @Body() body: { status: 'ABERTA' | 'PAUSADA' | 'FECHADA' },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.queueService.setQueueStatus(queueId, body.status, user);
  }
}
