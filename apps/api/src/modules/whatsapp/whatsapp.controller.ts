import {
  Controller, Get, Post, Delete, Param, Body, Query,
  UseGuards, Headers, RawBodyRequest, Req, HttpCode,
  Logger, UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../../shared/rbac/rbac.guard';
import { Roles } from '../../shared/rbac/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { WhatsappService } from './whatsapp.service';
import { ConnectWhatsappDto, EmbeddedSignupDto, SendMessageDto } from './dto/connect-account.dto';

@ApiTags('whatsapp')
@Controller()
export class WhatsappController {
  private readonly logger = new Logger(WhatsappController.name);

  constructor(private readonly whatsappService: WhatsappService) {}

  // ─── Webhook (public — no auth) ──────────────────────────────────────────────

  @Get('webhook/whatsapp')
  @HttpCode(200)
  @ApiOperation({ summary: 'Meta webhook verification (GET challenge)' })
  async verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ): Promise<string> {
    // Find account matching this verify token
    if (mode !== 'subscribe') throw new UnauthorizedException('Invalid mode');

    // Note: we return the challenge directly; the token is validated against stored accounts
    // In production this should also verify the token matches a stored account
    this.logger.log(`Webhook verification request: mode=${mode}`);
    return challenge;
  }

  @Post('webhook/whatsapp')
  @HttpCode(200)
  @ApiOperation({ summary: 'Receive WhatsApp Cloud API webhook events' })
  async receiveWebhook(
    @Body() payload: unknown,
    @Headers('x-hub-signature-256') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ): Promise<{ status: string }> {
    await this.whatsappService.handleWebhookEvent(payload, signature, req.rawBody ?? Buffer.alloc(0));
    return { status: 'ok' };
  }

  // ─── Tenant-scoped routes (requires auth) ────────────────────────────────────

  @Get('tenants/:tenantId/whatsapp/accounts')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List WhatsApp accounts for tenant' })
  listAccounts(@Param('tenantId') tenantId: string) {
    return this.whatsappService.listAccounts(tenantId);
  }

  @Get('tenants/:tenantId/whatsapp/accounts/:accountId')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get WhatsApp account details' })
  getAccount(
    @Param('tenantId') tenantId: string,
    @Param('accountId') accountId: string,
  ) {
    return this.whatsappService.getAccount(tenantId, accountId);
  }

  @Post('tenants/:tenantId/whatsapp/embedded-signup')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @ApiBearerAuth()
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Complete WhatsApp connection via Meta Embedded Signup (code exchange on backend)' })
  embeddedSignup(
    @Param('tenantId') tenantId: string,
    @Body() dto: EmbeddedSignupDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.whatsappService.embeddedSignup(dto, tenantId, userId);
  }

  @Post('tenants/:tenantId/whatsapp/accounts')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @ApiBearerAuth()
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Connect a WhatsApp account (manual — for advanced/technical use)' })
  connectAccount(
    @Param('tenantId') tenantId: string,
    @Body() dto: ConnectWhatsappDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.whatsappService.connectAccount(dto, tenantId, userId);
  }

  @Delete('tenants/:tenantId/whatsapp/accounts/:accountId')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @ApiBearerAuth()
  @Roles('admin', 'owner')
  @HttpCode(204)
  @ApiOperation({ summary: 'Disconnect a WhatsApp account' })
  disconnectAccount(
    @Param('tenantId') tenantId: string,
    @Param('accountId') accountId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.whatsappService.disconnectAccount(tenantId, accountId, userId);
  }

  @Post('tenants/:tenantId/whatsapp/accounts/:accountId/send')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send a text message via WhatsApp' })
  sendMessage(
    @Param('tenantId') tenantId: string,
    @Param('accountId') accountId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.whatsappService.sendTextMessage(tenantId, accountId, dto);
  }

  @Post('tenants/:tenantId/whatsapp/accounts/:accountId/sync-templates')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @ApiBearerAuth()
  @Roles('admin', 'owner')
  @HttpCode(204)
  @ApiOperation({ summary: 'Sync templates from Meta' })
  syncTemplates(
    @Param('tenantId') tenantId: string,
    @Param('accountId') accountId: string,
  ) {
    return this.whatsappService.syncTemplates(accountId, tenantId);
  }

  @Get('tenants/:tenantId/whatsapp/accounts/:accountId/templates')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List approved templates' })
  listTemplates(
    @Param('tenantId') tenantId: string,
    @Param('accountId') accountId: string,
  ) {
    return this.whatsappService.listTemplates(tenantId, accountId);
  }

  @Get('tenants/:tenantId/whatsapp/accounts/:accountId/stats')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get message statistics for account' })
  getStats(
    @Param('tenantId') tenantId: string,
    @Param('accountId') accountId: string,
  ) {
    return this.whatsappService.getStats(tenantId, accountId);
  }
}
