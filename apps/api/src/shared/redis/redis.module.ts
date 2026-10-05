import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_TOKEN = Symbol('REDIS');

@Global()
@Module({
  providers: [
    {
      provide: REDIS_TOKEN,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const url = configService.getOrThrow<string>('REDIS_URL');
        const client = new Redis(url, {
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
          lazyConnect: false,
        });

        client.on('error', (err: Error) => {
          process.stderr.write(`[Redis] Error: ${err.message}\n`);
        });

        return client;
      },
    },
  ],
  exports: [REDIS_TOKEN],
})
export class RedisModule {}
