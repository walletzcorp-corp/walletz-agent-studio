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
    // http-errors thrown by Express/body-parser (413 payload too large, 400 bad JSON...) are
    // client errors and must not be reported as server faults.
    const clientError = (exception as { status?: unknown; expose?: unknown } | null) ?? {};
    const exposedStatus =
      !(exception instanceof HttpException) &&
      clientError.expose === true &&
      typeof clientError.status === 'number' &&
      clientError.status >= 400 &&
      clientError.status < 500
        ? clientError.status
        : undefined;

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : (exposedStatus ?? HttpStatus.INTERNAL_SERVER_ERROR);

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : exposedStatus
          ? ((exception as Error).message ?? 'Bad request')
          : 'Internal server error';

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
