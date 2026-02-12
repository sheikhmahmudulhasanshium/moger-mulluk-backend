import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('AllExceptionsFilter');
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const url = httpAdapter.getRequestUrl(ctx.getRequest<Request>()) as string;

    const status: number =
      exception instanceof HttpException
        ? exception.getStatus()
        : (HttpStatus.INTERNAL_SERVER_ERROR as number);

    if (status !== (HttpStatus.NOT_FOUND as number) || url.startsWith('/api')) {
      this.logger.error(`Status: ${status} | Path: ${url}`);
    }

    httpAdapter.reply(
      response,
      { statusCode: status, path: url, timestamp: new Date().toISOString() },
      status,
    );
  }
}
