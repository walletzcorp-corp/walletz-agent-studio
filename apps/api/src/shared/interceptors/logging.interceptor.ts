import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Request, Response } from 'express';
import { createLogger } from '../telemetry/logger';

const logger = createLogger('HTTP');

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const res = context.switchToHttp().getResponse<Response>();
        logger.info({
          method: req.method,
          // Sem a query: o retorno do OAuth traz o código de autorização e o state nela.
          path: req.url.split('?')[0],
          status: res.statusCode,
          duration: Date.now() - start,
        }, 'HTTP request');
      }),
    );
  }
}
