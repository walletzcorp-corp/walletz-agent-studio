import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
  Patch,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PcConnectorService } from './pc-connector.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../../shared/rbac/rbac.guard';
import { Roles } from '../../shared/rbac/roles.decorator';

// ── Authenticated tenant routes ───────────────────────────────────────────────

@ApiTags('pc-connector')
@Controller('tenants/:tenantId/pc-connector')
@UseGuards(JwtAuthGuard, RbacGuard)
@ApiBearerAuth()
export class PcConnectorTenantController {
  constructor(private readonly svc: PcConnectorService) {}

  @Post('pair-token')
  @Roles('admin')
  @ApiOperation({ summary: 'Gerar token de pareamento para novo dispositivo' })
  generatePairingToken(@Param('tenantId') tenantId: string) {
    return this.svc.generatePairingToken(tenantId);
  }

  @Get('devices')
  @Roles('viewer')
  @ApiOperation({ summary: 'Listar dispositivos conectados' })
  listDevices(@Param('tenantId') tenantId: string) {
    return this.svc.listDevices(tenantId);
  }

  @Get('devices/:deviceId')
  @Roles('viewer')
  @ApiOperation({ summary: 'Obter dispositivo' })
  getDevice(@Param('tenantId') tenantId: string, @Param('deviceId') deviceId: string) {
    return this.svc.getDevice(tenantId, deviceId);
  }

  @Patch('devices/:deviceId/capabilities')
  @Roles('admin')
  @ApiOperation({ summary: 'Atualizar permissões do dispositivo' })
  updateCapabilities(
    @Param('tenantId') tenantId: string,
    @Param('deviceId') deviceId: string,
    @Body() body: { capabilities: Record<string, unknown> },
  ) {
    return this.svc.updateCapabilities(tenantId, deviceId, body.capabilities);
  }

  @Delete('devices/:deviceId')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desconectar dispositivo' })
  disconnect(@Param('tenantId') tenantId: string, @Param('deviceId') deviceId: string) {
    return this.svc.disconnectDevice(tenantId, deviceId);
  }
}

// ── Public routes used by the PC Connector script ────────────────────────────

@ApiTags('pc-connector')
@Controller('pc-connector')
export class PcConnectorPublicController {
  constructor(private readonly svc: PcConnectorService) {}

  @Post('pair')
  @ApiOperation({ summary: 'Parear dispositivo com token' })
  pair(@Body() body: { token: string; deviceName: string; platform: string }) {
    return this.svc.pairDevice(body.token, body.deviceName, body.platform);
  }

  @Get('devices/:deviceId/commands')
  @ApiOperation({ summary: 'Buscar comandos pendentes (polling do connector)' })
  getPendingCommands(
    @Param('deviceId') deviceId: string,
    @Headers('x-device-secret') deviceSecret: string | undefined,
  ) {
    return this.svc.getPendingCommands(deviceId, deviceSecret);
  }

  @Post('devices/:deviceId/commands/:commandId/result')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Postar resultado de comando executado' })
  postResult(
    @Param('deviceId') deviceId: string,
    @Param('commandId') commandId: string,
    @Headers('x-device-secret') deviceSecret: string | undefined,
    @Body() body: { success: boolean; result?: Record<string, unknown>; error?: string },
  ) {
    return this.svc.postCommandResult(deviceId, commandId, body.success, body.result, body.error, deviceSecret);
  }
}
