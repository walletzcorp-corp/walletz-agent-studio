import type { Job } from 'bullmq';
import {
  CampaignDispatchProcessor,
  type CampaignDispatchJobData,
} from '../campaign-dispatch.processor';
import { createFakeDb } from '../../../tests/helpers/fake-db';

const JOB_DATA: CampaignDispatchJobData = {
  campaignId: 'camp-1',
  tenantId: 'tenant-1',
  recipientId: 'rcpt-1',
  phone: '+5511999990002',
  accountId: 'wa-1',
  templateName: 'promo',
  templateLanguage: 'pt_BR',
  templateComponents: [],
};

function jobAt(attemptsMade: number, attempts = 3): Job<CampaignDispatchJobData> {
  return {
    data: JOB_DATA,
    attemptsMade,
    opts: { attempts },
  } as unknown as Job<CampaignDispatchJobData>;
}

function build(sendTemplateMessage: jest.Mock) {
  const fake = createFakeDb();
  const processor = new CampaignDispatchProcessor(
    fake.db as never,
    { sendTemplateMessage } as never,
  );
  return { fake, processor };
}

describe('CampaignDispatchProcessor', () => {
  it('sends the template idempotently and counts the recipient as sent', async () => {
    const send = jest.fn().mockResolvedValue({ status: 'sent' });
    const { fake, processor } = build(send);

    await processor.process(jobAt(0));

    expect(send).toHaveBeenCalledWith('tenant-1', 'wa-1', {
      to: '+5511999990002',
      templateName: 'promo',
      templateLanguage: 'pt_BR',
      templateComponents: [],
      idempotencyKey: 'campaign-camp-1-rcpt-1',
    });
    expect(fake.sets).toContainEqual(expect.objectContaining({ status: 'sent' }));
    expect(fake.sets.some((s) => 'totalSent' in s)).toBe(true);
    expect(fake.sets.some((s) => 'totalFailed' in s)).toBe(false);
  });

  it('does not count a failure while BullMQ still has attempts left', async () => {
    const { fake, processor } = build(jest.fn().mockRejectedValue(new Error('timeout')));

    await expect(processor.process(jobAt(0))).rejects.toThrow('timeout');
    await expect(processor.process(jobAt(1))).rejects.toThrow('timeout');

    expect(fake.sets).toEqual([]);
  });

  it('counts the failure once, on the final attempt, and still rethrows', async () => {
    const { fake, processor } = build(jest.fn().mockRejectedValue(new Error('Meta 401')));

    await expect(processor.process(jobAt(2))).rejects.toThrow('Meta 401');

    expect(fake.sets).toContainEqual(expect.objectContaining({ status: 'failed' }));
    expect(fake.sets.filter((s) => 'totalFailed' in s)).toHaveLength(1);
    expect(fake.sets.some((s) => 'totalSent' in s)).toBe(false);
  });

  it('treats a job without an attempts option as a single, final attempt', async () => {
    const { fake, processor } = build(jest.fn().mockRejectedValue(new Error('boom')));
    const noAttempts = {
      data: JOB_DATA,
      attemptsMade: 0,
      opts: {},
    } as unknown as Job<CampaignDispatchJobData>;

    await expect(processor.process(noAttempts)).rejects.toThrow('boom');

    expect(fake.sets.filter((s) => 'totalFailed' in s)).toHaveLength(1);
  });
});
