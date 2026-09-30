import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { ServicesCatalogService } from './services-catalog.service';
import { ServiceStatus } from '@prisma/client';

@ApiTags('Catálogo de Serviços')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'services', version: '1' })
export class ServicesCatalogController {
  constructor(private readonly service: ServicesCatalogService) {}

  @Post()
  @ApiOperation({ summary: 'Criar serviço/procedimento' })
  create(@Body() dto: any, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(dto, user.userId!);
  }

  @Get()
  @ApiOperation({ summary: 'Listar serviços' })
  findAll(
    @Query('organizationId') organizationId?: string,
    @Query('status') status?: ServiceStatus,
    @Query('type') type?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.service.findAll({ organizationId, status, type, page: Number(page), limit: Number(limit) });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe do serviço' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id/publish')
  @ApiOperation({ summary: 'Publicar serviço' })
  publish(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.publish(id, user.userId!);
  }
}
