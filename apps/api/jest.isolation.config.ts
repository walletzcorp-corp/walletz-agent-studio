import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  testPathPattern: 'tests/tenant-isolation',
  transform: {
    '[\\\\/]node_modules[\\\\/]@nestjs[\\\\/](bullmq|bull-shared|axios)[\\\\/].+\\.js$': '<rootDir>/../jest.esm-transform.cjs',
    '^.+\\.ts$': 'ts-jest',
  },
  transformIgnorePatterns: ['/node_modules/(?!@nestjs/(bullmq|bull-shared|axios)/)'],
  testEnvironment: 'node',
  testTimeout: 60_000,
  setupFiles: ['../jest.isolation.setup.ts'],
};

export default config;
