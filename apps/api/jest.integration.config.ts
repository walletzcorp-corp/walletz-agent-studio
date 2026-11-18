import type { Config } from 'jest';

/**
 * Testes de integração: rodam contra um Postgres real (DATABASE_URL ou .env.local da raiz).
 * Ficam em src/tests/ e não entram na suíte unitária (`pnpm test`).
 */
const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: 'tests/.*\\.int-spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  testEnvironment: 'node',
  testTimeout: 30_000,
};

export default config;
