import {
  Controller, Get, Post, Delete, Param, Body, UseGuards, HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsOptional, IsNotEmpty, IsArray, IsDateString } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../../shared/rbac/rbac.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CampaignsService } from './campaigns.service';

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
@UseGuards(JwtAuthGuard, RbacGuard)
@Controller()
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  // ─── Segments ────────────────────────────────────────────────────────────────

  @Get('tenants/:tenantId/segments')
  listSegments(@Param('tenantId') tenantId: string) {
    return this.campaignsService.listSegments(tenantId);
  }

  @Post('tenants/:tenantId/segments')
  createSegment(
    @Param('tenantId') tenantId: string,
    @Body() body: CreateSegmentBody,
    @CurrentUser('userId') userId: string,
  ) {
    return this.campaignsService.createSegment(tenantId, userId, body);
  }

  @Delete('tenants/:tenantId/segments/:segmentId')
  @HttpCode(204)
  deleteSegment(
    @Param('tenantId') tenantId: string,
    @Param('segmentId') segmentId: string,
  ) {
    return this.campaignsService.deleteSegment(tenantId, segmentId);
  }

  // ─── Campaigns ───────────────────────────────────────────────────────────────

  @Get('tenants/:tenantId/campaigns')
  listCampaigns(@Param('tenantId') tenantId: string) {
    return this.campaignsService.listCampaigns(tenantId);
  }

  @Get('tenants/:tenantId/campaigns/:campaignId')
  getCampaign(
    @Param('tenantId') tenantId: string,
    @Param('campaignId') campaignId: string,
  ) {
    return this.campaignsService.getCampaign(tenantId, campaignId);
  }

  @Post('tenants/:tenantId/campaigns')
  createCampaign(
    @Param('tenantId') tenantId: string,
    @Body() body: CreateCampaignBody,
    @CurrentUser('userId') userId: string,
  ) {
    return this.campaignsService.createCampaign(tenantId, userId, body);
  }

  @Get('tenants/:tenantId/campaigns/:campaignId/eligibility')
  @ApiOperation({ summary: 'Send Policy Gateway — check eligible recipients' })
  checkEligibility(
    @Param('tenantId') tenantId: string,
    @Param('campaignId') campaignId: string,
  ) {
    return this.campaignsService.checkEligibility(tenantId, campaignId);
  }

  @Post('tenants/:tenantId/campaigns/:campaignId/launch')
  @HttpCode(200)
  @ApiOperation({ summary: 'Launch campaign after policy check' })
  launchCampaign(
    @Param('tenantId') tenantId: string,
    @Param('campaignId') campaignId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.campaignsService.launchCampaign(tenantId, campaignId, userId);
  }
}
