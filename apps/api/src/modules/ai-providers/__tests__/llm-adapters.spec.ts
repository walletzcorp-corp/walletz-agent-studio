import { classifyProviderError, LlmProviderError, redactSecrets } from '../llm/llm.types';
import { extractErrorMessage, OpenAiCompatibleAdapter, toWireToolName } from '../llm/openai-compatible.adapter';
import { pickDefaultModel } from '../llm/provider-catalog';

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
});
