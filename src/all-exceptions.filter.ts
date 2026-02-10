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
    const url = httpAdapter.getRequestUrl(request) as string;

    if (url.endsWith('.css')) {
      httpAdapter.setHeader(response, 'Content-Type', 'text/css');
      httpAdapter.reply(
        response,
        '/* Asset Not Found */',
        HttpStatus.NOT_FOUND,
      );
      return;
    }
    if (url.endsWith('.js')) {
      httpAdapter.setHeader(response, 'Content-Type', 'application/javascript');
      httpAdapter.reply(response, '// Asset Not Found', HttpStatus.NOT_FOUND);
      return;
    }

    const httpStatus: number =
      exception instanceof HttpException
        ? exception.getStatus()
        : (HttpStatus.INTERNAL_SERVER_ERROR as number);

    let message = 'Unknown error';

    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, unknown>;
        message =
          typeof resObj.message === 'string'
            ? resObj.message
            : JSON.stringify(res);
      } else if (typeof res === 'string') {
        message = res;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    // Cast to number to fix comparison error
    if (
      httpStatus !== (HttpStatus.NOT_FOUND as number) ||
      url.startsWith('/api')
    ) {
      this.logger.error(
        `Status: ${httpStatus} | Path: ${url} | Error: ${message}`,
      );
    }

    const responseBody = {
      statusCode: httpStatus,
      timestamp: new Date().toISOString(),
      path: url,
      message: message,
    };

    httpAdapter.reply(response, responseBody, httpStatus);
  }
}
