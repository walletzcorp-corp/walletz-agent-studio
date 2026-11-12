import { ForbiddenException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import { AuthService } from '../auth.service';
import type { UsersService } from '../../users/users.service';
import type { SessionService } from '../session.service';
import type { MfaService } from '../mfa.service';
import type { MailService } from '../../../shared/mail/mail.service';
import type { AuditService } from '../../../shared/audit/audit.service';

function build(env: Record<string, string | undefined>) {
  const users = {
    findByEmail: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({ id: 'u1', email: 'novo@empresa.com' }),
  };
  const config = { get: jest.fn((k: string, d?: unknown) => env[k] ?? d) };
  const mail = { sendEmailVerification: jest.fn().mockResolvedValue(undefined) };
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  const service = new AuthService(
    users as unknown as UsersService,
    {} as JwtService,
    config as unknown as ConfigService,
    {} as SessionService,
    {} as MfaService,
    mail as unknown as MailService,
    audit as unknown as AuditService,
  );
  return { service, users };
}

const dto = { email: 'novo@empresa.com', password: 'SenhaForte123', firstName: 'Novo' };

describe('AuthService.register — cadastro público', () => {
  it('fica fechado por padrão (sem ALLOW_PUBLIC_SIGNUP)', async () => {
    const { service, users } = build({});
    await expect(service.register(dto)).rejects.toBeInstanceOf(ForbiddenException);
    expect(users.create).not.toHaveBeenCalled();
  });

  it('fica fechado com ALLOW_PUBLIC_SIGNUP=false', async () => {
    const { service, users } = build({ ALLOW_PUBLIC_SIGNUP: 'false' });
    await expect(service.register(dto)).rejects.toBeInstanceOf(ForbiddenException);
    expect(users.create).not.toHaveBeenCalled();
  });

  it('abre somente com ALLOW_PUBLIC_SIGNUP=true', async () => {
    const { service, users } = build({ ALLOW_PUBLIC_SIGNUP: 'true', BCRYPT_ROUNDS: '4' });
    await expect(service.register(dto)).resolves.toEqual({ userId: 'u1', email: 'novo@empresa.com' });
    expect(users.create).toHaveBeenCalledTimes(1);
  });
});
