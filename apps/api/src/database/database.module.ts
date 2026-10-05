import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export const DRIZZLE_TOKEN = Symbol('DRIZZLE');

export type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>;

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE_TOKEN,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const connectionString = configService.getOrThrow<string>('DATABASE_URL');
        const pool = new Pool({
          connectionString,
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
        });
        return drizzle(pool, { schema, logger: configService.get('NODE_ENV') === 'development' });
      },
    },
  ],
  exports: [DRIZZLE_TOKEN],
})
export class DatabaseModule {}
