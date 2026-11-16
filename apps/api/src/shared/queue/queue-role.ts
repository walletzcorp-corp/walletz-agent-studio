/**
 * Where BullMQ consumers run.
 *
 *   QUEUE_ROLE=all     (default) the API process also consumes its queues — local development
 *   QUEUE_ROLE=api     the API only enqueues; consumers run in the worker process
 *   QUEUE_ROLE=worker  set by the worker entrypoint (src/worker.ts); consumes, serves no HTTP
 *
 * Must come from the real process environment (not .env.local): it is read when modules load.
 */
export type QueueRole = 'all' | 'api' | 'worker';

export function queueRole(): QueueRole {
  const raw = process.env['QUEUE_ROLE'];
  return raw === 'api' || raw === 'worker' ? raw : 'all';
}

/** Registers queue consumers (processors) unless this process is API-only. */
export function queueConsumers<T>(...consumers: T[]): T[] {
  return queueRole() === 'api' ? [] : consumers;
}
