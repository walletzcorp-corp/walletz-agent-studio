import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { randomBytes, randomUUID } from 'crypto';
import type { RegisterDto } from './dto/register.dto';
import type { LoginDto } from './dto/login.dto';
import type { ForgotPasswordDto } from './dto/forgot-password.dto';
import type { ResetPasswordDto } from './dto/reset-password.dto';
import type { VerifyMfaSetupDto, DisableMfaDto } from './dto/verify-mfa.dto';
import type { ChangePasswordDto } from './dto/change-password.dto';
import { UsersService } from '../users/users.service';
import { SessionService } from './session.service';
import { MfaService } from './mfa.service';
import { MailService } from '../../shared/mail/mail.service';
import { AuditService } from '../../shared/audit/audit.service';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  tenantId?: string;
  role?: string;
  sessionId: string;
}

const BCRYPT_ROUNDS_DEFAULT = 12;
const EMAIL_VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1h

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly sessionService: SessionService,
    private readonly mfaService: MfaService,
    private readonly mailService: MailService,
    private readonly auditService: AuditService,
  ) {}

  async register(dto: RegisterDto, ipAddress?: string, userAgent?: string) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const rounds = Number(this.configService.get('BCRYPT_ROUNDS', BCRYPT_ROUNDS_DEFAULT));
    const passwordHash = await bcrypt.hash(dto.password, rounds);

    const verificationToken = randomBytes(32).toString('hex');
    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      emailVerificationToken: verificationToken,
      emailVerificationExpiresAt: new Date(Date.now() + EMAIL_VERIFY_TTL_MS),
    });

    const baseUrl = this.configService.get<string>('APP_URL', 'http://localhost:3000');
    await this.mailService.sendEmailVerification(user.email, verificationToken, baseUrl);

    await this.auditService.log({
      action: 'auth.register',
      resourceType: 'user',
      resourceId: user.id,
      newState: { email: user.email },
      ipAddress,
      userAgent,
    });

    return { userId: user.id, email: user.email };
  }

  async verifyEmail(token: string): Promise<void> {
    const user = await this.usersService.findByEmailVerificationToken(token);
    if (!user || !user.emailVerificationExpiresAt || user.emailVerificationExpiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.usersService.markEmailVerified(user.id);
    await this.auditService.log({
      userId: user.id,
      action: 'auth.email_verified',
      resourceType: 'user',
      resourceId: user.id,
    });
  }

  async login(
    dto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthTokens & { sessionId?: string; requiresMfa?: boolean; mfaToken?: string }> {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      await this.auditService.log({
        userId: user.id,
        action: 'auth.login.failed',
        resourceType: 'user',
        resourceId: user.id,
        metadata: { reason: 'invalid_password' },
        ipAddress,
        userAgent,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.mfaEnabledAt && !dto.mfaCode) {
      const mfaToken = await this.mfaService.createMfaToken(user.id);
      return { requiresMfa: true, mfaToken, accessToken: '', refreshToken: '' };
    }

    if (user.mfaEnabledAt && dto.mfaCode) {
      const valid = this.mfaService.verifyCode(user.mfaSecret!, dto.mfaCode);
      if (!valid) {
        throw new UnauthorizedException('Invalid MFA code');
      }
    }

    const session = await this.sessionService.create({
      userId: user.id,
      ipAddress,
      userAgent,
    });

    const tokens = await this.generateTokens(user.id, user.email, session.id);

    await this.sessionService.updateRefreshTokenHash(session.id, tokens.refreshToken);

    await this.auditService.log({
      userId: user.id,
      action: 'auth.login.success',
      resourceType: 'user',
      resourceId: user.id,
      metadata: { sessionId: session.id },
      ipAddress,
      userAgent,
    });

    return { ...tokens, sessionId: session.id };
  }

  async forgotPassword(dto: ForgotPasswordDto, ipAddress?: string): Promise<void> {
    const user = await this.usersService.findByEmail(dto.email);
    // Always respond 204 to prevent user enumeration
    if (!user) return;

    const token = randomBytes(32).toString('hex');
    await this.usersService.setPasswordResetToken(
      user.id,
      token,
      new Date(Date.now() + PASSWORD_RESET_TTL_MS),
    );

    const baseUrl = this.configService.get<string>('APP_URL', 'http://localhost:3000');
    await this.mailService.sendPasswordReset(user.email, token, baseUrl);

    await this.auditService.log({
      userId: user.id,
      action: 'auth.password_reset_requested',
      resourceType: 'user',
      resourceId: user.id,
      metadata: { ipAddress },
    });
  }

  async resetPassword(dto: ResetPasswordDto, ipAddress?: string): Promise<void> {
    const user = await this.usersService.findByPasswordResetToken(dto.token);
    if (!user || !user.passwordResetExpiresAt || user.passwordResetExpiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const rounds = Number(this.configService.get('BCRYPT_ROUNDS', BCRYPT_ROUNDS_DEFAULT));
    const passwordHash = await bcrypt.hash(dto.password, rounds);

    await this.usersService.updatePassword(user.id, passwordHash);
    await this.sessionService.revokeAllForUser(user.id);

    await this.auditService.log({
      userId: user.id,
      action: 'auth.password_reset',
      resourceType: 'user',
      resourceId: user.id,
      metadata: { ipAddress },
    });
  }

  async changePassword(userId: string, dto: ChangePasswordDto, ipAddress?: string): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (!user || !user.passwordHash) {
      throw new NotFoundException('User not found');
    }

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid current password');
    }

    const rounds = Number(this.configService.get('BCRYPT_ROUNDS', BCRYPT_ROUNDS_DEFAULT));
    const passwordHash = await bcrypt.hash(dto.newPassword, rounds);

    await this.usersService.updatePassword(userId, passwordHash);
    await this.sessionService.revokeAllForUser(userId);

    await this.auditService.log({
      userId,
      action: 'auth.password_changed',
      resourceType: 'user',
      resourceId: userId,
      metadata: { ipAddress },
    });
  }

  async setupMfa(userId: string): Promise<{ secret: string; otpAuthUrl: string }> {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    if (user.mfaEnabledAt) throw new ConflictException('MFA already enabled');

    const secret = this.mfaService.generateSecret();
    await this.usersService.setMfaSecret(userId, secret);

    return {
      secret,
      otpAuthUrl: this.mfaService.getOtpAuthUrl(user.email, secret),
    };
  }

  async confirmMfaSetup(userId: string, dto: VerifyMfaSetupDto, ipAddress?: string): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (!user || !user.mfaSecret) throw new BadRequestException('MFA setup not initiated');
    if (user.mfaEnabledAt) throw new ConflictException('MFA already enabled');

    const valid = this.mfaService.verifyCode(user.mfaSecret, dto.code);
    if (!valid) throw new UnauthorizedException('Invalid MFA code');

    await this.usersService.enableMfa(userId);

    await this.auditService.log({
      userId,
      action: 'auth.mfa_enabled',
      resourceType: 'user',
      resourceId: userId,
      metadata: { ipAddress },
    });
  }

  async disableMfa(userId: string, dto: DisableMfaDto, ipAddress?: string): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (!user || !user.passwordHash) throw new NotFoundException('User not found');
    if (!user.mfaEnabledAt) throw new BadRequestException('MFA not enabled');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid password');

    await this.usersService.disableMfa(userId);

    await this.auditService.log({
      userId,
      action: 'auth.mfa_disabled',
      resourceType: 'user',
      resourceId: userId,
      metadata: { ipAddress },
    });
  }

  async refreshTokens(refreshToken: string, sessionId: string): Promise<AuthTokens> {
    const session = await this.sessionService.findById(sessionId);

    if (!session || session.revokedAt || new Date() > session.expiresAt) {
      throw new UnauthorizedException('Session expired or revoked');
    }

    const tokenValid = await this.sessionService.verifyRefreshToken(session.id, refreshToken);
    if (!tokenValid) {
      await this.sessionService.revoke(session.id);
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.usersService.findById(session.userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const tokens = await this.generateTokens(user.id, user.email, session.id);
    await this.sessionService.updateRefreshTokenHash(session.id, tokens.refreshToken);

    return tokens;
  }

  async logout(sessionId: string): Promise<void> {
    await this.sessionService.revoke(sessionId);
  }

  private async generateTokens(
    userId: string,
    email: string,
    sessionId: string,
  ): Promise<AuthTokens> {
    const payload: JwtPayload = { sub: userId, email, sessionId };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        expiresIn: this.configService.get('JWT_ACCESS_EXPIRES_IN', '15m'),
        secret: this.configService.getOrThrow('JWT_ACCESS_SECRET'),
        jwtid: randomUUID(),
      }),
      this.jwtService.signAsync(payload, {
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
        secret: this.configService.getOrThrow('JWT_REFRESH_SECRET'),
        jwtid: randomUUID(),
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
