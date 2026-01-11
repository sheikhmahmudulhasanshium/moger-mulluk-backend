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

    // Double cast to string to satisfy ESLint
    const url = httpAdapter.getRequestUrl(request) as unknown as string;

    // 1. SILENCE BROWSER NOISE & FIX SWAGGER MIME ERRORS
    const isBrowserNoise =
      url.includes('.well-known') ||
      url.includes('favicon.ico') ||
      url.endsWith('.js') ||
      url.endsWith('.css') ||
      url.endsWith('.map');

    if (isBrowserNoise) {
      httpAdapter.reply(response, 'Not Found', HttpStatus.NOT_FOUND);
      return;
    }

    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus() // FIX: Removed 'as number' (unnecessary assertion)
        : (HttpStatus.INTERNAL_SERVER_ERROR as number);

    let message = 'Unknown error';

    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, unknown>;
        if (Array.isArray(resObj.message)) {
          message = (resObj.message as unknown[]).join(', ');
        } else if (typeof resObj.message === 'string') {
          message = resObj.message;
        } else {
          message = JSON.stringify(res);
        }
      } else {
        message = res;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    // 2. ONLY LOG ACTUAL API ERRORS
    // FIX: Prettier formatting applied and parentheses added around enum cast
    if (
      httpStatus !== (HttpStatus.NOT_FOUND as number) ||
      url.startsWith('/api')
    ) {
      this.logger.error(
        `Status: ${httpStatus} | Path: ${url} | Error: ${message}`,
      );
    }

    const responseBody: Record<string, unknown> = {
      statusCode: httpStatus,
      timestamp: new Date().toISOString(),
      path: url,
      message: message,
    };

    httpAdapter.reply(response, responseBody, httpStatus);
  }
}
