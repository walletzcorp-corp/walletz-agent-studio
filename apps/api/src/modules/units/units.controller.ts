import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { UnitsService } from './units.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UnitStatus } from '@prisma/client';
import { IsString, IsOptional, IsInt, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

class UpdateUnitDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() telefone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cidade?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() uf?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() logradouro?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() numero?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() complemento?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bairro?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cep?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() timezone?: string;
  @IsInt() @Min(0) rowVersion: number;
}

class ChangeUnitStatusDto {
  status: UnitStatus;
  @IsOptional() @IsString() reason?: string;
}

@ApiTags('Unidades')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'units', version: '1' })
export class UnitsController {
  constructor(private readonly service: UnitsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar unidade' })
  create(@Body() dto: CreateUnitDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(dto, user.userId!);
  }

  @Get()
  @ApiOperation({ summary: 'Listar unidades' })
  findAll(
    @Query('organizationId') organizationId?: string,
    @Query('status') status?: UnitStatus,
    @Query('search') search?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.service.findAll({ organizationId, status, search, page: Number(page), limit: Number(limit) });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe da unidade' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar unidade' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUnitDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.update(id, dto, user.userId!);
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Alterar status da unidade' })
  changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeUnitStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.changeStatus(id, dto, user.userId!);
  }
}
