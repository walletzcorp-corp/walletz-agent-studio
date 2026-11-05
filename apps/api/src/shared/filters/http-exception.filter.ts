import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import type { Response, Request } from 'express';
import { createLogger } from '../telemetry/logger';
import { v7 as uuidv7 } from 'uuid';

const logger = createLogger('HttpExceptionFilter');

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorId = uuidv7();
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException ? exception.getResponse() : 'Internal server error';

    if (status >= 500) {
      logger.error(
        {
          errorId,
          path: request.url,
          method: request.method,
          status,
          error: exception instanceof Error ? exception.message : String(exception),
          stack: exception instanceof Error ? exception.stack : undefined,
        },
        'Unhandled exception',
      );
    }

    response.status(status).json({
      statusCode: status,
      errorId,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(typeof message === 'object' ? message : { message }),
    });
  }
}
