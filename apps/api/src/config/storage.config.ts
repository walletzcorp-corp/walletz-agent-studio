import { registerAs } from '@nestjs/config';

export const storageConfig = registerAs('storage', () => ({
  // Local filesystem storage (default — no external accounts required)
  localRoot: process.env['STORAGE_LOCAL_ROOT'],
  minFreeGb: process.env['STORAGE_MIN_FREE_GB'] ? Number(process.env['STORAGE_MIN_FREE_GB']) : 5,
  // Legacy / unused S3-compatible fields (kept for future reference)
  endpoint: process.env['STORAGE_ENDPOINT'],
  accessKey: process.env['STORAGE_ACCESS_KEY'],
  secretKey: process.env['STORAGE_SECRET_KEY'],
}));
