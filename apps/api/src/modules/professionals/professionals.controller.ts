import { Controller, Get, Post, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { ProfessionalsService } from './professionals.service';

@ApiTags('Profissionais')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'professionals', version: '1' })
export class ProfessionalsController {
  constructor(private readonly service: ProfessionalsService) {}

  @Post()
  @ApiOperation({ summary: 'Cadastrar profissional' })
  create(@Body() dto: any, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(dto, user.userId!);
  }

  @Get()
  @ApiOperation({ summary: 'Listar profissionais' })
  findAll(@Query('organizationId') organizationId?: string, @Query('page') page = 1, @Query('limit') limit = 20) {
    return this.service.findAll({ organizationId, page: Number(page), limit: Number(limit) });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe do profissional' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post('link-to-unit')
  @ApiOperation({ summary: 'Vincular profissional a unidade' })
  linkToUnit(@Body() dto: any, @CurrentUser() user: AuthenticatedUser) {
    return this.service.linkToUnit(dto, user.userId!);
  }
}
