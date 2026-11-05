import { createHash, randomBytes } from 'crypto';

/** Opaque 256-bit token that travels by e-mail; only {@link hashOneTimeToken} of it is stored. */
export function generateOneTimeToken(): string {
  return randomBytes(32).toString('hex');
}

/** Tokens are high-entropy, so a plain SHA-256 is enough and allows an indexed equality lookup. */
export function hashOneTimeToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
