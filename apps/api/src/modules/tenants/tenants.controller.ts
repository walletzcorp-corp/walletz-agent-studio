import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express';
import { TenantsService } from './tenants.service';
import { PlanLimitsService } from '../../shared/plans/plan-limits.service';
import { PLAN_CATALOG, PLAN_SLUGS } from '../../shared/plans/plan-catalog';
import { LlmUsageService } from '../../shared/llm-usage/llm-usage.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantSettingsDto } from './dto/update-settings.dto';
import { AddMemberDto, UpdateMemberRoleDto } from './dto/invite-member.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../../shared/rbac/rbac.guard';
import { Roles } from '../../shared/rbac/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentTenant } from './decorators/current-tenant.decorator';
import type { JwtPayload } from '../auth/auth.service';
import type { TenantContext } from './decorators/current-tenant.decorator';

@ApiTags('tenants')
@Controller('tenants')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TenantsController {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly planLimits: PlanLimitsService,
    private readonly llmUsage: LlmUsageService,
  ) {}

  @Get('plans/catalog')
  @ApiOperation({ summary: 'Catálogo de planos comerciais (v4.2). Nenhum plano inclui tokens de IA.' })
  plansCatalog() {
    return PLAN_SLUGS.map((slug) => PLAN_CATALOG[slug]);
  }

  @Post()
  @ApiOperation({ summary: 'Criar tenant (onboarding)' })
  async create(@Body() dto: CreateTenantDto, @CurrentUser() user: JwtPayload) {
    return this.tenantsService.create(dto, user.sub);
  }

  @Get('my')
  @ApiOperation({ summary: 'Listar tenants do usuário autenticado' })
  async myTenants(@CurrentUser() user: JwtPayload) {
    return this.tenantsService.getUserTenants(user.sub);
  }

  @Get(':tenantId')
  @UseGuards(RbacGuard)
  @Roles('viewer')
  @ApiOperation({ summary: 'Detalhes do tenant' })
  async findOne(@Param('tenantId') tenantId: string) {
    return this.tenantsService.findById(tenantId);
  }

  @Patch(':tenantId/settings')
  @UseGuards(RbacGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Atualizar configurações do tenant' })
  async updateSettings(
    @Param('tenantId') tenantId: string,
    @Body() dto: UpdateTenantSettingsDto,
  ) {
    return this.tenantsService.updateSettings(tenantId, dto);
  }

  @Get(':tenantId/feature-flags')
  @UseGuards(RbacGuard)
  @Roles('viewer')
  @ApiOperation({ summary: 'Recursos liberados para a organização (plano + exceções)' })
  async featureFlags(@Param('tenantId') tenantId: string) {
    return (await this.planLimits.getSummary(tenantId)).enabledFeatures;
  }

  @Get(':tenantId/plan')
  @UseGuards(RbacGuard)
  @Roles('viewer')
  @ApiOperation({ summary: 'Plano da organização, uso de cada limite e recursos liberados' })
  async plan(@Param('tenantId') tenantId: string) {
    const [summary, aiTokensMonth] = await Promise.all([
      this.planLimits.getSummary(tenantId),
      this.llmUsage.getMonthTokens(tenantId),
    ]);
    // Consumo técnico (tokens) só para acompanhamento: o custo é cobrado pelo provedor do cliente.
    return { ...summary, aiTokensMonth };
  }

  @Get(':tenantId/members')
  @UseGuards(RbacGuard)
  @Roles('viewer')
  @ApiOperation({ summary: 'Listar membros do tenant' })
  async getMembers(@Param('tenantId') tenantId: string) {
    return this.tenantsService.getMembers(tenantId);
  }

  @Post(':tenantId/members')
  @UseGuards(RbacGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Adicionar usuário à organização (login novo, exclusivo desta organização)' })
  async addMember(
    @Param('tenantId') tenantId: string,
    @Body() dto: AddMemberDto,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.planLimits.assertCanAdd(tenantId, 'users');
    return this.tenantsService.addMember(tenantId, dto, user.sub);
  }

  @Patch(':tenantId/members/:membershipId/role')
  @UseGuards(RbacGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Alterar papel do membro (o dono não muda)' })
  async updateMemberRole(
    @Param('tenantId') tenantId: string,
    @Param('membershipId') membershipId: string,
    @Body() dto: UpdateMemberRoleDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tenantsService.updateMemberRole(tenantId, membershipId, dto.role, user.sub);
  }

  @Delete(':tenantId/members/:membershipId')
  @UseGuards(RbacGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover membro' })
  async removeMember(
    @Param('tenantId') tenantId: string,
    @Param('membershipId') membershipId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.tenantsService.removeMember(tenantId, membershipId, user.sub);
  }
}
