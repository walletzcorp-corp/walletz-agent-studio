import { Controller, Get, Post, Param, Body, Query, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { IsString, MaxLength, IsNotEmpty } from 'class-validator';
import { Roles } from '../../shared/rbac/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ConversationsService } from './conversations.service';
import { parsePaging } from '../../shared/http/paging';
import { CurrentTenant } from '../../shared/rbac/tenant-context';

class SendMessageBody {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  text!: string;
}

@ApiTags('conversations')
@ApiBearerAuth()
@Controller('tenants/:tenantId/conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  @Roles('viewer')
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'agentId', required: false })
  list(
    @CurrentTenant('tenantId') tenantId: string,
    @Query('status') status?: string,
    @Query('agentId') agentId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.conversationsService.listConversations(tenantId, {
      status,
      agentId,
      ...parsePaging(limit, offset),
    });
  }

  @Get(':conversationId')
  @Roles('viewer')
  get(
    @CurrentTenant('tenantId') tenantId: string,
    @Param('conversationId') conversationId: string,
  ) {
    return this.conversationsService.getConversation(tenantId, conversationId);
  }

  @Get(':conversationId/messages')
  @Roles('viewer')
  getMessages(
    @CurrentTenant('tenantId') tenantId: string,
    @Param('conversationId') conversationId: string,
  ) {
    return this.conversationsService.getMessages(tenantId, conversationId);
  }

  @Post(':conversationId/messages')
  @Roles('agent_operator')
  sendMessage(
    @CurrentTenant('tenantId') tenantId: string,
    @Param('conversationId') conversationId: string,
    @Body() body: SendMessageBody,
    @CurrentUser('userId') userId: string,
  ) {
    return this.conversationsService.sendHumanMessage(tenantId, conversationId, body.text, userId);
  }

  @Post(':conversationId/assume')
  @Roles('agent_operator')
  @HttpCode(200)
  assume(
    @CurrentTenant('tenantId') tenantId: string,
    @Param('conversationId') conversationId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.conversationsService.assumeConversation(tenantId, conversationId, userId);
  }

  @Post(':conversationId/return-to-ai')
  @Roles('agent_operator')
  @HttpCode(200)
  returnToAi(
    @CurrentTenant('tenantId') tenantId: string,
    @Param('conversationId') conversationId: string,
  ) {
    return this.conversationsService.returnToAi(tenantId, conversationId);
  }

  @Post(':conversationId/resolve')
  @Roles('agent_operator')
  @HttpCode(200)
  resolve(
    @CurrentTenant('tenantId') tenantId: string,
    @Param('conversationId') conversationId: string,
  ) {
    return this.conversationsService.resolveConversation(tenantId, conversationId);
  }
}
