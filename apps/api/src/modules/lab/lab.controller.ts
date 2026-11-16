import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../../shared/rbac/roles.decorator';
import { LabService } from './lab.service';
import { LabConversationsService } from './lab-conversations.service';
import { CurrentTenant, type TenantContext } from '../../shared/rbac/tenant-context';
import { createExecutionContext } from '../agents/execution-context';
import {
  CreateLabConversationDto,
  RenameLabConversationDto,
  LabChatWithConversationDto,
} from './dto/conversation.dto';

@ApiTags('lab')
@ApiBearerAuth()
@Controller('tenants/:tenantId/lab')
export class LabController {
  constructor(
    private readonly labService: LabService,
    private readonly labConversations: LabConversationsService,
  ) {}

  /* ── Conversations ── */

  @Get('conversations')
  @Roles('manager')
  @ApiOperation({ summary: 'List lab conversations for the current user' })
  listConversations(@CurrentTenant() tenant: TenantContext) {
    return this.labConversations.list(tenant);
  }

  @Get('conversations/:id')
  @Roles('manager')
  @ApiOperation({ summary: 'Get lab conversation with messages' })
  getConversation(@Param('id') id: string, @CurrentTenant() tenant: TenantContext) {
    return this.labConversations.get(id, tenant);
  }

  @Post('conversations')
  @Roles('manager')
  @ApiOperation({ summary: 'Create a new lab conversation' })
  createConversation(
    @Body() dto: CreateLabConversationDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.labConversations.create(dto.agentId, tenant);
  }

  @Patch('conversations/:id/title')
  @Roles('manager')
  @HttpCode(200)
  @ApiOperation({ summary: 'Rename a lab conversation' })
  async renameConversation(
    @Param('id') id: string,
    @Body() dto: RenameLabConversationDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    await this.labConversations.rename(id, dto.title, tenant);
    return { ok: true };
  }

  @Delete('conversations/:id')
  @Roles('manager')
  @HttpCode(200)
  @ApiOperation({ summary: 'Delete a lab conversation' })
  async deleteConversation(
    @Param('id') id: string,
    @CurrentTenant() tenant: TenantContext,
  ) {
    await this.labConversations.delete(id, tenant);
    return { ok: true };
  }

  /* ── Chat ── */

  @Post('chat')
  @Roles('manager')
  @HttpCode(200)
  @ApiOperation({ summary: 'Send a message in a lab conversation (creates one if needed)' })
  async chat(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: LabChatWithConversationDto,
  ) {
    let conversationId = dto.conversationId;

    // Create conversation on-the-fly when not provided (backward compat)
    if (!conversationId) {
      const created = await this.labConversations.create(dto.agentId, tenant);
      conversationId = created.id;
    } else {
      await this.labConversations.requireOwnership(conversationId, tenant);
    }

    const ctx = createExecutionContext({
      tenantId: tenant.tenantId,
      agentId: dto.agentId,
      channel: 'lab',
      source: 'internal_user',
      userId: tenant.userId,
    });

    // Load persisted context for the LLM (last N messages)
    const history = await this.labConversations.getContextMessages(conversationId, tenant);

    const result = await this.labService.chatWithHistory(dto, history, ctx);

    // Persist both turns
    await this.labConversations.saveUserMessage(conversationId, dto.message, tenant);
    await this.labConversations.saveAssistantMessage(
      conversationId,
      result.reply,
      {
        traceId: result.traceId,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        retrievedChunks: result.retrievedChunks,
        toolCallsExecuted: result.toolCallsExecuted,
      },
      tenant,
    );

    // Auto-title: set title from first user message if still default
    if (history.length === 0) {
      await this.labConversations.autoTitle(conversationId, dto.message, ctx.agentId);
    }

    return { ...result, conversationId };
  }
}
