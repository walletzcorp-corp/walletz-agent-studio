import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../../shared/rbac/rbac.guard';
import { Roles } from '../../shared/rbac/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/auth.service';
import { AiProvidersService } from './ai-providers.service';
import { CreateAiConnectionDto, SetAgentAiConnectionDto, UpdateAiConnectionDto } from './dto/ai-connection.dto';

/** Conexões com provedores de IA usando a chave do próprio cliente (BYOK). */
@ApiTags('ai-connections')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RbacGuard)
@Controller('tenants/:tenantId/ai-connections')
export class AiProvidersController {
  constructor(private readonly service: AiProvidersService) {}

  @Get('providers')
  @Roles('viewer')
  @ApiOperation({ summary: 'Provedores homologados e links oficiais de compra/chave' })
  providers() {
    return this.service.providers();
  }

  @Get()
  @Roles('viewer')
  @ApiOperation({ summary: 'Listar conexões de IA (chave sempre mascarada)' })
  list(@Param('tenantId') tenantId: string) {
    return this.service.list(tenantId);
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Conectar chave de IA: valida autenticação, modelo e faturamento com uma chamada de teste' })
  create(@Param('tenantId') tenantId: string, @Body() dto: CreateAiConnectionDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(tenantId, dto, user.sub);
  }

  @Patch(':connectionId')
  @Roles('admin')
  @ApiOperation({ summary: 'Trocar a chave (rotação), o modelo ou o nome; a nova chave é validada antes de substituir' })
  update(
    @Param('tenantId') tenantId: string,
    @Param('connectionId') connectionId: string,
    @Body() dto: UpdateAiConnectionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.update(tenantId, connectionId, dto, user.sub);
  }

  @Post(':connectionId/test')
  @HttpCode(HttpStatus.OK)
  @Roles('manager')
  @ApiOperation({ summary: 'Testar a chave salva (reativa após regularizar o faturamento no provedor)' })
  test(@Param('tenantId') tenantId: string, @Param('connectionId') connectionId: string, @CurrentUser() user: JwtPayload) {
    return this.service.test(tenantId, connectionId, user.sub);
  }

  @Get(':connectionId/models')
  @Roles('manager')
  @ApiOperation({ summary: 'Modelos disponíveis na conta do provedor' })
  models(@Param('tenantId') tenantId: string, @Param('connectionId') connectionId: string) {
    return this.service.listModels(tenantId, connectionId);
  }

  @Post(':connectionId/default')
  @HttpCode(HttpStatus.OK)
  @Roles('admin')
  @ApiOperation({ summary: 'Tornar a conexão padrão da organização' })
  setDefault(
    @Param('tenantId') tenantId: string,
    @Param('connectionId') connectionId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.setDefault(tenantId, connectionId, user.sub);
  }

  @Delete(':connectionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('admin')
  @ApiOperation({ summary: 'Revogar a conexão (a chave cifrada é apagada)' })
  async remove(
    @Param('tenantId') tenantId: string,
    @Param('connectionId') connectionId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.service.remove(tenantId, connectionId, user.sub);
  }

  @Put('agents/:agentId')
  @Roles('manager')
  @ApiOperation({ summary: 'Definir qual conexão de IA o agente usa (null = padrão da organização)' })
  setAgentConnection(
    @Param('tenantId') tenantId: string,
    @Param('agentId') agentId: string,
    @Body() dto: SetAgentAiConnectionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.setAgentConnection(tenantId, agentId, dto.connectionId, user.sub);
  }
}
