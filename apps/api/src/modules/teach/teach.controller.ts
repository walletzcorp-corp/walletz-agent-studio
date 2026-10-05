import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { TeachService } from './teach.service';
import { CreateKnowledgeItemDto, UpdateKnowledgeItemDto } from './dto/knowledge-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../../shared/rbac/rbac.guard';
import { Roles } from '../../shared/rbac/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/auth.service';

@ApiTags('teach')
@Controller('tenants/:tenantId/teach')
@UseGuards(JwtAuthGuard, RbacGuard)
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-slug', required: true })
export class TeachController {
  constructor(private readonly teachService: TeachService) {}

  @Get()
  @Roles('viewer')
  @ApiOperation({ summary: 'Listar itens de conhecimento ensinados' })
  @ApiQuery({ name: 'type', required: false, enum: ['fact', 'guidance', 'procedure', 'permission', 'example'] })
  @ApiQuery({ name: 'agentId', required: false })
  @ApiQuery({ name: 'approved', required: false, type: Boolean })
  findAll(
    @Param('tenantId') tenantId: string,
    @Query('type') type?: string,
    @Query('agentId') agentId?: string,
    @Query('approved') approved?: string,
  ) {
    const approvedFilter = approved === 'true' ? true : approved === 'false' ? false : undefined;
    return this.teachService.listItems(tenantId, { type, agentId, approved: approvedFilter });
  }

  @Get(':itemId')
  @Roles('viewer')
  @ApiOperation({ summary: 'Detalhes de um item de conhecimento' })
  findOne(@Param('tenantId') tenantId: string, @Param('itemId') itemId: string) {
    return this.teachService.getItem(itemId, tenantId);
  }

  @Post()
  @Roles('manager')
  @ApiOperation({ summary: 'Criar novo item de conhecimento' })
  create(
    @Param('tenantId') tenantId: string,
    @Body() dto: CreateKnowledgeItemDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.teachService.create(dto, tenantId, user.sub);
  }

  @Patch(':itemId')
  @Roles('manager')
  @ApiOperation({ summary: 'Atualizar item de conhecimento (requer reaprovação)' })
  update(
    @Param('tenantId') tenantId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateKnowledgeItemDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.teachService.update(itemId, dto, tenantId, user.sub);
  }

  @Post(':itemId/approve')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Aprovar item de conhecimento para uso em produção' })
  approve(
    @Param('tenantId') tenantId: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.teachService.approve(itemId, tenantId, user.sub);
  }

  @Post(':itemId/revoke-approval')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revogar aprovação de item' })
  revokeApproval(
    @Param('tenantId') tenantId: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.teachService.revokeApproval(itemId, tenantId, user.sub);
  }

  @Delete(':itemId')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover item de conhecimento' })
  async remove(
    @Param('tenantId') tenantId: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.teachService.remove(itemId, tenantId, user.sub);
  }
}
