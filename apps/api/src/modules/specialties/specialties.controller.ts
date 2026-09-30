import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { SpecialtiesService } from './specialties.service';
import { IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class CreateSpecialtyDto {
  @ApiProperty() @IsUUID() organizationId: string;
  @ApiProperty() @IsString() code: string;
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}

@ApiTags('Especialidades')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'specialties', version: '1' })
export class SpecialtiesController {
  constructor(private readonly service: SpecialtiesService) {}

  @Post()
  @ApiOperation({ summary: 'Criar especialidade' })
  create(@Body() dto: CreateSpecialtyDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(dto, user.userId!);
  }

  @Get()
  @ApiOperation({ summary: 'Listar especialidades' })
  findAll(
    @Query('organizationId') organizationId?: string,
    @Query('active') active?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    const activeFilter = active === 'true' ? true : active === 'false' ? false : undefined;
    return this.service.findAll({ organizationId, active: activeFilter, page: Number(page), limit: Number(limit) });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe da especialidade' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Ativar/desativar especialidade' })
  toggle(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.toggleActive(id, user.userId!);
  }
}
