import { Injectable, Inject } from '@nestjs/common';
import { authenticator } from 'otplib';
import type Redis from 'ioredis';
import { REDIS_TOKEN } from '../../shared/redis/redis.module';
import { createId } from '../../database/utils/id';
import { EncryptionService } from '../../shared/crypto/encryption.service';

const MFA_PENDING_TTL_SECONDS = 300; // 5 minutes
const SEALED_PREFIX = 'enc:v1:';

@Injectable()
export class MfaService {
  constructor(
    @Inject(REDIS_TOKEN) private readonly redis: Redis,
    private readonly encryption: EncryptionService,
  ) {}

  /** Encrypts a TOTP secret for storage (AES-256-GCM). The database never sees the plaintext. */
  sealSecret(secret: string): string {
    return SEALED_PREFIX + this.encryption.encrypt(secret);
  }

  /** True when the stored value predates encryption at rest and should be re-sealed. */
  isLegacyPlaintext(stored: string): boolean {
    return !stored.startsWith(SEALED_PREFIX);
  }

  /** Returns the plaintext TOTP secret from its stored form (sealed, or legacy plaintext). */
  openSecret(stored: string): string {
    if (this.isLegacyPlaintext(stored)) return stored;
    return this.encryption.decrypt(stored.slice(SEALED_PREFIX.length));
  }

  generateSecret(): string {
    return authenticator.generateSecret();
  }

  getOtpAuthUrl(email: string, secret: string): string {
    return authenticator.keyuri(email, 'Walletz Agent Studio', secret);
  }

  /** `storedSecret` is the value kept in users.mfa_secret (sealed or legacy plaintext). */
  verifyCode(storedSecret: string, token: string): boolean {
    return authenticator.verify({ token, secret: this.openSecret(storedSecret) });
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
