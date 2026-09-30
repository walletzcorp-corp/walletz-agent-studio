import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { ResourcesService } from './resources.service';
import { ResourceStatus } from '@prisma/client';

@ApiTags('Recursos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'resources', version: '1' })
export class ResourcesController {
  constructor(private readonly service: ResourcesService) {}

  @Post()
  @ApiOperation({ summary: 'Cadastrar recurso (sala, equipamento, etc.)' })
  create(@Body() dto: any, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(dto, user.userId!);
  }

  @Get()
  @ApiOperation({ summary: 'Listar recursos' })
  findAll(
    @Query('unitId') unitId?: string,
    @Query('type') type?: string,
    @Query('status') status?: ResourceStatus,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.service.findAll({ unitId, type, status, page: Number(page), limit: Number(limit) });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe do recurso' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Alterar status do recurso' })
  changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { status: ResourceStatus; reason?: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.changeStatus(id, dto.status, dto.reason, user.userId!);
  }
}
