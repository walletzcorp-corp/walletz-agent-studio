import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;

/**
 * AES-256-GCM encryption for secrets at rest (OAuth tokens, App Secrets).
 * Key is sourced from ENCRYPTION_KEY env var (32-byte hex string = 64 chars).
 * Ciphertext format: base64(iv[12] || authTag[16] || ciphertext)
 */
@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly key: Buffer;

  constructor() {
    const raw = process.env.ENCRYPTION_KEY ?? '';
    if (!raw || raw.length !== 64) {
      this.logger.warn(
        'ENCRYPTION_KEY is missing or not 64 hex chars — token encryption is DISABLED. Set ENCRYPTION_KEY in production.',
      );
      // Use a deterministic dev-only key (tokens still work but are not protected)
      this.key = Buffer.from(
        'walletz_dev_key_not_for_production_use_only__replace_me_now!',
        'utf8',
      ).subarray(0, 32);
    } else {
      this.key = Buffer.from(raw, 'hex');
    }
  }

  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(IV_BYTES);
    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    // Pack: iv | authTag | ciphertext
    return Buffer.concat([iv, authTag, encrypted]).toString('base64');
  }

  decrypt(ciphertext: string): string {
    const buf = Buffer.from(ciphertext, 'base64');
    const iv = buf.subarray(0, IV_BYTES);
    const authTag = buf.subarray(IV_BYTES, IV_BYTES + AUTH_TAG_BYTES);
    const encrypted = buf.subarray(IV_BYTES + AUTH_TAG_BYTES);
    const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(encrypted) + decipher.final('utf8');
  }

  /** Safe decrypt: returns null instead of throwing on bad ciphertext. */
  tryDecrypt(ciphertext: string): string | null {
    try {
      return this.decrypt(ciphertext);
    } catch {
      return null;
    }
  }

  /** HMAC-SHA256 — used to verify Meta webhook signatures. */
  hmacSha256(secret: string, payload: Buffer): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }
}
