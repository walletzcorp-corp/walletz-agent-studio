import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DRIZZLE_TOKEN, type DrizzleDB } from '../../database/database.module';
import { sql } from 'drizzle-orm';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: DrizzleDB,
    private readonly configService: ConfigService,
  ) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check' })
  async health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env['npm_package_version'] ?? '0.1.0',
      environment: this.configService.get('NODE_ENV'),
    };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check' })
  async ready() {
    const checks: Record<string, boolean> = {};

    try {
      await this.db.execute(sql`SELECT 1`);
      checks['database'] = true;
    } catch {
      checks['database'] = false;
    }

    const allReady = Object.values(checks).every(Boolean);

    return {
      status: allReady ? 'ready' : 'not_ready',
      checks,
      timestamp: new Date().toISOString(),
    };
  }
}
