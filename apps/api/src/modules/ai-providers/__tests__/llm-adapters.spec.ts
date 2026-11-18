import { classifyProviderError, LlmProviderError, redactSecrets } from '../llm/llm.types';
import { extractErrorMessage, OpenAiCompatibleAdapter, toWireToolName } from '../llm/openai-compatible.adapter';
import { modelCandidates, pickDefaultModel } from '../llm/provider-catalog';

describe('classificação de erros do provedor', () => {
  it.each([
    [401, 'invalid x-api-key', 'auth'],
    [403, 'permission denied', 'auth'],
    [402, 'Insufficient credits', 'billing'],
    [400, 'Your credit balance is too low to access the Anthropic API', 'billing'],
    [429, 'You exceeded your current quota, please check your plan and billing details', 'billing'],
    [429, 'Rate limit reached for requests', 'rate_limit'],
    [404, 'The model `gpt-9` does not exist', 'model'],
    [400, 'model: claude-x not found', 'model'],
    [500, 'internal error', 'unavailable'],
    [undefined, 'fetch failed', 'unavailable'],
    [400, 'messages: field required', 'bad_request'],
  ] as const)('%s %s → %s', (status, message, kind) => {
    expect(classifyProviderError(status, message)).toBe(kind);
  });

  describe('cota do Google (Gemini), que usa a mesma frase do OpenAI', () => {
    const googleIntro =
      'You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits.';

    it('cota gratuita por minuto estourada → rate_limit (não é faturamento)', () => {
      const msg = `${googleIntro} * Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 10, model: gemini-2.5-flash — RESOURCE_EXHAUSTED`;
      expect(classifyProviderError(429, msg)).toBe('rate_limit');
    });

    it('modelo sem cota gratuita (limit: 0) → billing', () => {
      const msg = `${googleIntro} * Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_input_token_count, limit: 0, model: gemini-2.5-pro — RESOURCE_EXHAUSTED`;
      expect(classifyProviderError(429, msg)).toBe('billing');
    });

    it('limit: 0 no fim de mensagem longa ainda vira billing (classifica antes de cortar)', () => {
      const msg = `${googleIntro} ${'x'.repeat(800)} limit: 0, model: gemini-2.5-pro — RESOURCE_EXHAUSTED`;
      expect(redactSecrets(msg)).not.toContain('limit: 0');
      expect(classifyProviderError(429, msg)).toBe('billing');
    });

    it('limite 10 ou 100 não é confundido com zero', () => {
      expect(classifyProviderError(429, `RESOURCE_EXHAUSTED limit: 100`)).toBe('rate_limit');
      expect(classifyProviderError(429, `RESOURCE_EXHAUSTED limit: 0.5`)).toBe('rate_limit');
    });

    it('OpenAI sem crédito continua billing', () => {
      expect(
        classifyProviderError(429, 'You exceeded your current quota, please check your plan and billing details. — insufficient_quota'),
      ).toBe('billing');
    });

    it('detalhes da cota do Gemini (details) entram na mensagem, na frente', () => {
      const body = [
        {
          error: {
            code: 429,
            message: googleIntro,
            status: 'RESOURCE_EXHAUSTED',
            details: [
              {
                '@type': 'type.googleapis.com/google.rpc.QuotaFailure',
                violations: [
                  {
                    quotaMetric: 'generativelanguage.googleapis.com/generate_content_free_tier_requests',
                    quotaId: 'GenerateRequestsPerMinutePerProjectPerModel-FreeTier',
                    quotaValue: '10',
                  },
                ],
              },
              { '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '14s' },
            ],
          },
        },
      ];
      const msg = extractErrorMessage(body, 'x');
      expect(msg.startsWith('Cota GenerateRequestsPerMinutePerProjectPerModel-FreeTier, limit: 10; tente em 14s')).toBe(true);
      expect(classifyProviderError(429, msg)).toBe('rate_limit');
    });
  });

  it('remove chave do Google no formato novo (AQ.…)', () => {
    const key = 'AQ.Fake1234567890abcdefghijklmnopQRSTUVWXYZ-_0123456789'; // fictícia
    const text = redactSecrets(`API key not valid: ${key}`);
    expect(text).not.toContain(key.slice(8));
    expect(text).toContain('AQ.Fake…');
  });

  it('remove chaves de mensagens antes de guardar/logar', () => {
    const text = redactSecrets('Incorrect API key provided: sk-proj-abcdefghijklmnopqrstuvwxyz and AIzaSyA1234567890abcdef');
    expect(text).not.toContain('abcdefghijklmnopqrstuvwxyz');
    expect(text).not.toContain('1234567890abcdef');
  });
});

describe('adaptador OpenAI-compatível', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('nomes de ferramenta com ponto viram nomes aceitos pela API', () => {
    expect(toWireToolName('pc.readFile')).toBe('pc__readFile');
    expect(toWireToolName('get_availability')).toBe('get_availability');
  });

  it('lê mensagem de erro nos formatos OpenAI e Gemini', () => {
    expect(extractErrorMessage({ error: { message: 'bad key', code: 'invalid_api_key' } }, 'x')).toBe('bad key — invalid_api_key');
    expect(extractErrorMessage([{ error: { message: 'API key not valid', status: 'INVALID_ARGUMENT' } }], 'x')).toBe(
      'API key not valid — INVALID_ARGUMENT',
    );
  });

  it('executa o ciclo de ferramenta e devolve o nome original', async () => {
    const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
    const responses = [
      {
        choices: [
          {
            finish_reason: 'tool_calls',
            message: {
              content: null,
              tool_calls: [{ id: 'c1', type: 'function', function: { name: 'pc__readFile', arguments: '{"path":"/a"}' } }],
            },
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      },
      { choices: [{ finish_reason: 'stop', message: { content: 'pronto' } }], usage: { prompt_tokens: 20, completion_tokens: 3 } },
    ];
    global.fetch = jest.fn(async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), body: JSON.parse(String(init?.body)) as Record<string, unknown> });
      return new Response(JSON.stringify(responses.shift()), { status: 200, headers: { 'content-type': 'application/json' } });
    }) as typeof fetch;

    const adapter = new OpenAiCompatibleAdapter({ provider: 'openai', baseUrl: 'https://api.test/v1', maxTokensField: 'max_completion_tokens' });
    const session = adapter.createSession({
      apiKey: 'sk-test-key-123456',
      model: 'gpt-4.1-mini',
      system: 'sys',
      history: [{ role: 'user', content: 'oi' }],
      tools: [{ name: 'pc.readFile', description: 'ler', inputSchema: { properties: { path: { type: 'string' } }, required: ['path'] } }],
      maxTokens: 100,
    });

    const first = await session.send();
    expect(first.toolCalls).toEqual([{ id: 'c1', name: 'pc.readFile', input: { path: '/a' } }]);
    session.addToolResults([{ id: 'c1', output: '{"ok":true}' }]);
    const second = await session.send();
    expect(second.text).toBe('pronto');

    expect(calls[0]!.url).toBe('https://api.test/v1/chat/completions');
    expect(calls[0]!.body['max_completion_tokens']).toBe(100);
    const secondMessages = calls[1]!.body['messages'] as Array<Record<string, unknown>>;
    expect(secondMessages.map((m) => m['role'])).toEqual(['system', 'user', 'assistant', 'tool']);
    expect(secondMessages[3]).toMatchObject({ role: 'tool', tool_call_id: 'c1' });
  });

  it('falha de faturamento vira LlmProviderError do tipo billing', async () => {
    global.fetch = jest.fn(async () =>
      new Response(JSON.stringify({ error: { message: 'You exceeded your current quota', code: 'insufficient_quota' } }), { status: 429 }),
    ) as typeof fetch;
    const adapter = new OpenAiCompatibleAdapter({ provider: 'openai', baseUrl: 'https://api.test/v1', maxTokensField: 'max_tokens' });
    const err = await adapter
      .createSession({ apiKey: 'k', model: 'm', system: 's', history: [{ role: 'user', content: 'x' }], tools: [], maxTokens: 5 })
      .send()
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(LlmProviderError);
    expect((err as LlmProviderError).kind).toBe('billing');
  });
});

describe('modelo padrão', () => {
  it('escolhe o preferido disponível na conta, inclusive versão datada', () => {
    expect(pickDefaultModel('anthropic', ['claude-haiku-4-5', 'claude-sonnet-4-6'])).toBe('claude-sonnet-4-6');
    expect(pickDefaultModel('anthropic', ['claude-sonnet-4-5-20250929'])).toBe('claude-sonnet-4-5-20250929');
    expect(pickDefaultModel('gemini', [])).toBeNull();
  });

  it('Gemini: prefere Flash-Lite (responde em conta gratuita) e ordena os candidatos', () => {
    const available = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-3.5-flash', 'gemini-flash-lite-latest', 'gemini-3.1-flash-lite'];
    expect(pickDefaultModel('gemini', available)).toBe('gemini-3.1-flash-lite');
    expect(modelCandidates('gemini', available)).toEqual([
      'gemini-3.1-flash-lite',
      'gemini-flash-lite-latest',
      'gemini-3.5-flash',
      'gemini-2.5-flash',
    ]);
    // Nenhum preferido na conta: o primeiro da lista do provedor.
    expect(modelCandidates('gemini', ['gemini-9-ultra'])).toEqual(['gemini-9-ultra']);
  });
});
