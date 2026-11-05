import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  Query,
  Headers,
  RawBodyRequest,
  Req,
  HttpCode,
  Logger,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../../shared/rbac/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { WhatsappService } from './whatsapp.service';
import {
  AssignAgentDto,
  ConnectWhatsappDto,
  EmbeddedSignupDto,
  SendMessageDto,
} from './dto/connect-account.dto';
import { CurrentTenant } from '../../shared/rbac/tenant-context';
import { Public } from '../../shared/rbac/access-policy.decorators';

@ApiTags('whatsapp')
@Controller()
export class WhatsappController {
  private readonly logger = new Logger(WhatsappController.name);

  constructor(private readonly whatsappService: WhatsappService) {}

  // ─── Webhook (public — no auth) ──────────────────────────────────────────────

  @Get('webhook/whatsapp')
  @Public('Meta verify token (GET challenge)')
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
  @Public('Assinatura HMAC x-hub-signature-256 da Meta + conta resolvida por phone_number_id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Receive WhatsApp Cloud API webhook events' })
  async receiveWebhook(
    @Body() payload: unknown,
    @Headers('x-hub-signature-256') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ): Promise<{ status: string }> {
    await this.whatsappService.handleWebhookEvent(
      payload,
      signature,
      req.rawBody ?? Buffer.alloc(0),
    );
    return { status: 'ok' };
  }

  // ─── Tenant-scoped routes (requires auth) ────────────────────────────────────

  @Get('tenants/:tenantId/whatsapp/accounts')
  @ApiBearerAuth()
  @Roles('viewer')
  @ApiOperation({ summary: 'List WhatsApp accounts for tenant' })
  listAccounts(@CurrentTenant('tenantId') tenantId: string) {
    return this.whatsappService.listAccounts(tenantId);
  }

  @Get('tenants/:tenantId/whatsapp/accounts/:accountId')
  @ApiBearerAuth()
  @Roles('viewer')
  @ApiOperation({ summary: 'Get WhatsApp account details' })
  getAccount(@CurrentTenant('tenantId') tenantId: string, @Param('accountId') accountId: string) {
    return this.whatsappService.getAccount(tenantId, accountId);
  }

  @Post('tenants/:tenantId/whatsapp/embedded-signup')
  @ApiBearerAuth()
  @Roles('admin', 'owner')
  @ApiOperation({
    summary: 'Complete WhatsApp connection via Meta Embedded Signup (code exchange on backend)',
  })
  embeddedSignup(
    @CurrentTenant('tenantId') tenantId: string,
    @Body() dto: EmbeddedSignupDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.whatsappService.embeddedSignup(dto, tenantId, userId);
  }

  @Post('tenants/:tenantId/whatsapp/accounts')
  @ApiBearerAuth()
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Connect a WhatsApp account (manual — for advanced/technical use)' })
  connectAccount(
    @CurrentTenant('tenantId') tenantId: string,
    @Body() dto: ConnectWhatsappDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.whatsappService.connectAccount(dto, tenantId, userId);
  }

  @Post('tenants/:tenantId/whatsapp/accounts/:accountId/reconnect')
  @ApiBearerAuth()
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Reconnect WhatsApp account (renew token via Embedded Signup)' })
  reconnectAccount(
    @CurrentTenant('tenantId') tenantId: string,
    @Param('accountId') accountId: string,
    @Body() dto: EmbeddedSignupDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.whatsappService.reconnectAccount(accountId, dto, tenantId, userId);
  }

  @Patch('tenants/:tenantId/whatsapp/accounts/:accountId/agent')
  @ApiBearerAuth()
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Assign the published agent that answers on this WhatsApp number' })
  assignAgent(
    @CurrentTenant('tenantId') tenantId: string,
    @Param('accountId') accountId: string,
    @Body() dto: AssignAgentDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.whatsappService.assignAgent(tenantId, accountId, dto.agentId, userId);
  }

  @Delete('tenants/:tenantId/whatsapp/accounts/:accountId')
  @ApiBearerAuth()
  @Roles('admin', 'owner')
  @HttpCode(204)
  @ApiOperation({ summary: 'Disconnect a WhatsApp account' })
  disconnectAccount(
    @CurrentTenant('tenantId') tenantId: string,
    @Param('accountId') accountId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.whatsappService.disconnectAccount(tenantId, accountId, userId);
  }

  @Post('tenants/:tenantId/whatsapp/accounts/:accountId/send')
  @ApiBearerAuth()
  @Roles('agent_operator')
  @ApiOperation({ summary: 'Send a text message via WhatsApp' })
  sendMessage(
    @CurrentTenant('tenantId') tenantId: string,
    @Param('accountId') accountId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.whatsappService.sendTextMessage(tenantId, accountId, dto);
  }

  @Post('tenants/:tenantId/whatsapp/accounts/:accountId/sync-templates')
  @ApiBearerAuth()
  @Roles('admin', 'owner')
  @HttpCode(204)
  @ApiOperation({ summary: 'Sync templates from Meta' })
  syncTemplates(
    @CurrentTenant('tenantId') tenantId: string,
    @Param('accountId') accountId: string,
  ) {
    return this.whatsappService.syncTemplates(accountId, tenantId);
  }

  @Get('tenants/:tenantId/whatsapp/accounts/:accountId/templates')
  @ApiBearerAuth()
  @Roles('viewer')
  @ApiOperation({ summary: 'List approved templates' })
  listTemplates(
    @CurrentTenant('tenantId') tenantId: string,
    @Param('accountId') accountId: string,
  ) {
    return this.whatsappService.listTemplates(tenantId, accountId);
  }

  @Get('tenants/:tenantId/whatsapp/accounts/:accountId/stats')
  @ApiBearerAuth()
  @Roles('viewer')
  @ApiOperation({ summary: 'Get message statistics for account' })
  getStats(@CurrentTenant('tenantId') tenantId: string, @Param('accountId') accountId: string) {
    return this.whatsappService.getStats(tenantId, accountId);
  }
}
