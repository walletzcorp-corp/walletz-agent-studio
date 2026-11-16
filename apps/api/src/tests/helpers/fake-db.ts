/**
 * Minimal chainable stand-in for the Drizzle query builder, for unit tests only.
 * Every awaited query chain resolves to the next entry of `results` ([] when exhausted);
 * `.set()` / `.values()` arguments are recorded so tests can assert on writes.
 */
export interface FakeDb {
  db: Record<'select' | 'update' | 'insert' | 'delete', () => unknown>;
  sets: Array<Record<string, unknown>>;
  inserted: unknown[];
}

export function createFakeDb(results: unknown[] = []): FakeDb {
  const queue = [...results];
  const sets: Array<Record<string, unknown>> = [];
  const inserted: unknown[] = [];

  const chain: unknown = new Proxy(() => undefined, {
    get(_target, prop) {
      if (prop === 'then') {
        return (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
          Promise.resolve(queue.length > 0 ? queue.shift() : []).then(resolve, reject);
      }
      if (prop === 'set') {
        return (v: Record<string, unknown>) => {
          sets.push(v);
          return chain;
        };
      }
      if (prop === 'values') {
        return (v: unknown) => {
          inserted.push(v);
          return chain;
        };
      }
      return () => chain;
    },
  });

  return {
    db: {
      select: () => chain,
      update: () => chain,
      insert: () => chain,
      delete: () => chain,
    },
    sets,
    inserted,
  };
}
