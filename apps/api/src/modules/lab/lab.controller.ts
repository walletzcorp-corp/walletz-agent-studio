import {
  Controller, Post, Body, Param, UseGuards, HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../../shared/rbac/rbac.guard';
import { Roles } from '../../shared/rbac/roles.decorator';
import { LabService } from './lab.service';
import { LabChatDto } from './dto/chat.dto';

@ApiTags('lab')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RbacGuard)
@Controller('tenants/:tenantId/lab')
export class LabController {
  constructor(private readonly labService: LabService) {}

  @Post('chat')
  @Roles('manager')
  @HttpCode(200)
  @ApiOperation({ summary: 'Test agent in the lab with RAG' })
  chat(
    @Param('tenantId') tenantId: string,
    @Body() dto: LabChatDto,
  ) {
    return this.labService.chat(dto, tenantId, {
      conversationId: dto.conversationId,
      contactId: dto.contactId,
    });
  }
}
