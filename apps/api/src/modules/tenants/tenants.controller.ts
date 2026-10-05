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
import { FeatureFlagsService } from './feature-flags.service';
import { QuotaService } from './quota.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantSettingsDto } from './dto/update-settings.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../../shared/rbac/rbac.guard';
import { Roles } from '../../shared/rbac/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentTenant } from './decorators/current-tenant.decorator';
import type { JwtPayload } from '../auth/auth.service';
import type { TenantContext } from './decorators/current-tenant.decorator';

@ApiTags('tenants')
@Controller('v1/tenants')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TenantsController {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly quotaService: QuotaService,
  ) {}

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
  @ApiOperation({ summary: 'Feature flags do tenant' })
  async featureFlags(@Param('tenantId') tenantId: string) {
    const tenant = await this.tenantsService.findById(tenantId);
    if (!tenant) return {};
    return this.featureFlagsService.getAll(tenant);
  }

  @Get(':tenantId/members')
  @UseGuards(RbacGuard)
  @Roles('viewer')
  @ApiOperation({ summary: 'Listar membros do tenant' })
  async getMembers(@Param('tenantId') tenantId: string) {
    return this.tenantsService.getMembers(tenantId);
  }

  @Post(':tenantId/members/invite')
  @UseGuards(RbacGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Convidar membro' })
  async inviteMember(
    @Param('tenantId') tenantId: string,
    @Body() dto: InviteMemberDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    const tenant = await this.tenantsService.findById(tenantId);
    if (tenant) {
      await this.quotaService.assertCanInviteMember(tenantId, tenant.planId ?? 'starter');
    }
    return this.tenantsService.inviteMember(tenantId, dto, user.sub);
  }

  @Patch(':tenantId/members/:membershipId/role')
  @UseGuards(RbacGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Alterar papel do membro' })
  async updateMemberRole(
    @Param('tenantId') tenantId: string,
    @Param('membershipId') membershipId: string,
    @Body() body: { role: string },
  ) {
    return this.tenantsService.updateMemberRole(tenantId, membershipId, body.role);
  }

  @Delete(':tenantId/members/:membershipId')
  @UseGuards(RbacGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover membro' })
  async removeMember(
    @Param('tenantId') tenantId: string,
    @Param('membershipId') membershipId: string,
  ) {
    await this.tenantsService.removeMember(tenantId, membershipId);
  }
}
