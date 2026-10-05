import pino from 'pino';

const SENSITIVE_FIELDS = [
  'password',
  'passwordHash',
  'token',
  'accessToken',
  'refreshToken',
  'secret',
  'apiKey',
  'mfaSecret',
  'encryptionKey',
  'authorization',
  'cookie',
];

function redactPaths() {
  return SENSITIVE_FIELDS.flatMap((field) => [
    field,
    `*.${field}`,
    `*.*.${field}`,
    `req.headers.authorization`,
    `req.headers.cookie`,
  ]);
}

const logger = pino({
  level: process.env['LOG_LEVEL'] ?? 'info',
  redact: { paths: redactPaths(), censor: '[REDACTED]' },
  ...(process.env['NODE_ENV'] !== 'production' && {
    transport: { target: 'pino-pretty', options: { colorize: true } },
  }),
});

export function createLogger(context: string) {
  return logger.child({ context });
}

export default logger;
