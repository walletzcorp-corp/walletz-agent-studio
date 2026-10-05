import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { AgentsService } from './agents.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { SetToolPermissionDto } from './dto/tool-permission.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../../shared/rbac/rbac.guard';
import { Roles } from '../../shared/rbac/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/auth.service';

@ApiTags('agents')
@Controller('tenants/:tenantId/agents')
@UseGuards(JwtAuthGuard, RbacGuard)
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-slug', required: true })
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Get('templates')
  @Roles('viewer')
  @ApiOperation({ summary: 'Listar templates de agente disponíveis' })
  getTemplates() {
    return this.agentsService.getTemplates();
  }

  @Get('tools')
  @Roles('viewer')
  @ApiOperation({ summary: 'Listar ferramentas disponíveis para agentes' })
  getAvailableTools() {
    return this.agentsService.getAvailableTools();
  }

  @Get()
  @Roles('viewer')
  @ApiOperation({ summary: 'Listar agentes do tenant' })
  findAll(@Param('tenantId') tenantId: string) {
    return this.agentsService.findAllByTenant(tenantId);
  }

  @Post()
  @Roles('manager')
  @ApiOperation({ summary: 'Criar agente' })
  create(
    @Param('tenantId') tenantId: string,
    @Body() dto: CreateAgentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.agentsService.create(dto, tenantId, user.sub);
  }

  @Get(':agentId')
  @Roles('viewer')
  @ApiOperation({ summary: 'Detalhes do agente' })
  findOne(@Param('tenantId') tenantId: string, @Param('agentId') agentId: string) {
    return this.agentsService.findById(agentId, tenantId);
  }

  @Patch(':agentId')
  @Roles('manager')
  @ApiOperation({ summary: 'Atualizar agente' })
  update(
    @Param('tenantId') tenantId: string,
    @Param('agentId') agentId: string,
    @Body() dto: UpdateAgentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.agentsService.update(agentId, dto, tenantId, user.sub);
  }

  @Post(':agentId/publish')
  @Roles('manager')
  @ApiOperation({ summary: 'Publicar agente (cria nova release)' })
  publish(
    @Param('tenantId') tenantId: string,
    @Param('agentId') agentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.agentsService.publish(agentId, tenantId, user.sub);
  }

  @Post(':agentId/pause')
  @Roles('manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Pausar agente' })
  async pause(
    @Param('tenantId') tenantId: string,
    @Param('agentId') agentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.agentsService.pause(agentId, tenantId, user.sub);
  }

  @Post(':agentId/resume')
  @Roles('manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reativar agente pausado' })
  async resume(
    @Param('tenantId') tenantId: string,
    @Param('agentId') agentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.agentsService.resume(agentId, tenantId, user.sub);
  }

  @Delete(':agentId')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Arquivar agente' })
  async remove(
    @Param('tenantId') tenantId: string,
    @Param('agentId') agentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.agentsService.softDelete(agentId, tenantId, user.sub);
  }

  @Get(':agentId/releases')
  @Roles('viewer')
  @ApiOperation({ summary: 'Histórico de releases do agente' })
  getReleases(@Param('tenantId') tenantId: string, @Param('agentId') agentId: string) {
    return this.agentsService.getReleases(agentId, tenantId);
  }

  @Post(':agentId/releases/:releaseId/rollback')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Fazer rollback para uma release anterior' })
  async rollback(
    @Param('tenantId') tenantId: string,
    @Param('agentId') agentId: string,
    @Param('releaseId') releaseId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.agentsService.rollbackToRelease(agentId, releaseId, tenantId, user.sub);
  }

  @Get(':agentId/tool-permissions')
  @Roles('viewer')
  @ApiOperation({ summary: 'Listar permissões de ferramentas do agente' })
  getToolPermissions(@Param('tenantId') tenantId: string, @Param('agentId') agentId: string) {
    return this.agentsService.getToolPermissions(agentId, tenantId);
  }

  @Post(':agentId/tool-permissions')
  @Roles('manager')
  @ApiOperation({ summary: 'Definir permissão de ferramenta' })
  setToolPermission(
    @Param('tenantId') tenantId: string,
    @Param('agentId') agentId: string,
    @Body() dto: SetToolPermissionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.agentsService.setToolPermission(agentId, dto, tenantId, user.sub);
  }
}
