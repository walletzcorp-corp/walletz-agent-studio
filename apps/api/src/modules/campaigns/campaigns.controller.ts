import { Controller, Get, Post, Delete, Param, Body, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsOptional, IsNotEmpty, IsArray, IsDateString } from 'class-validator';
import { Roles } from '../../shared/rbac/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CampaignsService } from './campaigns.service';
import { CurrentTenant } from '../../shared/rbac/tenant-context';

class CreateSegmentBody {
  @IsString() @IsNotEmpty() name!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() filters?: Record<string, unknown>;
}

class CreateCampaignBody {
  @IsString() @IsNotEmpty() name!: string;
  @IsOptional() @IsString() agentId?: string;
  @IsOptional() @IsString() segmentId?: string;
  @IsOptional() @IsString() objective?: string;
  @IsOptional() @IsString() channel?: string;
  @IsOptional() @IsString() templateName?: string;
  @IsOptional() @IsString() templateLanguage?: string;
  @IsOptional() @IsArray() templateComponents?: unknown[];
  @IsOptional() @IsDateString() scheduledAt?: string;
}

@ApiTags('campaigns')
@ApiBearerAuth()
@Controller()
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  // ─── Segments ────────────────────────────────────────────────────────────────

  @Get('tenants/:tenantId/segments')
  @Roles('viewer')
  listSegments(@CurrentTenant('tenantId') tenantId: string) {
    return this.campaignsService.listSegments(tenantId);
  }

  @Post('tenants/:tenantId/segments')
  @Roles('manager')
  createSegment(
    @CurrentTenant('tenantId') tenantId: string,
    @Body() body: CreateSegmentBody,
    @CurrentUser('userId') userId: string,
  ) {
    return this.campaignsService.createSegment(tenantId, userId, body);
  }

  @Delete('tenants/:tenantId/segments/:segmentId')
  @Roles('admin')
  @HttpCode(204)
  deleteSegment(
    @CurrentTenant('tenantId') tenantId: string,
    @Param('segmentId') segmentId: string,
  ) {
    return this.campaignsService.deleteSegment(tenantId, segmentId);
  }

  // ─── Campaigns ───────────────────────────────────────────────────────────────

  @Get('tenants/:tenantId/campaigns')
  @Roles('viewer')
  listCampaigns(@CurrentTenant('tenantId') tenantId: string) {
    return this.campaignsService.listCampaigns(tenantId);
  }

  @Get('tenants/:tenantId/campaigns/:campaignId')
  @Roles('viewer')
  getCampaign(
    @CurrentTenant('tenantId') tenantId: string,
    @Param('campaignId') campaignId: string,
  ) {
    return this.campaignsService.getCampaign(tenantId, campaignId);
  }

  @Post('tenants/:tenantId/campaigns')
  @Roles('manager')
  createCampaign(
    @CurrentTenant('tenantId') tenantId: string,
    @Body() body: CreateCampaignBody,
    @CurrentUser('userId') userId: string,
  ) {
    return this.campaignsService.createCampaign(tenantId, userId, body);
  }

  @Get('tenants/:tenantId/campaigns/:campaignId/eligibility')
  @Roles('manager')
  @ApiOperation({ summary: 'Send Policy Gateway — check eligible recipients' })
  checkEligibility(
    @CurrentTenant('tenantId') tenantId: string,
    @Param('campaignId') campaignId: string,
  ) {
    return this.campaignsService.checkEligibility(tenantId, campaignId);
  }

  @Post('tenants/:tenantId/campaigns/:campaignId/launch')
  @Roles('admin')
  @HttpCode(200)
  @ApiOperation({ summary: 'Launch campaign after policy check' })
  launchCampaign(
    @CurrentTenant('tenantId') tenantId: string,
    @Param('campaignId') campaignId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.campaignsService.launchCampaign(tenantId, campaignId, userId);
  }
}
