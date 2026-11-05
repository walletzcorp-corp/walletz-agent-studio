import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { FeatureFlagsService } from './feature-flags.service';
import { QuotaService } from './quota.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantSettingsDto } from './dto/update-settings.dto';
import { InviteMemberDto, UpdateMemberRoleDto } from './dto/invite-member.dto';
import { Roles } from '../../shared/rbac/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/auth.service';
import { CurrentTenant } from '../../shared/rbac/tenant-context';
import { Authenticated } from '../../shared/rbac/access-policy.decorators';

@ApiTags('tenants')
@Controller('tenants')
@ApiBearerAuth()
export class TenantsController {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly quotaService: QuotaService,
  ) {}

  @Post()
  @Authenticated()
  @ApiOperation({ summary: 'Criar tenant (onboarding)' })
  async create(@Body() dto: CreateTenantDto, @CurrentUser() user: JwtPayload) {
    return this.tenantsService.create(dto, user.sub);
  }

  @Get('my')
  @Authenticated()
  @ApiOperation({ summary: 'Listar tenants do usuário autenticado' })
  async myTenants(@CurrentUser() user: JwtPayload) {
    return this.tenantsService.getUserTenants(user.sub);
  }

  @Get(':tenantId')
  @Roles('viewer')
  @ApiOperation({ summary: 'Detalhes do tenant' })
  async findOne(@CurrentTenant('tenantId') tenantId: string) {
    return this.tenantsService.findById(tenantId);
  }

  @Patch(':tenantId/settings')
  @Roles('admin')
  @ApiOperation({ summary: 'Atualizar configurações do tenant' })
  async updateSettings(
    @CurrentTenant('tenantId') tenantId: string,
    @Body() dto: UpdateTenantSettingsDto,
  ) {
    return this.tenantsService.updateSettings(tenantId, dto);
  }

  @Get(':tenantId/feature-flags')
  @Roles('viewer')
  @ApiOperation({ summary: 'Feature flags do tenant' })
  async featureFlags(@CurrentTenant('tenantId') tenantId: string) {
    const tenant = await this.tenantsService.findById(tenantId);
    if (!tenant) return {};
    return this.featureFlagsService.getAll(tenant);
  }

  @Get(':tenantId/members')
  @Roles('viewer')
  @ApiOperation({ summary: 'Listar membros do tenant' })
  async getMembers(@CurrentTenant('tenantId') tenantId: string) {
    return this.tenantsService.getMembers(tenantId);
  }

  @Post(':tenantId/members/invite')
  @Roles('admin')
  @ApiOperation({ summary: 'Convidar membro' })
  async inviteMember(
    @CurrentTenant('tenantId') tenantId: string,
    @Body() dto: InviteMemberDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const tenant = await this.tenantsService.findById(tenantId);
    if (tenant) {
      await this.quotaService.assertCanInviteMember(tenantId, tenant.planId ?? 'starter');
    }
    return this.tenantsService.inviteMember(tenantId, dto, user.sub);
  }

  @Patch(':tenantId/members/:membershipId/role')
  @Roles('admin')
  @ApiOperation({ summary: 'Alterar papel do membro' })
  async updateMemberRole(
    @CurrentTenant('tenantId') tenantId: string,
    @Param('membershipId') membershipId: string,
    @Body() body: UpdateMemberRoleDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tenantsService.updateMemberRole(tenantId, membershipId, body.role, user.sub);
  }

  @Delete(':tenantId/members/:membershipId')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover membro' })
  async removeMember(
    @CurrentTenant('tenantId') tenantId: string,
    @Param('membershipId') membershipId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.tenantsService.removeMember(tenantId, membershipId, user.sub);
  }
}
