import {
  Controller, Get, Post, Delete, Param, Body, Query,
  UseGuards, Headers, RawBodyRequest, Req, HttpCode, Logger, Patch, Put,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../../shared/rbac/rbac.guard';
import { Roles } from '../../shared/rbac/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { WhatsappService } from './whatsapp.service';
import { ConnectWhatsappDto, EmbeddedSignupDto, SendMessageDto, UpdateWhatsappCredentialsDto, SetWhatsappAgentDto } from './dto/connect-account.dto';
import { PlanExempt, RequiresFeature } from '../../shared/plans/requires-feature.decorator';

@ApiTags('whatsapp')
@RequiresFeature('whatsapp')
@Controller()
export class WhatsappController {
  private readonly logger = new Logger(WhatsappController.name);

  constructor(private readonly whatsappService: WhatsappService) {}

  // ─── Webhook (public — no auth) ──────────────────────────────────────────────

  @Get('webhook/whatsapp')
  @HttpCode(200)
  @ApiOperation({ summary: 'Meta webhook verification (GET challenge)' })
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ): string {
    this.logger.log(`Webhook verification request: mode=${mode}`);
    return this.whatsappService.verifyWebhook(mode, challenge, token);
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

  @Get('webhook/whatsapp/:accountId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Verificação do webhook exclusivo de um número (app Meta do cliente)' })
  verifyAccountWebhook(
    @Param('accountId') accountId: string,
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ): Promise<string> {
    return this.whatsappService.verifyAccountWebhook(accountId, mode, challenge, token);
  }

  @Post('webhook/whatsapp/:accountId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Eventos do webhook exclusivo de um número (assinados com o App Secret do cliente)' })
  async receiveAccountWebhook(
    @Param('accountId') accountId: string,
    @Body() payload: unknown,
    @Headers('x-hub-signature-256') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ): Promise<{ status: string }> {
    await this.whatsappService.handleAccountWebhook(accountId, payload, signature, req.rawBody ?? Buffer.alloc(0));
    return { status: 'ok' };
  }

  // ─── Tenant-scoped routes (requires auth) ────────────────────────────────────

  @Get('tenants/:tenantId/whatsapp/accounts')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List WhatsApp accounts for tenant' })
  @Roles('viewer')
  @PlanExempt()
  listAccounts(@Param('tenantId') tenantId: string) {
    return this.whatsappService.listAccounts(tenantId).then((rows) => rows.map((r) => this.whatsappService.toView(r)));
  }

  @Get('tenants/:tenantId/whatsapp/accounts/:accountId')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get WhatsApp account details' })
  @Roles('viewer')
  @PlanExempt()
  getAccount(
    @Param('tenantId') tenantId: string,
    @Param('accountId') accountId: string,
  ) {
    return this.whatsappService.getAccount(tenantId, accountId).then((r) => this.whatsappService.toView(r));
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
    return this.whatsappService.embeddedSignup(dto, tenantId, userId).then((r) => this.whatsappService.toView(r));
  }

  @Post('tenants/:tenantId/whatsapp/accounts')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @ApiBearerAuth()
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Conectar número com o app Meta do próprio cliente (token permanente + App Secret, validados na Meta)' })
  connectAccount(
    @Param('tenantId') tenantId: string,
    @Body() dto: ConnectWhatsappDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.whatsappService.connectAccount(dto, tenantId, userId);
  }

  @Get('tenants/:tenantId/whatsapp/accounts/:accountId/webhook-setup')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @ApiBearerAuth()
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Callback URL e token de verificação para colar no app Meta do cliente' })
  webhookSetup(@Param('tenantId') tenantId: string, @Param('accountId') accountId: string) {
    return this.whatsappService.webhookSetup(tenantId, accountId);
  }

  @Put('tenants/:tenantId/whatsapp/accounts/:accountId/credentials')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @ApiBearerAuth()
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Trocar token e/ou App Secret (validados na Meta antes de substituir)' })
  updateCredentials(
    @Param('tenantId') tenantId: string,
    @Param('accountId') accountId: string,
    @Body() dto: UpdateWhatsappCredentialsDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.whatsappService.updateCredentials(tenantId, accountId, dto, userId);
  }

  @Patch('tenants/:tenantId/whatsapp/accounts/:accountId/agent')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @ApiBearerAuth()
  @Roles('manager')
  @ApiOperation({ summary: 'Definir o agente que responde neste número' })
  setAgent(
    @Param('tenantId') tenantId: string,
    @Param('accountId') accountId: string,
    @Body() dto: SetWhatsappAgentDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.whatsappService.setAccountAgent(tenantId, accountId, dto.agentId, userId);
  }

  @Post('tenants/:tenantId/whatsapp/accounts/:accountId/reconnect')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @ApiBearerAuth()
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Reconnect WhatsApp account (renew token via Embedded Signup)' })
  reconnectAccount(
    @Param('tenantId') tenantId: string,
    @Param('accountId') accountId: string,
    @Body() dto: EmbeddedSignupDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.whatsappService.reconnectAccount(accountId, dto, tenantId, userId).then((r) => this.whatsappService.toView(r));
  }

  @Delete('tenants/:tenantId/whatsapp/accounts/:accountId')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @ApiBearerAuth()
  @Roles('admin', 'owner')
  @HttpCode(204)
  @ApiOperation({ summary: 'Disconnect a WhatsApp account' })
  @PlanExempt()
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
  @Roles('admin')
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
  @Roles('viewer')
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
  @Roles('viewer')
  getStats(
    @Param('tenantId') tenantId: string,
    @Param('accountId') accountId: string,
  ) {
    return this.whatsappService.getStats(tenantId, accountId);
  }
}
