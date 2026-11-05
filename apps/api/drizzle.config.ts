import type { Config } from 'drizzle-kit';

export default {
  schema: './src/database/schema/index.ts',
  out: './src/database/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url:
      process.env['DATABASE_URL'] ??
      'postgresql://walletz:walletz_dev_password@localhost:5432/walletz_dev',
  },
  verbose: true,
  strict: true,
} satisfies Config;
