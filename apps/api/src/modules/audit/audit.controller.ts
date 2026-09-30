import { Controller, Get, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuditService } from './audit.service';

@ApiTags('Auditoria')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'audit', version: '1' })
export class AuditController {
  constructor(private readonly service: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Consultar eventos de auditoria' })
  findAll(
    @Query('organizationId') organizationId?: string,
    @Query('unitId') unitId?: string,
    @Query('actorId') actorId?: string,
    @Query('resource') resource?: string,
    @Query('action') action?: string,
    @Query('result') result?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    return this.service.findAll({ organizationId, unitId, actorId, resource, action, result, from, to, page: Number(page), limit: Number(limit) });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe do evento de auditoria' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }
}
