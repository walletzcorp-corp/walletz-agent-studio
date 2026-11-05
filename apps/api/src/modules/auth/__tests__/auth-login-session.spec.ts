import * as bcrypt from 'bcryptjs';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';

async function build() {
  const passwordHash = await bcrypt.hash('Correct-Horse-9!', 4);
  const usersService = {
    findByEmail: jest.fn().mockResolvedValue({ id: 'user-1', email: 'a@b.com', passwordHash, mfaEnabledAt: null }),
  };
  const jwtService = { signAsync: jest.fn().mockResolvedValue('signed.jwt') };
  const configService = {
    get: jest.fn((_key: string, fallback?: unknown) => fallback ?? '15m'),
    getOrThrow: jest.fn(() => 'test-secret'),
  };
  const sessionService = {
    create: jest.fn().mockResolvedValue({ id: 'session-1' }),
    updateRefreshTokenHash: jest.fn().mockResolvedValue(undefined),
  };
  const auditService = { log: jest.fn().mockResolvedValue(undefined) };

  const service = new AuthService(
    usersService as never,
    jwtService as never,
    configService as never,
    sessionService as never,
    {} as never,
    {} as never,
    auditService as never,
  );
  return { service, sessionService };
}

describe('AuthService.login', () => {
  it('returns the sessionId so clients can call /auth/refresh', async () => {
    const { service, sessionService } = await build();

    const result = await service.login({ email: 'a@b.com', password: 'Correct-Horse-9!' });

    expect(result).toEqual({
      accessToken: 'signed.jwt',
      refreshToken: 'signed.jwt',
      sessionId: 'session-1',
    });
    expect(sessionService.updateRefreshTokenHash).toHaveBeenCalledWith('session-1', 'signed.jwt');
  });

  it('rejects a wrong password without creating a session', async () => {
    const { service, sessionService } = await build();

    await expect(service.login({ email: 'a@b.com', password: 'wrong' })).rejects.toBeInstanceOf(UnauthorizedException);

    expect(sessionService.create).not.toHaveBeenCalled();
  });
});
