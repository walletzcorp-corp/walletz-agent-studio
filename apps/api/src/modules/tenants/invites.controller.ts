import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { TenantsService } from './tenants.service';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { Public } from '../../shared/rbac/access-policy.decorators';

@ApiTags('invites')
@Controller('invites')
export class InvitesController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post('accept')
  @Public(
    'Token de convite de uso único (256 bits, armazenado como hash); protegido por throttling',
  )
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Aceitar convite para um tenant' })
  accept(@Body() dto: AcceptInviteDto, @Req() req: Request) {
    return this.tenantsService.acceptInvite(dto, req.ip);
  }
}
