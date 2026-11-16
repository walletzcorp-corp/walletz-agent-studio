import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsBoolean, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../../shared/rbac/rbac.guard';
import { Roles } from '../../shared/rbac/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/auth.service';
import { WebhooksService } from './webhooks.service';

export class CreateWebhookDto {
  @ApiProperty({ example: 'https://meusistema.com.br/walletz/webhook' })
  @IsUrl({ require_tld: false, require_protocol: true })
  @MaxLength(500)
  url!: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  events!: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;
}

export class UpdateWebhookDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUrl({ require_tld: false, require_protocol: true })
  @MaxLength(500)
  url?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  events?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@ApiTags('webhooks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RbacGuard)
@Controller('tenants/:tenantId/webhooks')
export class WebhooksController {
  constructor(private readonly service: WebhooksService) {}

  @Get('events')
  @Roles('viewer')
  @ApiOperation({ summary: 'Eventos disponíveis para assinatura' })
  events() {
    return this.service.events();
  }

  @Get()
  @Roles('manager')
  @ApiOperation({ summary: 'Listar webhooks de saída' })
  list(@Param('tenantId') tenantId: string) {
    return this.service.list(tenantId);
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Criar webhook de saída (o segredo de assinatura é exibido só nesta resposta)' })
  create(@Param('tenantId') tenantId: string, @Body() dto: CreateWebhookDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(tenantId, dto, user.sub);
  }

  @Patch(':webhookId')
  @Roles('admin')
  @ApiOperation({ summary: 'Alterar URL, eventos ou pausar/reativar' })
  update(
    @Param('tenantId') tenantId: string,
    @Param('webhookId') webhookId: string,
    @Body() dto: UpdateWebhookDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.update(tenantId, webhookId, dto, user.sub);
  }

  @Post(':webhookId/rotate-secret')
  @HttpCode(HttpStatus.OK)
  @Roles('admin')
  @ApiOperation({ summary: 'Gerar novo segredo de assinatura' })
  rotate(@Param('tenantId') tenantId: string, @Param('webhookId') webhookId: string, @CurrentUser() user: JwtPayload) {
    return this.service.rotateSecret(tenantId, webhookId, user.sub);
  }

  @Post(':webhookId/test')
  @HttpCode(HttpStatus.OK)
  @Roles('manager')
  @ApiOperation({ summary: 'Enviar evento de teste agora' })
  test(@Param('tenantId') tenantId: string, @Param('webhookId') webhookId: string) {
    return this.service.sendTest(tenantId, webhookId);
  }

  @Delete(':webhookId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('admin')
  @ApiOperation({ summary: 'Remover webhook' })
  async remove(@Param('tenantId') tenantId: string, @Param('webhookId') webhookId: string, @CurrentUser() user: JwtPayload) {
    await this.service.remove(tenantId, webhookId, user.sub);
  }
}
