import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Request, Response } from 'express'; // Import both

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('AllExceptionsFilter');

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();

    // FIX 1: Provide the <Request> and <Response> generics here
    // This stops NestJS from returning 'any'
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // FIX 2: Safely extract message without 'any'
    let message = 'Unknown error';
    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      message =
        typeof res === 'object' && res !== null
          ? ((res as Record<string, unknown>).message as string)
          : exception.message;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    this.logger.error(
      `Status: ${httpStatus} | Path: ${httpAdapter.getRequestUrl(request)} | Error: ${message}`,
    );

    // FIX 3: Explicitly type the response body object
    const responseBody: Record<string, unknown> = {
      statusCode: httpStatus,
      timestamp: new Date().toISOString(),
      path: httpAdapter.getRequestUrl(request),
      message:
        httpStatus === (HttpStatus.INTERNAL_SERVER_ERROR as number)
          ? 'Moger Mulluk Internal Server Error'
          : message,
    };

    httpAdapter.reply(response, responseBody, httpStatus);
  }
}
