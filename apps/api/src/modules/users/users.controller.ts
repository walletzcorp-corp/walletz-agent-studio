import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, ParseUUIDPipe, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { IsEmail, IsUUID, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class InviteUserDto {
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty() @IsUUID() organizationId: string;
  @ApiProperty() @IsUUID() profileId: string;
}

class AcceptInviteDto {
  @ApiProperty() @IsString() token: string;
}

class BlockUserDto {
  @ApiProperty() @IsString() reason: string;
}

@ApiTags('Usuários')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Post('invite')
  @ApiOperation({ summary: 'Convidar usuário por e-mail' })
  invite(
    @Body() dto: InviteUserDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-idempotency-key') idempotencyKey?: string,
  ) {
    return this.service.invite(dto, user.userId!, idempotencyKey);
  }

  @Post('invite/accept')
  @ApiOperation({ summary: 'Aceitar convite' })
  acceptInvite(@Body() dto: AcceptInviteDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.acceptInvite(dto.token, user.sub);
  }

  @Post('invite/:id/resend')
  @ApiOperation({ summary: 'Reenviar convite' })
  resendInvite(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.resendInvite(id, user.userId!);
  }

  @Get()
  @ApiOperation({ summary: 'Listar usuários' })
  findAll(
    @Query('organizationId') organizationId?: string,
    @Query('status') status?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.service.findAll({ organizationId, status, page: Number(page), limit: Number(limit) });
  }

  @Patch(':id/block')
  @ApiOperation({ summary: 'Bloquear usuário' })
  block(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: BlockUserDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.blockUser(id, user.userId!, dto.reason);
  }
}
