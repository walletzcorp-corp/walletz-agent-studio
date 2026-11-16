import { authenticator } from 'otplib';
import type Redis from 'ioredis';
import { EncryptionService } from '../../../shared/crypto/encryption.service';
import { MfaService } from '../mfa.service';

describe('MfaService secret at rest', () => {
  const original = process.env['ENCRYPTION_KEY'];
  let service: MfaService;

  beforeAll(() => {
    process.env['ENCRYPTION_KEY'] = 'c'.repeat(64);
    service = new MfaService({} as Redis, new EncryptionService());
  });
  afterAll(() => {
    if (original === undefined) delete process.env['ENCRYPTION_KEY'];
    else process.env['ENCRYPTION_KEY'] = original;
  });

  it('seals the secret so the stored value never contains it', () => {
    const secret = service.generateSecret();
    const sealed = service.sealSecret(secret);
    expect(sealed.startsWith('enc:v1:')).toBe(true);
    expect(sealed).not.toContain(secret);
    expect(service.openSecret(sealed)).toBe(secret);
    expect(service.isLegacyPlaintext(sealed)).toBe(false);
  });

  it('verifies a TOTP code against a sealed secret', () => {
    const secret = service.generateSecret();
    expect(service.verifyCode(service.sealSecret(secret), authenticator.generate(secret))).toBe(
      true,
    );
    expect(service.verifyCode(service.sealSecret(secret), '000000')).toBe(false);
  });

  it('still reads a legacy plaintext secret and flags it for sealing', () => {
    const secret = service.generateSecret();
    expect(service.isLegacyPlaintext(secret)).toBe(true);
    expect(service.verifyCode(secret, authenticator.generate(secret))).toBe(true);
  });

  it('rejects a tampered sealed secret', () => {
    const sealed = service.sealSecret(service.generateSecret());
    const tampered = sealed.slice(0, -4) + (sealed.endsWith('AAAA') ? 'BBBB' : 'AAAA');
    expect(() => service.openSecret(tampered)).toThrow();
  });
});
