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
import { Roles } from '../../shared/rbac/roles.decorator';

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
  @ApiOperation({ summary: 'Listar conversas (inbox)' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'agentId', required: false })
  @Roles('viewer')
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
  @ApiOperation({ summary: 'Detalhar conversa (com o motivo da passagem para atendimento humano, se houver)' })
  @Roles('viewer')
  get(
    @Param('tenantId') tenantId: string,
    @Param('conversationId') conversationId: string,
  ) {
    return this.conversationsService.getConversationDetail(tenantId, conversationId);
  }

  @Get(':conversationId/messages')
  @ApiOperation({ summary: 'Listar mensagens da conversa' })
  @Roles('viewer')
  getMessages(
    @Param('tenantId') tenantId: string,
    @Param('conversationId') conversationId: string,
  ) {
    return this.conversationsService.getMessages(tenantId, conversationId);
  }

  @Post(':conversationId/messages')
  @ApiOperation({ summary: 'Enviar mensagem como atendente humano (no WhatsApp, entregue pela Meta; pausa a IA)' })
  @Roles('agent_operator')
  sendMessage(
    @Param('tenantId') tenantId: string,
    @Param('conversationId') conversationId: string,
    @Body() body: SendMessageBody,
    @CurrentUser('userId') userId: string,
  ) {
    return this.conversationsService.sendHumanMessage(tenantId, conversationId, body.text, userId);
  }

  @Post(':conversationId/messages/:messageId/resend')
  @ApiOperation({ summary: 'Reenviar uma resposta que não foi entregue ao cliente (WhatsApp)' })
  @Roles('agent_operator')
  resend(
    @Param('tenantId') tenantId: string,
    @Param('conversationId') conversationId: string,
    @Param('messageId') messageId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.conversationsService.resendMessage(tenantId, conversationId, messageId, userId);
  }

  @Post(':conversationId/assume')
  @ApiOperation({ summary: 'Assumir a conversa (pausa a IA)' })
  @HttpCode(200)
  @Roles('agent_operator')
  assume(
    @Param('tenantId') tenantId: string,
    @Param('conversationId') conversationId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.conversationsService.assumeConversation(tenantId, conversationId, userId);
  }

  @Post(':conversationId/return-to-ai')
  @ApiOperation({ summary: 'Devolver a conversa para a IA' })
  @HttpCode(200)
  @Roles('agent_operator')
  returnToAi(
    @Param('tenantId') tenantId: string,
    @Param('conversationId') conversationId: string,
  ) {
    return this.conversationsService.returnToAi(tenantId, conversationId);
  }

  @Post(':conversationId/resolve')
  @ApiOperation({ summary: 'Marcar conversa como resolvida' })
  @HttpCode(200)
  @Roles('agent_operator')
  resolve(
    @Param('tenantId') tenantId: string,
    @Param('conversationId') conversationId: string,
  ) {
    return this.conversationsService.resolveConversation(tenantId, conversationId);
  }
}
