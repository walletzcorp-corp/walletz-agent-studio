import { Controller, Post, Get, Body, Query, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyMfaSetupDto, DisableMfaDto } from './dto/verify-mfa.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CurrentUser } from './decorators/current-user.decorator';
import type { JwtPayload } from './auth.service';
import { Public, Authenticated } from '../../shared/rbac/access-policy.decorators';

@ApiTags('auth')
@Controller('auth')
// Default: 10 req/s short, 50/10s medium, 100/min long (from ThrottlerModule global)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Public('Cadastro: sem sessão; protegido por throttling')
  @Throttle({ short: { limit: 3, ttl: 60000 }, medium: { limit: 5, ttl: 3600000 } })
  @ApiOperation({ summary: 'Cadastrar novo usuário' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 409, description: 'Email já cadastrado' })
  async register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.authService.register(dto, req.ip, req.headers['user-agent']);
  }

  @Get('verify-email')
  @Public('Token de verificação de e-mail de uso único')
  @SkipThrottle()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Confirmar email' })
  async verifyEmail(@Query('token') token: string) {
    await this.authService.verifyEmail(token);
  }

  @Post('login')
  @Public('Autenticação por credenciais; protegido por throttling')
  @Throttle({ short: { limit: 5, ttl: 60000 }, medium: { limit: 10, ttl: 3600000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login' })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, req.ip, req.headers['user-agent']);
  }

  @Post('refresh')
  @Public('Refresh token + sessionId validados no servidor')
  @Throttle({ short: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar tokens' })
  async refresh(@Body() body: { refreshToken: string; sessionId: string }) {
    return this.authService.refreshTokens(body.refreshToken, body.sessionId);
  }

  @Post('logout')
  @Authenticated()
  @ApiBearerAuth()
  @SkipThrottle()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Logout' })
  async logout(@CurrentUser() user: JwtPayload) {
    await this.authService.logout(user.sessionId);
  }

  @Post('forgot-password')
  @Public('Fluxo de recuperação; resposta uniforme anti-enumeração')
  @Throttle({ short: { limit: 3, ttl: 60000 }, medium: { limit: 5, ttl: 3600000 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Solicitar redefinição de senha' })
  async forgotPassword(@Body() dto: ForgotPasswordDto, @Req() req: Request) {
    await this.authService.forgotPassword(dto, req.ip);
  }

  @Post('reset-password')
  @Public('Token de redefinição de uso único')
  @Throttle({ short: { limit: 3, ttl: 60000 }, medium: { limit: 5, ttl: 3600000 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Redefinir senha' })
  async resetPassword(@Body() dto: ResetPasswordDto, @Req() req: Request) {
    await this.authService.resetPassword(dto, req.ip);
  }

  @Post('change-password')
  @Authenticated()
  @ApiBearerAuth()
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Alterar senha' })
  async changePassword(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
  ) {
    await this.authService.changePassword(user.sub, dto, req.ip);
  }

  @Get('mfa/setup')
  @Authenticated()
  @ApiBearerAuth()
  @Throttle({ short: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Iniciar configuração de MFA' })
  async setupMfa(@CurrentUser() user: JwtPayload) {
    return this.authService.setupMfa(user.sub);
  }

  @Post('mfa/confirm')
  @Authenticated()
  @ApiBearerAuth()
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Confirmar configuração de MFA' })
  async confirmMfa(
    @CurrentUser() user: JwtPayload,
    @Body() dto: VerifyMfaSetupDto,
    @Req() req: Request,
  ) {
    await this.authService.confirmMfaSetup(user.sub, dto, req.ip);
  }

  @Post('mfa/disable')
  @Authenticated()
  @ApiBearerAuth()
  @Throttle({ short: { limit: 3, ttl: 60000 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desativar MFA' })
  async disableMfa(
    @CurrentUser() user: JwtPayload,
    @Body() dto: DisableMfaDto,
    @Req() req: Request,
  ) {
    await this.authService.disableMfa(user.sub, dto, req.ip);
  }

  @Get('me')
  @Authenticated()
  @ApiBearerAuth()
  @SkipThrottle()
  @ApiOperation({ summary: 'Dados do usuário autenticado' })
  async me(@CurrentUser() user: JwtPayload) {
    return { userId: user.sub, email: user.email, sessionId: user.sessionId };
  }
}
