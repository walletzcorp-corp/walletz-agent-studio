import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import type { RegisterDto } from './dto/register.dto';
import type { LoginDto } from './dto/login.dto';
import { UsersService } from '../users/users.service';
import { SessionService } from './session.service';
import { MfaService } from './mfa.service';
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

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly sessionService: SessionService,
    private readonly mfaService: MfaService,
    private readonly auditService: AuditService,
  ) {}

  async register(dto: RegisterDto, ipAddress?: string, userAgent?: string) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(
      dto.password,
      this.configService.get<number>('BCRYPT_ROUNDS', 12),
    );

    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
    });

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

  async login(
    dto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthTokens & { requiresMfa?: boolean; mfaToken?: string }> {
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

    return tokens;
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
      }),
      this.jwtService.signAsync(payload, {
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
        secret: this.configService.getOrThrow('JWT_REFRESH_SECRET'),
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
