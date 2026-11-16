import { queueConsumers, queueRole } from '../queue-role';

describe('queue role', () => {
  const original = process.env['QUEUE_ROLE'];
  afterEach(() => {
    if (original === undefined) delete process.env['QUEUE_ROLE'];
    else process.env['QUEUE_ROLE'] = original;
  });

  it('defaults to "all" and keeps the consumers (local development)', () => {
    delete process.env['QUEUE_ROLE'];
    expect(queueRole()).toBe('all');
    expect(queueConsumers('a', 'b')).toEqual(['a', 'b']);
  });

  it('drops the consumers in an API-only process', () => {
    process.env['QUEUE_ROLE'] = 'api';
    expect(queueConsumers('a', 'b')).toEqual([]);
  });

  it('keeps the consumers in the worker and ignores unknown values', () => {
    process.env['QUEUE_ROLE'] = 'worker';
    expect(queueConsumers('a')).toEqual(['a']);
    process.env['QUEUE_ROLE'] = 'bogus';
    expect(queueRole()).toBe('all');
  });
});
