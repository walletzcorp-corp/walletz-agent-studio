// Mock ESM-only packages before any imports that resolve them
jest.mock('@nestjs/axios', () => ({
  HttpService: class {},
  HttpModule: { register: () => ({}) },
}));
jest.mock('@nestjs/bullmq', () => ({
  InjectQueue: () => () => {},
  BullModule: { registerQueue: () => ({}) },
  Processor: () => () => {},
  WorkerHost: class { process(_job: unknown): Promise<void> { return Promise.resolve(); } },
}));
jest.mock('rxjs', () => ({
  firstValueFrom: jest.fn(),
}));

import * as crypto from 'crypto';
import { WhatsappService } from '../whatsapp.service';
import { WhatsappInboundProcessor } from '../whatsapp.processor';

describe('WhatsApp inbound webhook -> fila durável', () => {
  const originalSecret = process.env.META_APP_SECRET;
  const originalNodeEnv = process.env.NODE_ENV;
  afterEach(() => {
    if (originalSecret === undefined) delete process.env.META_APP_SECRET;
    else process.env.META_APP_SECRET = originalSecret;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  });

  const message = { id: 'wamid.001', from: '5545999999999', timestamp: '1', type: 'text', text: { body: 'Boa tarde' } };
  const webhook = {
    object: 'whatsapp_business_account',
    entry: [{ id: 'waba-id', changes: [{ field: 'messages', value: {
      messaging_product: 'whatsapp',
      metadata: { display_phone_number: '5545000', phone_number_id: 'phone-id' },
      contacts: [{ wa_id: message.from, profile: { name: 'Cliente' } }],
      messages: [message],
    } }] }],
  };

  function setup() {
    const queue = { add: jest.fn().mockResolvedValue({ id: 'queued' }) };
    const service = new WhatsappService(
      {} as never, {} as never, {} as never,
      { hmacSha256: (secret: string, body: Buffer) => crypto.createHmac('sha256', secret).update(body).digest('hex') } as never,
      {} as never, {} as never, {} as never, {} as never, queue as never, {} as never,
    );
    const body = Buffer.from(JSON.stringify(webhook));
    const signature = `sha256=${crypto.createHmac('sha256', 'test-app-secret').update(body).digest('hex')}`;
    return { service, queue, body, signature };
  }

  it('confirma o evento depois de aceitar na fila, com ID determinístico', async () => {
    process.env.META_APP_SECRET = 'test-app-secret';
    process.env.NODE_ENV = 'production';
    const { service, queue, body, signature } = setup();
    await service.handleWebhookEvent(webhook, signature, body);
    await service.handleWebhookEvent(webhook, signature, body);
    expect(queue.add).toHaveBeenCalledTimes(2);
    expect(queue.add.mock.calls[0][2].jobId).toEqual(queue.add.mock.calls[1][2].jobId);
    expect(queue.add.mock.calls[0][1].message.id).toBe(message.id);
    expect(queue.add.mock.calls[0][2].attempts).toBeGreaterThan(1);
  });

  it('nega assinatura adulterada antes de tocar na fila', async () => {
    process.env.META_APP_SECRET = 'test-app-secret';
    process.env.NODE_ENV = 'production';
    const { service, queue, body } = setup();
    await expect(service.handleWebhookEvent(webhook, 'sha256=bad', body)).rejects.toThrow();
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('propaga indisponibilidade da fila para a Meta reenviar o webhook', async () => {
    process.env.META_APP_SECRET = 'test-app-secret';
    process.env.NODE_ENV = 'production';
    const { service, queue, body, signature } = setup();
    queue.add.mockRejectedValueOnce(new Error('Redis indisponível'));
    await expect(service.handleWebhookEvent(webhook, signature, body)).rejects.toThrow('Redis indisponível');
  });

  it('worker chama processamento e propaga erros para ativar retry', async () => {
    const processQueuedInbound = jest.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('LLM indisponível'));
    const processor = new WhatsappInboundProcessor({ processQueuedInbound } as never);
    const job = { data: { phoneNumberId: 'phone-id', message }, id: 'wa-01', attemptsMade: 0, opts: { attempts: 3 } } as never;
    await expect(processor.process(job)).resolves.toBeUndefined();
    await expect(processor.process(job)).rejects.toThrow('LLM indisponível');
    expect(processQueuedInbound).toHaveBeenCalledTimes(2);
  });

  it('na última tentativa a conversa vai para um atendente, e o erro continua registrado', async () => {
    const processQueuedInbound = jest.fn().mockRejectedValue(new Error('Meta fora do ar'));
    const handOffUnanswered = jest.fn().mockResolvedValue(undefined);
    const processor = new WhatsappInboundProcessor({ processQueuedInbound, handOffUnanswered } as never);
    const job = (attemptsMade: number) => ({ data: { phoneNumberId: 'phone-id', message }, id: 'wa-02', attemptsMade, opts: { attempts: 3 } }) as never;
    await expect(processor.process(job(0))).rejects.toThrow('Meta fora do ar');
    await expect(processor.process(job(1))).rejects.toThrow('Meta fora do ar');
    expect(handOffUnanswered).not.toHaveBeenCalled();
    await expect(processor.process(job(2))).rejects.toThrow('Meta fora do ar');
    expect(handOffUnanswered).toHaveBeenCalledTimes(1);
  });
});
