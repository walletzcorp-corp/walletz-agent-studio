import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Response } from 'express';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsHexColor,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../../shared/rbac/rbac.guard';
import { Roles } from '../../shared/rbac/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/auth.service';
import { WebchatService } from './webchat.service';
import { WIDGET_SCRIPT } from './widget-script';

export class CreateWidgetDto {
  @ApiProperty()
  @IsString()
  agentId!: string;

  @ApiProperty({ example: 'Site principal' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @ApiProperty({ required: false, type: [String], example: ['https://www.minhaempresa.com.br'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  allowedOrigins?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  title?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  welcomeMessage?: string;

  @ApiProperty({ required: false, example: '#0f766e' })
  @IsOptional()
  @IsHexColor()
  primaryColor?: string;
}

export class UpdateWidgetDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  agentId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  allowedOrigins?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  title?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  welcomeMessage?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsHexColor()
  primaryColor?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}

export class StartSessionDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;
}

export class VisitorMessageDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  message!: string;
}

/** Gestão dos widgets pelo painel. */
@ApiTags('webchat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RbacGuard)
@Controller('tenants/:tenantId/webchat/widgets')
export class WebchatAdminController {
  constructor(private readonly service: WebchatService) {}

  @Get()
  @Roles('viewer')
  @ApiOperation({ summary: 'Listar widgets de webchat' })
  list(@Param('tenantId') tenantId: string) {
    return this.service.list(tenantId);
  }

  @Post()
  @Roles('manager')
  @ApiOperation({ summary: 'Criar widget de webchat para incorporar ao site' })
  create(@Param('tenantId') tenantId: string, @Body() dto: CreateWidgetDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(tenantId, dto, user.sub);
  }

  @Patch(':widgetId')
  @Roles('manager')
  @ApiOperation({ summary: 'Alterar widget (agente, sites autorizados, aparência, ativo)' })
  update(
    @Param('tenantId') tenantId: string,
    @Param('widgetId') widgetId: string,
    @Body() dto: UpdateWidgetDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.update(tenantId, widgetId, dto, user.sub);
  }

  @Delete(':widgetId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('manager')
  @ApiOperation({ summary: 'Remover widget' })
  async remove(@Param('tenantId') tenantId: string, @Param('widgetId') widgetId: string, @CurrentUser() user: JwtPayload) {
    await this.service.remove(tenantId, widgetId, user.sub);
  }
}

/**
 * Endpoints públicos usados pelo widget no site do cliente (sem login).
 * Proteções: chave pública do widget, sites autorizados (Origin), token de
 * sessão por conversa, limite de taxa por IP e de mensagens por sessão.
 */
@ApiTags('webchat-public')
@UseGuards(ThrottlerGuard)
@Controller('public/webchat')
export class WebchatPublicController {
  constructor(private readonly service: WebchatService) {}

  @Get('widget.js')
  @Header('Content-Type', 'application/javascript; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=300')
  @ApiOperation({ summary: 'Script do widget para incorporar ao site' })
  script(@Res({ passthrough: true }) res: Response): string {
    // O script é carregado por sites de terceiros.
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    return WIDGET_SCRIPT;
  }

  @Get(':publicKey/config')
  @Throttle({ short: { limit: 5, ttl: 1000 }, medium: { limit: 30, ttl: 60_000 } })
  config(@Param('publicKey') publicKey: string, @Headers('origin') origin?: string) {
    return this.service.publicConfig(publicKey, origin);
  }

  @Post(':publicKey/sessions')
  @Throttle({ short: { limit: 2, ttl: 1000 }, medium: { limit: 10, ttl: 60_000 } })
  startSession(@Param('publicKey') publicKey: string, @Body() dto: StartSessionDto, @Headers('origin') origin?: string) {
    return this.service.startSession(publicKey, origin, dto.name);
  }

  @Get(':publicKey/messages')
  @Throttle({ short: { limit: 3, ttl: 1000 }, medium: { limit: 40, ttl: 60_000 } })
  messages(
    @Param('publicKey') publicKey: string,
    @Headers('x-webchat-session') session?: string,
    @Headers('origin') origin?: string,
    @Query('after') after?: string,
  ) {
    return this.service.listMessages(publicKey, origin, session, after);
  }

  @Post(':publicKey/messages')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 1, ttl: 1000 }, medium: { limit: 15, ttl: 60_000 } })
  send(
    @Param('publicKey') publicKey: string,
    @Body() dto: VisitorMessageDto,
    @Headers('x-webchat-session') session?: string,
    @Headers('origin') origin?: string,
  ) {
    return this.service.sendMessage(publicKey, origin, session, dto.message);
  }
}
