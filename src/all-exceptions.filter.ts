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

    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message = 'Unknown error';

    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      // FIX: Use Record<string, unknown> instead of any
      if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, unknown>;
        message =
          typeof resObj.message === 'string'
            ? resObj.message
            : JSON.stringify(res);
      } else {
        message = res;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    this.logger.error(
      `Status: ${httpStatus} | Path: ${httpAdapter.getRequestUrl(request)} | Error: ${message}`,
    );

    // FIX: Explicitly type the response body
    const responseBody: Record<string, unknown> = {
      statusCode: httpStatus,
      timestamp: new Date().toISOString(),
      path: httpAdapter.getRequestUrl(request),
      message: message,
    };

    httpAdapter.reply(response, responseBody, httpStatus);
  }
}
