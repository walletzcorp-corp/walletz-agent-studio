import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../../shared/rbac/rbac.guard';
import { Roles } from '../../shared/rbac/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PrivacyService } from './privacy.service';

class RevokeConsentDto {
  @IsString() @IsNotEmpty() channel!: string;
  @IsString() @IsNotEmpty() purpose!: string;
}

class AnonymizeDto {
  @IsString() @IsOptional() reason?: string;
}

@ApiTags('privacy')
@Controller()
@UseGuards(JwtAuthGuard, RbacGuard)
@ApiBearerAuth()
export class PrivacyController {
  constructor(private readonly privacyService: PrivacyService) {}

  // ─── LGPD Art. 18 I — Portabilidade / Acesso ──────────────────────────────

  @Get('tenants/:tenantId/privacy/contacts/:contactId/export')
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'LGPD Art. 18 I — Export all data for a data subject' })
  exportContactData(
    @Param('tenantId') tenantId: string,
    @Param('contactId') contactId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.privacyService.exportContactData(tenantId, contactId, userId);
  }

  // ─── LGPD Art. 18 VI — Anonimização / Exclusão ───────────────────────────

  @Delete('tenants/:tenantId/privacy/contacts/:contactId')
  @Roles('admin', 'owner')
  @HttpCode(200)
  @ApiOperation({ summary: 'LGPD Art. 18 VI — Anonymize contact (right to erasure)' })
  anonymizeContact(
    @Param('tenantId') tenantId: string,
    @Param('contactId') contactId: string,
    @Body() dto: AnonymizeDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.privacyService.anonymizeContact(
      tenantId,
      contactId,
      userId,
      dto.reason ?? 'user_request',
    );
  }

  // ─── LGPD — Consentimentos ────────────────────────────────────────────────

  @Get('tenants/:tenantId/privacy/consents')
  @Roles('viewer')
  @ApiOperation({ summary: 'List all consent records for tenant' })
  listConsents(
    @Param('tenantId') tenantId: string,
    @Query('channel') channel?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.privacyService.listConsentsByTenant(tenantId, {
      channel,
      status,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  // ─── LGPD Art. 15 I — Revogação de consentimento ─────────────────────────

  @Post('tenants/:tenantId/privacy/contacts/:contactId/revoke-consent')
  @Roles('admin', 'owner')
  @HttpCode(204)
  @ApiOperation({ summary: 'LGPD Art. 15 I — Revoke consent for a data subject' })
  async revokeConsent(
    @Param('tenantId') tenantId: string,
    @Param('contactId') contactId: string,
    @Body() dto: RevokeConsentDto,
    @CurrentUser('userId') userId: string,
  ): Promise<void> {
    await this.privacyService.revokeConsent(tenantId, contactId, dto.channel, dto.purpose, userId);
  }
}
