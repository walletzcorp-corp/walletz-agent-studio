import { HttpException } from '@nestjs/common';
import type { DrizzleDB } from '../../../database/database.module';
import type { AiProviderConnection } from '../../../database/schema/ai-providers';
import { EncryptionService } from '../../../shared/crypto/encryption.service';
import type { AuditService } from '../../../shared/audit/audit.service';
import type { PlanLimitsService } from '../../../shared/plans/plan-limits.service';
import { AiProvidersService } from '../ai-providers.service';
import { LlmProviderError } from '../llm/llm.types';

process.env.ENCRYPTION_KEY = 'a'.repeat(64);
const encryption = new EncryptionService();

function row(over: Partial<AiProviderConnection> = {}): AiProviderConnection {
  return {
    id: 'c1',
    tenantId: 't1',
    provider: 'anthropic',
    label: null,
    encryptedApiKey: encryption.encrypt('sk-ant-cliente-1234'),
    keyLast4: '1234',
    defaultModel: 'claude-sonnet-4-6',
    isDefault: true,
    status: 'active',
    lastValidatedAt: null,
    lastError: null,
    lastErrorAt: null,
    rateLimits: null,
    createdByUserId: 'u1',
    createdAt: new Date('2026-11-01'),
    updatedAt: new Date('2026-11-01'),
    deletedAt: null,
    ...over,
  };
}

/** DB falso: selects devolvem `rows`; updates são registrados. */
function fakeDb(rows: AiProviderConnection[]) {
  const updates: Array<Record<string, unknown>> = [];
  const selectChain = (): unknown =>
    new Proxy(
      {},
      {
        get(_t, prop) {
          if (prop === 'then') return (resolve: (v: unknown) => void) => resolve(rows);
          return () => selectChain();
        },
      },
    );
  const db = {
    select: () => selectChain(),
    update: () => ({
      set: (values: Record<string, unknown>) => {
        updates.push(values);
        return { where: () => Promise.resolve([]) };
      },
    }),
  } as unknown as DrizzleDB;
  return { db, updates };
}

function service(rows: AiProviderConnection[]) {
  const { db, updates } = fakeDb(rows);
  const audit = { log: jest.fn(async () => undefined) };
  const svc = new AiProvidersService(
    db,
    encryption,
    audit as unknown as AuditService,
    {} as PlanLimitsService,
  );
  return { svc, updates, audit };
}

describe('AiProvidersService — chave por cliente (BYOK)', () => {
  it('sem conexão: bloqueia com AI_PROVIDER_NOT_CONFIGURED (não existe chave da plataforma)', async () => {
    const { svc } = service([]);
    const err = await svc.resolveForAgent('t1', null).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(HttpException);
    expect((err as HttpException).getResponse()).toMatchObject({ error: 'AI_PROVIDER_NOT_CONFIGURED' });
  });

  it('usa a chave do próprio cliente, decifrada só na hora da chamada', async () => {
    const { svc } = service([row()]);
    const resolved = await svc.resolveForAgent('t1', null);
    expect(resolved.apiKey).toBe('sk-ant-cliente-1234');
    expect(resolved.model).toBe('claude-sonnet-4-6');
  });

  it('agente com conexão própria tem prioridade sobre a padrão', async () => {
    const { svc } = service([
      row({ id: 'c1', isDefault: true }),
      row({ id: 'c2', isDefault: false, provider: 'openai', defaultModel: 'gpt-4.1-mini' }),
    ]);
    expect((await svc.resolveForAgent('t1', 'c2')).provider).toBe('openai');
    expect((await svc.resolveForAgent('t1', null)).connectionId).toBe('c1');
  });

  it('faturamento recusado: não chama o provedor e informa "indisponível por faturamento" (402)', async () => {
    const { svc } = service([row({ status: 'billing_error' })]);
    const err = (await svc.resolveForAgent('t1', null).catch((e: unknown) => e)) as HttpException;
    expect(err.getStatus()).toBe(402);
    expect(err.getResponse()).toMatchObject({ error: 'AI_PROVIDER_BILLING' });
    expect(JSON.stringify(err.getResponse())).toContain('indisponível por faturamento');
  });

  it('chave recusada pelo provedor marca a conexão como inválida', async () => {
    const { svc, updates, audit } = service([row()]);
    const httpErr = await svc.handleProviderFailure('t1', 'c1', new LlmProviderError('auth', 'anthropic', 'invalid x-api-key', 401));
    expect(httpErr.getResponse()).toMatchObject({ error: 'AI_PROVIDER_INVALID_KEY' });
    expect(updates[0]).toMatchObject({ status: 'invalid' });
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'ai_connection.failed' }));
  });

  it('sem crédito marca billing_error; limite de taxa não muda o status', async () => {
    const a = service([row()]);
    await a.svc.handleProviderFailure('t1', 'c1', new LlmProviderError('billing', 'openai', 'insufficient_quota', 429));
    expect(a.updates[0]).toMatchObject({ status: 'billing_error' });

    const b = service([row()]);
    const err = await b.svc.handleProviderFailure('t1', 'c1', new LlmProviderError('rate_limit', 'openai', 'slow down', 429));
    expect(err.getStatus()).toBe(429);
    expect(b.updates).toHaveLength(0);
  });

  it('a visão da conexão nunca contém a chave, só a máscara', () => {
    const { svc } = service([]);
    const view = svc.toView(row());
    expect(JSON.stringify(view)).not.toContain('sk-ant-cliente');
    expect(view.maskedKey).toBe('••••••••1234');
    expect(view).not.toHaveProperty('encryptedApiKey');
  });
});
