import * as crypto from 'crypto';
import { BadRequestException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { DrizzleDB } from '../../../database/database.module';
import type { EncryptionService } from '../../../shared/crypto/encryption.service';
import type { AuditService } from '../../../shared/audit/audit.service';
import type { PlanLimitsService } from '../../../shared/plans/plan-limits.service';
import type { OutboxRelayService } from '../../../shared/outbox/outbox-relay.service';
import { signPayload, WebhooksService } from '../webhooks.service';
import { normalizeOrigin } from '../../webchat/webchat.service';

function service(nodeEnv: string) {
  return new WebhooksService(
    {} as DrizzleDB,
    {} as EncryptionService,
    {} as AuditService,
    {} as PlanLimitsService,
    { registerHandler: jest.fn() } as unknown as OutboxRelayService,
    { get: () => nodeEnv } as unknown as ConfigService,
  );
}

describe('webhooks de saída', () => {
  it('assinatura HMAC-SHA256 de "timestamp.corpo" verificável pelo cliente', () => {
    const body = JSON.stringify({ event: 'message.received' });
    const sig = signPayload('whsec_abc', '1700000000', body);
    const expected = crypto.createHmac('sha256', 'whsec_abc').update(`1700000000.${body}`).digest('hex');
    expect(sig).toBe(expected);
  });

  it.each([
    'http://exemplo.com.br/hook',
    'https://127.0.0.1/hook',
    'https://10.0.0.5/hook',
    'https://192.168.1.10/hook',
    'https://169.254.169.254/latest/meta-data',
    'https://[::1]/hook',
    'https://user:pass@exemplo.com.br/hook',
    'nao-e-url',
  ])('em produção recusa destino inseguro: %s', async (url) => {
    await expect(service('production').assertSafeUrl(url)).rejects.toThrow(BadRequestException);
  });

  it('em produção aceita IP público com https', async () => {
    await expect(service('production').assertSafeUrl('https://8.8.8.8/hook')).resolves.toBeInstanceOf(URL);
  });

  it('em desenvolvimento aceita http local (testes)', async () => {
    await expect(service('development').assertSafeUrl('http://localhost:4000/hook')).resolves.toBeInstanceOf(URL);
  });
});

describe('webchat — sites autorizados', () => {
  it('normaliza para a origem (sem caminho)', () => {
    expect(normalizeOrigin('https://www.loja.com.br/contato?x=1')).toBe('https://www.loja.com.br');
  });
  it('recusa origem inválida', () => {
    expect(() => normalizeOrigin('javascript:alert(1)')).toThrow(BadRequestException);
    expect(() => normalizeOrigin('loja.com.br')).toThrow(BadRequestException);
  });
});
