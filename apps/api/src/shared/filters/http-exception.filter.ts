import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
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
    // Erros do body-parser (corpo grande demais, JSON malformado) chegam como Error com
    // status/type próprios: viram 413/400 claros, não 500.
    const parserError = clientErrorFromBodyParser(exception);
    const status = exception instanceof HttpException
      ? exception.getStatus()
      : parserError?.status ?? HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : parserError?.message ?? 'Internal server error';

    if (status >= 500) {
      logger.error({
        errorId,
        // Sem a query: o retorno do OAuth traz o código de autorização e o state nela.
        path: request.url.split('?')[0],
        method: request.method,
        status,
        error: exception instanceof Error ? exception.message : String(exception),
        stack: exception instanceof Error ? exception.stack : undefined,
      }, 'Unhandled exception');
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

function clientErrorFromBodyParser(exception: unknown): { status: number; message: string } | null {
  if (!exception || typeof exception !== 'object') return null;
  const e = exception as { type?: unknown; status?: unknown };
  if (e.type === 'entity.too.large' || e.status === 413) {
    return { status: HttpStatus.PAYLOAD_TOO_LARGE, message: 'A requisição é grande demais.' };
  }
  if (e.type === 'entity.parse.failed') {
    return { status: HttpStatus.BAD_REQUEST, message: 'JSON inválido no corpo da requisição.' };
  }
  return null;
}
