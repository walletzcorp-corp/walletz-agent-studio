import {
  Controller, Post, Get, Patch, Delete, Body, Param, Query, UseGuards,
  HttpCode, HttpStatus, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../../shared/rbac/rbac.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { LabService } from './lab.service';
import { LabChatDto, CreateLabConversationDto, UpdateLabConversationDto } from './dto/chat.dto';

@ApiTags('lab')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RbacGuard)
@Controller('tenants/:tenantId/lab')
export class LabController {
  constructor(private readonly labService: LabService) {}

  /* ── Gestão de conversas ──────────────────────────────────────────────────── */

  @Post('conversations')
  @ApiOperation({ summary: 'Create a new lab conversation' })
  createConversation(
    @Param('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateLabConversationDto,
  ) {
    return this.labService.createConversation(tenantId, userId, dto);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'List lab conversations (optionally filtered by agent)' })
  @ApiQuery({ name: 'agentId', required: false })
  @ApiQuery({ name: 'limit', required: false })
  listConversations(
    @Param('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Query('agentId') agentId?: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    return this.labService.listConversations(tenantId, userId, agentId, limit);
  }

  @Get('conversations/latest')
  @ApiOperation({ summary: 'Get the latest lab conversation for an agent' })
  @ApiQuery({ name: 'agentId', required: true })
  getLatestConversation(
    @Param('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Query('agentId') agentId: string,
  ) {
    return this.labService.getLatestConversation(tenantId, userId, agentId);
  }

  @Get('conversations/:conversationId')
  @ApiOperation({ summary: 'Get a lab conversation with all messages' })
  getConversation(
    @Param('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Param('conversationId') conversationId: string,
  ) {
    return this.labService.getConversation(tenantId, userId, conversationId);
  }

  @Patch('conversations/:conversationId')
  @ApiOperation({ summary: 'Update lab conversation (e.g. rename title)' })
  updateConversation(
    @Param('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Param('conversationId') conversationId: string,
    @Body() dto: UpdateLabConversationDto,
  ) {
    return this.labService.updateConversation(tenantId, userId, conversationId, dto);
  }

  @Delete('conversations/:conversationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a lab conversation' })
  deleteConversation(
    @Param('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Param('conversationId') conversationId: string,
  ) {
    return this.labService.deleteConversation(tenantId, userId, conversationId);
  }

  /* ── Chat ─────────────────────────────────────────────────────────────────── */

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a message in the lab (auto-creates conversation if needed)' })
  chat(
    @Param('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: LabChatDto,
  ) {
    return this.labService.chat(dto, tenantId, userId, {
      conversationId: dto.conversationId,
      contactId: dto.contactId,
    });
  }
}
