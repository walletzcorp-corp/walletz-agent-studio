import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
  port: parseInt(process.env['PORT'] ?? '3001', 10),
  appUrl: process.env['APP_URL'] ?? 'http://localhost:3000',
  apiUrl: process.env['API_URL'] ?? 'http://localhost:3001',
  corsAllowedOrigins: (process.env['CORS_ALLOWED_ORIGINS'] ?? 'http://localhost:3000').split(','),
}));
