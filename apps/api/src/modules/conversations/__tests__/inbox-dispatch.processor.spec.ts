import type { Job } from 'bullmq';
import { InboxDispatchProcessor, type InboxDispatchJobData } from '../inbox-dispatch.processor';
import { createFakeDb } from '../../../tests/helpers/fake-db';

const JOB_DATA: InboxDispatchJobData = {
  messageId: 'msg-1',
  conversationId: 'conv-1',
  tenantId: 'tenant-1',
  contactId: 'contact-1',
  text: 'Olá!',
};

const job = { data: JOB_DATA } as unknown as Job<InboxDispatchJobData>;

function build(results: unknown[], sendTextMessage = jest.fn().mockResolvedValue({ status: 'sent' })) {
  const fake = createFakeDb(results);
  const processor = new InboxDispatchProcessor(fake.db as never, { sendTextMessage } as never);
  return { fake, processor, sendTextMessage };
}

describe('InboxDispatchProcessor', () => {
  it('marks the message sent after delivering through the tenant WhatsApp account', async () => {
    const { fake, processor, sendTextMessage } = build([[{ id: 'wa-1' }], [{ phone: '+5511999990001' }]]);

    await processor.process(job);

    expect(sendTextMessage).toHaveBeenCalledWith('tenant-1', 'wa-1', {
      to: '+5511999990001',
      text: 'Olá!',
      idempotencyKey: 'inbox-msg-1',
    });
    expect(fake.sets).toEqual([expect.objectContaining({ status: 'sent' })]);
  });

  it('fails without retrying when the tenant has no connected WhatsApp account', async () => {
    const { fake, processor, sendTextMessage } = build([[]]);

    await expect(processor.process(job)).resolves.toBeUndefined();

    expect(sendTextMessage).not.toHaveBeenCalled();
    expect(fake.sets).toEqual([
      expect.objectContaining({ status: 'failed', failureReason: 'No connected WhatsApp account' }),
    ]);
  });

  it('fails without retrying when the contact has no WhatsApp number', async () => {
    const { fake, processor, sendTextMessage } = build([[{ id: 'wa-1' }], []]);

    await expect(processor.process(job)).resolves.toBeUndefined();

    expect(sendTextMessage).not.toHaveBeenCalled();
    expect(fake.sets).toEqual([
      expect.objectContaining({ status: 'failed', failureReason: 'Contact has no WhatsApp phone' }),
    ]);
  });

  it('records the provider error and rethrows so BullMQ retries', async () => {
    const sendTextMessage = jest.fn().mockRejectedValue(new Error('Meta 500'));
    const { fake, processor } = build([[{ id: 'wa-1' }], [{ phone: '+5511999990001' }]], sendTextMessage);

    await expect(processor.process(job)).rejects.toThrow('Meta 500');

    expect(fake.sets).toEqual([expect.objectContaining({ status: 'failed', failureReason: 'Meta 500' })]);
  });
});
