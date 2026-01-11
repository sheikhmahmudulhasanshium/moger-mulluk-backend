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
    const url = httpAdapter.getRequestUrl(request) as unknown as string;

    // FIX: Handle asset failures with correct MIME types
    if (url.endsWith('.css')) {
      response.setHeader('Content-Type', 'text/css');
      httpAdapter.reply(
        response,
        '/* Asset Not Found */',
        HttpStatus.NOT_FOUND,
      );
      return;
    }
    if (url.endsWith('.js')) {
      response.setHeader('Content-Type', 'application/javascript');
      httpAdapter.reply(response, '// Asset Not Found', HttpStatus.NOT_FOUND);
      return;
    }
    if (url.includes('favicon') || url.includes('.map')) {
      httpAdapter.reply(response, '', HttpStatus.NOT_FOUND);
      return;
    }

    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
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

    // Only log if it's an API route or a real server error
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
