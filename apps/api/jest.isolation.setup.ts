// Isolation tests require a real DB and Redis
// These must be set in environment before running

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set for isolation tests. Use the test database.');
}
if (!process.env.REDIS_URL) {
  throw new Error('REDIS_URL must be set for isolation tests.');
}
if (!process.env.JWT_ACCESS_SECRET) {
  process.env.JWT_ACCESS_SECRET = 'test-access-secret-isolation-suite';
}
if (!process.env.JWT_REFRESH_SECRET) {
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-isolation-suite';
}
