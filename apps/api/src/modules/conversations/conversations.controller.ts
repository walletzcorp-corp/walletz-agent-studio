import {
  Controller, Get, Post, Param, Body, Query,
  UseGuards, HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { IsString, MaxLength, IsNotEmpty } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../../shared/rbac/rbac.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ConversationsService } from './conversations.service';

class SendMessageBody {
  @IsString() @IsNotEmpty() @MaxLength(4096)
  text!: string;
}

@ApiTags('conversations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RbacGuard)
@Controller('tenants/:tenantId/conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'agentId', required: false })
  list(
    @Param('tenantId') tenantId: string,
    @Query('status') status?: string,
    @Query('agentId') agentId?: string,
    @Query('limit') limit = 50,
    @Query('offset') offset = 0,
  ) {
    return this.conversationsService.listConversations(tenantId, { status, agentId, limit: +limit, offset: +offset });
  }

  @Get(':conversationId')
  get(
    @Param('tenantId') tenantId: string,
    @Param('conversationId') conversationId: string,
  ) {
    return this.conversationsService.getConversation(tenantId, conversationId);
  }

  @Get(':conversationId/messages')
  getMessages(
    @Param('tenantId') tenantId: string,
    @Param('conversationId') conversationId: string,
  ) {
    return this.conversationsService.getMessages(tenantId, conversationId);
  }

  @Post(':conversationId/messages')
  sendMessage(
    @Param('tenantId') tenantId: string,
    @Param('conversationId') conversationId: string,
    @Body() body: SendMessageBody,
    @CurrentUser('userId') userId: string,
  ) {
    return this.conversationsService.sendHumanMessage(tenantId, conversationId, body.text, userId);
  }

  @Post(':conversationId/assume')
  @HttpCode(200)
  assume(
    @Param('tenantId') tenantId: string,
    @Param('conversationId') conversationId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.conversationsService.assumeConversation(tenantId, conversationId, userId);
  }

  @Post(':conversationId/return-to-ai')
  @HttpCode(200)
  returnToAi(
    @Param('tenantId') tenantId: string,
    @Param('conversationId') conversationId: string,
  ) {
    return this.conversationsService.returnToAi(tenantId, conversationId);
  }

  @Post(':conversationId/resolve')
  @HttpCode(200)
  resolve(
    @Param('tenantId') tenantId: string,
    @Param('conversationId') conversationId: string,
  ) {
    return this.conversationsService.resolveConversation(tenantId, conversationId);
  }
}
