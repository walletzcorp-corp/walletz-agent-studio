import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Request, Response } from 'express';
import { createLogger } from '../telemetry/logger';

const logger = createLogger('HTTP');

const SENSITIVE_PARAMS = new Set([
  'token',
  'code',
  'state',
  'secret',
  'password',
  'refresh_token',
  'access_token',
  'api_key',
  'apikey',
]);

function sanitizeUrl(url: string): string {
  try {
    const idx = url.indexOf('?');
    if (idx === -1) return url;
    const path = url.slice(0, idx);
    const params = new URLSearchParams(url.slice(idx + 1));
    for (const key of params.keys()) {
      if (SENSITIVE_PARAMS.has(key.toLowerCase())) {
        params.set(key, '[REDACTED]');
      }
    }
    return `${path}?${params.toString()}`;
  } catch {
    return url;
  }
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const res = context.switchToHttp().getResponse<Response>();
        logger.info(
          {
            method: req.method,
            path: sanitizeUrl(req.url),
            status: res.statusCode,
            duration: Date.now() - start,
          },
          'HTTP request',
        );
      }),
    );
  }
}
