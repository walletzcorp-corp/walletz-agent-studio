import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Headers,
  HttpCode,
  HttpStatus,
  Patch,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PcConnectorService } from './pc-connector.service';
import { Roles } from '../../shared/rbac/roles.decorator';
import { CurrentTenant } from '../../shared/rbac/tenant-context';
import { Public } from '../../shared/rbac/access-policy.decorators';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/auth.service';
import {
  ApproveCommandDto,
  CommandResultDto,
  PairDeviceDto,
  UpdateCapabilitiesDto,
} from './dto/pc-connector.dto';

// ── Authenticated tenant routes ───────────────────────────────────────────────

@ApiTags('pc-connector')
@Controller('tenants/:tenantId/pc-connector')
@ApiBearerAuth()
export class PcConnectorTenantController {
  constructor(private readonly svc: PcConnectorService) {}

  @Post('pair-token')
  @Roles('admin')
  @ApiOperation({ summary: 'Gerar token de pareamento para novo dispositivo' })
  generatePairingToken(@CurrentTenant('tenantId') tenantId: string) {
    return this.svc.generatePairingToken(tenantId);
  }

  @Get('devices')
  @Roles('viewer')
  @ApiOperation({ summary: 'Listar dispositivos conectados' })
  listDevices(@CurrentTenant('tenantId') tenantId: string) {
    return this.svc.listDevices(tenantId);
  }

  @Get('devices/:deviceId')
  @Roles('viewer')
  @ApiOperation({ summary: 'Obter dispositivo' })
  getDevice(@CurrentTenant('tenantId') tenantId: string, @Param('deviceId') deviceId: string) {
    return this.svc.getDevice(tenantId, deviceId);
  }

  @Patch('devices/:deviceId/capabilities')
  @Roles('admin')
  @ApiOperation({ summary: 'Atualizar permissões do dispositivo' })
  updateCapabilities(
    @CurrentTenant('tenantId') tenantId: string,
    @Param('deviceId') deviceId: string,
    @Body() body: UpdateCapabilitiesDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.updateCapabilities(tenantId, deviceId, body.capabilities, user.sub);
  }

  @Delete('devices/:deviceId')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desconectar dispositivo' })
  disconnect(
    @CurrentTenant('tenantId') tenantId: string,
    @Param('deviceId') deviceId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.disconnectDevice(tenantId, deviceId, user.sub);
  }

  @Patch('commands/:commandId/approve')
  @Roles('admin')
  @ApiOperation({ summary: 'Aprovar ou rejeitar comando de alto risco' })
  approveCommand(
    @CurrentTenant('tenantId') tenantId: string,
    @Param('commandId') commandId: string,
    @Body() body: ApproveCommandDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.approveCommand(tenantId, commandId, body.approved, user.sub);
  }
}

// ── Public routes used by the PC Connector script ────────────────────────────

@ApiTags('pc-connector')
@Controller('pc-connector')
export class PcConnectorPublicController {
  constructor(private readonly svc: PcConnectorService) {}

  @Post('pair')
  @Public('Token de pareamento de uso único emitido por admin do tenant')
  @ApiOperation({ summary: 'Parear dispositivo com token' })
  pair(@Body() body: PairDeviceDto) {
    return this.svc.pairDevice(body.token, body.deviceName, body.platform);
  }

  @Get('devices/:deviceId/commands')
  @Public('Segredo do dispositivo (x-device-secret) validado por device')
  @ApiOperation({ summary: 'Buscar comandos pendentes (polling do connector)' })
  getPendingCommands(
    @Param('deviceId') deviceId: string,
    @Headers('x-device-secret') deviceSecret: string | undefined,
  ) {
    return this.svc.getPendingCommands(deviceId, deviceSecret);
  }

  @Post('devices/:deviceId/commands/:commandId/result')
  @Public('Segredo do dispositivo (x-device-secret) validado por device')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Postar resultado de comando executado' })
  postResult(
    @Param('deviceId') deviceId: string,
    @Param('commandId') commandId: string,
    @Headers('x-device-secret') deviceSecret: string | undefined,
    @Body() body: CommandResultDto,
  ) {
    return this.svc.postCommandResult(
      deviceId,
      commandId,
      body.success,
      body.result,
      body.error,
      deviceSecret,
    );
  }
}
