import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/auth.service';
import { PlatformAdminGuard } from './guards/platform-admin.guard';
import { AdminService, type AdminActor } from './admin.service';
import {
  ExtendTrialDto,
  ListActivityQueryDto,
  ListAgentsQueryDto,
  ListTenantsQueryDto,
  SetTokenLimitDto,
  SuspendTenantDto,
} from './dto/admin.dto';

/** Administração da plataforma Walletz: visão e ações sobre todos os tenants. */
@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Dashboard: totais, agentes por tipo e por organização, IA, atividade' })
  overview() {
    return this.adminService.overview();
  }

  @Get('tenants')
  @ApiOperation({ summary: 'Listar organizações (clientes) com métricas' })
  listTenants(@Query() query: ListTenantsQueryDto) {
    return this.adminService.listTenants(query);
  }

  @Get('tenants/:tenantId')
  @ApiOperation({ summary: 'Detalhe da organização: membros, agentes, consumo, atividade' })
  tenantDetail(@Param('tenantId') tenantId: string) {
    return this.adminService.tenantDetail(tenantId);
  }

  @Get('agents')
  @ApiOperation({ summary: 'Listar agentes de todas as organizações' })
  listAgents(@Query() query: ListAgentsQueryDto) {
    return this.adminService.listAgents(query);
  }

  @Get('users')
  @ApiOperation({ summary: 'Listar usuários da plataforma' })
  listUsers(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    const p = Math.max(1, Number(page) || 1);
    const ps = Math.min(200, Math.max(1, Number(pageSize) || 50));
    return this.adminService.listUsers(p, ps);
  }

  @Get('activity')
  @ApiOperation({ summary: 'Atividade da plataforma (audit log)' })
  listActivity(@Query() query: ListActivityQueryDto) {
    return this.adminService.listActivity(query);
  }

  @Get('llm')
  @ApiOperation({ summary: 'Modelo em uso e limites de taxa da conta Anthropic' })
  llmStatus() {
    return this.adminService.llmStatus();
  }

  @Post('tenants/:tenantId/suspend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspender organização (bloqueia o uso; dados preservados)' })
  suspend(
    @Param('tenantId') tenantId: string,
    @Body() dto: SuspendTenantDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.adminService.suspendTenant(tenantId, dto.reason, actorFrom(user, req));
  }

  @Post('tenants/:tenantId/reactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reativar organização suspensa' })
  reactivate(@Param('tenantId') tenantId: string, @CurrentUser() user: JwtPayload, @Req() req: Request) {
    return this.adminService.reactivateTenant(tenantId, actorFrom(user, req));
  }

  @Post('tenants/:tenantId/extend-trial')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Estender o período de trial' })
  extendTrial(
    @Param('tenantId') tenantId: string,
    @Body() dto: ExtendTrialDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.adminService.extendTrial(tenantId, dto.days, actorFrom(user, req));
  }

  @Patch('tenants/:tenantId/token-limit')
  @ApiOperation({ summary: 'Definir limite mensal de tokens de IA (null remove)' })
  setTokenLimit(
    @Param('tenantId') tenantId: string,
    @Body() dto: SetTokenLimitDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.adminService.setTokenLimit(tenantId, dto.limit, actorFrom(user, req));
  }
}

function actorFrom(user: JwtPayload, req: Request): AdminActor {
  const traceHeader = req.headers['x-request-id'];
  return {
    userId: user.sub,
    sessionId: user.sessionId,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    traceId: typeof traceHeader === 'string' ? traceHeader : undefined,
  };
}
