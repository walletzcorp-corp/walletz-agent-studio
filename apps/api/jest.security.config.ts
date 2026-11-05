import type { Config } from 'jest';

/** Security / isolation E2E suites: real PostgreSQL + Redis, one worker, long timeouts. */
const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.e2e-spec\\.ts$',
  transform: {
    '[\\\\/]node_modules[\\\\/]@nestjs[\\\\/](bullmq|bull-shared|axios)[\\\\/].+\\.js$':
      '<rootDir>/../jest.esm-transform.cjs',
    '^.+\\.ts$': 'ts-jest',
  },
  transformIgnorePatterns: ['/node_modules/(?!@nestjs/(bullmq|bull-shared|axios)/)'],
  testEnvironment: 'node',
  testTimeout: 120_000,
  maxWorkers: 1,
  forceExit: true,
  setupFiles: ['../jest.e2e.setup.ts'],
};

export default config;
