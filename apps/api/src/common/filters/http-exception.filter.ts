import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const correlationId = (request.headers['x-correlation-id'] as string) ?? randomUUID();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Erro interno do servidor';

    // Não expõe detalhes de erro interno em produção
    const body =
      typeof message === 'string'
        ? { statusCode: status, message, correlationId }
        : { ...(message as object), statusCode: status, correlationId };

    if (status >= 500) {
      this.logger.error(`[${correlationId}] ${request.method} ${request.url}`, exception as Error);
    }

    response.status(status).json(body);
  }
}
