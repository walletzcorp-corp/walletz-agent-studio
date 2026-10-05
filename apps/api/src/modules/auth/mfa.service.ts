import { Injectable, Inject } from '@nestjs/common';
import { authenticator } from 'otplib';
import type Redis from 'ioredis';
import { REDIS_TOKEN } from '../../shared/redis/redis.module';
import { createId } from '../../database/utils/id';

const MFA_PENDING_TTL_SECONDS = 300; // 5 minutes

@Injectable()
export class MfaService {
  constructor(@Inject(REDIS_TOKEN) private readonly redis: Redis) {}

  generateSecret(): string {
    return authenticator.generateSecret();
  }

  getOtpAuthUrl(email: string, secret: string): string {
    return authenticator.keyuri(email, 'Walletz Agent Studio', secret);
  }

  verifyCode(secret: string, token: string): boolean {
    return authenticator.verify({ token, secret });
  }

  async createMfaToken(userId: string): Promise<string> {
    const token = createId();
    await this.redis.set(`mfa_pending:${token}`, userId, 'EX', MFA_PENDING_TTL_SECONDS);
    return token;
  }

  async resolveMfaToken(token: string): Promise<string | null> {
    const userId = await this.redis.get(`mfa_pending:${token}`);
    if (userId) {
      await this.redis.del(`mfa_pending:${token}`);
    }
    return userId;
  }
}
