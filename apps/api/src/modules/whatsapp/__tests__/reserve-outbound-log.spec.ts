import { WhatsappService } from '../whatsapp.service';
import { createFakeDb } from '../../../tests/helpers/fake-db';

type Reservation = { logId: string; deduplicated: boolean };

function build(results: unknown[]) {
  const fake = createFakeDb(results);
  const service = new WhatsappService(fake.db as never, {} as never, {} as never, {} as never, {} as never);
  const reserve = (key?: string) =>
    (service as unknown as {
      reserveOutboundLog(...args: unknown[]): Promise<Reservation>;
    }).reserveOutboundLog('tenant-1', 'wa-1', '+5511999990001', 'text', { text: 'oi' }, key);
  return { fake, reserve };
}

describe('WhatsappService.reserveOutboundLog', () => {
  it('inserts a pending log when there is no idempotency key', async () => {
    const { fake, reserve } = build([]);

    const result = await reserve();

    expect(result.deduplicated).toBe(false);
    expect(fake.inserted).toEqual([
      expect.objectContaining({ id: result.logId, status: 'pending', idempotencyKey: result.logId }),
    ]);
  });

  it('inserts a pending log when the key has not been used', async () => {
    const { fake, reserve } = build([[]]);

    const result = await reserve('inbox-1');

    expect(result.deduplicated).toBe(false);
    expect(fake.inserted).toEqual([expect.objectContaining({ idempotencyKey: 'inbox-1', tenantId: 'tenant-1' })]);
  });

  it.each(['pending', 'sent', 'delivered', 'read'])(
    'deduplicates when the previous log is %s',
    async (status) => {
      const { fake, reserve } = build([[{ id: 'log-1', status }]]);

      await expect(reserve('inbox-1')).resolves.toEqual({ logId: 'log-1', deduplicated: true });
      expect(fake.inserted).toEqual([]);
      expect(fake.sets).toEqual([]);
    },
  );

  it('re-arms a failed log on retry instead of reporting a phantom success', async () => {
    const { fake, reserve } = build([[{ id: 'log-1', status: 'failed' }]]);

    await expect(reserve('inbox-1')).resolves.toEqual({ logId: 'log-1', deduplicated: false });

    expect(fake.inserted).toEqual([]);
    expect(fake.sets).toEqual([expect.objectContaining({ status: 'pending', errorMessage: null, failedAt: null })]);
  });
});
