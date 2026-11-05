import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../../shared/rbac/roles.decorator';
import { LabService } from './lab.service';
import { LabChatDto } from './dto/chat.dto';
import { CurrentTenant, type TenantContext } from '../../shared/rbac/tenant-context';
import { createExecutionContext } from '../agents/execution-context';

@ApiTags('lab')
@ApiBearerAuth()
@Controller('tenants/:tenantId/lab')
export class LabController {
  constructor(private readonly labService: LabService) {}

  @Post('chat')
  @Roles('manager')
  @HttpCode(200)
  @ApiOperation({ summary: 'Test agent in the lab with RAG' })
  chat(@CurrentTenant() tenant: TenantContext, @Body() dto: LabChatDto) {
    // The execution context is built here from the verified TenantContext, never from the body.
    const ctx = createExecutionContext({
      tenantId: tenant.tenantId,
      agentId: dto.agentId,
      channel: 'lab',
      source: 'internal_user',
      userId: tenant.userId,
    });
    return this.labService.chat(dto, ctx);
  }
}
