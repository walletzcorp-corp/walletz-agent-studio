import { BadRequestException } from '@nestjs/common';
import { CampaignsService, type SendPolicyResult } from '../campaigns.service';
import { createFakeDb } from '../../../tests/helpers/fake-db';

const CAMPAIGN = {
  id: 'camp-1',
  tenantId: 'tenant-1',
  status: 'draft',
  templateName: 'promo',
  templateLanguage: null,
  templateComponents: [{ type: 'body' }],
};

function eligibility(recipients: Array<{ contactId: string; phone: string }>): SendPolicyResult {
  return { eligible: recipients.length, blocked: 0, reasons: {}, sampleBlocked: [], recipients };
}

function build(results: unknown[]) {
  const fake = createFakeDb(results);
  const queue = { add: jest.fn().mockResolvedValue(undefined) };
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  const service = new CampaignsService(
    fake.db as never,
    audit as never,
    { assertAgent: jest.fn(), assertSegment: jest.fn() } as never,
    queue as never,
  );
  return { fake, queue, audit, service };
}

describe('CampaignsService.launchCampaign', () => {
  it('creates one recipient row and one retryable dispatch job per eligible contact', async () => {
    // selects/writes in order: getCampaign, WhatsApp account, update status, insert r1, insert r2
    const { fake, queue, audit, service } = build([
      [CAMPAIGN],
      [{ id: 'wa-1' }],
      [],
      [{ id: 'rcpt-1' }],
      [{ id: 'rcpt-2' }],
    ]);
    jest.spyOn(service, 'checkEligibility').mockResolvedValue(
      eligibility([
        { contactId: 'c1', phone: '+5511999990001' },
        { contactId: 'c2', phone: '+5511999990002' },
      ]),
    );

    const result = await service.launchCampaign('tenant-1', 'camp-1', 'user-1');

    expect(result.status).toBe('running');
    expect(fake.sets).toContainEqual(expect.objectContaining({ status: 'running' }));
    expect(fake.inserted).toEqual([
      expect.objectContaining({
        campaignId: 'camp-1',
        contactId: 'c1',
        phone: '+5511999990001',
        status: 'pending',
      }),
      expect.objectContaining({
        campaignId: 'camp-1',
        contactId: 'c2',
        phone: '+5511999990002',
        status: 'pending',
      }),
    ]);
    expect(queue.add).toHaveBeenCalledTimes(2);
    expect(queue.add).toHaveBeenNthCalledWith(
      2,
      'dispatch',
      {
        campaignId: 'camp-1',
        tenantId: 'tenant-1',
        recipientId: 'rcpt-2',
        phone: '+5511999990002',
        accountId: 'wa-1',
        templateName: 'promo',
        templateLanguage: 'pt_BR',
        templateComponents: [{ type: 'body' }],
      },
      { attempts: 3, backoff: { type: 'exponential', delay: 10000 } },
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'campaign.launch', tenantId: 'tenant-1' }),
    );
  });

  it('refuses to launch when nobody is eligible and enqueues nothing', async () => {
    const { queue, service } = build([[CAMPAIGN]]);
    jest.spyOn(service, 'checkEligibility').mockResolvedValue(eligibility([]));

    await expect(service.launchCampaign('tenant-1', 'camp-1', 'user-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(queue.add).not.toHaveBeenCalled();
  });

  it('refuses to launch a campaign that is already running', async () => {
    const { queue, service } = build([[{ ...CAMPAIGN, status: 'running' }]]);

    await expect(service.launchCampaign('tenant-1', 'camp-1', 'user-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(queue.add).not.toHaveBeenCalled();
  });

  it('does not mark the campaign running when the tenant has no WhatsApp account', async () => {
    const { fake, queue, service } = build([[CAMPAIGN], []]);
    jest
      .spyOn(service, 'checkEligibility')
      .mockResolvedValue(eligibility([{ contactId: 'c1', phone: '+5511999990001' }]));

    await expect(service.launchCampaign('tenant-1', 'camp-1', 'user-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(fake.sets).toEqual([]);
    expect(queue.add).not.toHaveBeenCalled();
  });
});
