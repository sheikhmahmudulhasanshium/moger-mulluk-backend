import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AllExceptionsFilter } from './all-exceptions.filter';
import helmet from 'helmet';
import compression from 'compression';
import * as sanitize from 'mongo-sanitize';
import { Request, Response, NextFunction } from 'express';

type ExpressInstance = (
  req: Request,
  res: Response,
  next?: NextFunction,
) => void;

interface RequestWithBody extends Request {
  body: Record<string, unknown>;
}

let cachedApp: ExpressInstance;

async function bootstrap(): Promise<ExpressInstance> {
  if (!cachedApp) {
    const app = await NestFactory.create(AppModule);

    const httpAdapterHost = app.get(HttpAdapterHost);
    app.useGlobalFilters(new AllExceptionsFilter(httpAdapterHost));

    app.setGlobalPrefix('api', { exclude: ['/'] });

    // 1. FIXED HELMET: Added 'connect-src' and expanded 'script-src' for CDN
    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: [`'self'`],
            styleSrc: [`'self'`, `'unsafe-inline'`, 'cdn.jsdelivr.net'],
            scriptSrc: [`'self'`, `'unsafe-inline'`, 'cdn.jsdelivr.net'],
            imgSrc: [`'self'`, 'data:', 'validator.swagger.io'],
            connectSrc: [`'self'`, 'cdn.jsdelivr.net'], // Essential for .map files
          },
        },
      }),
    );

    const sanitizeFn = sanitize as unknown as <T>(data: T) => T;

    // 2. FIXED BUILD ERROR: Use explicit callback type for next
    app.use((req: Request, _res: Response, next: () => void) => {
      const request = req as RequestWithBody;
      if (request.body) {
        request.body = sanitizeFn(request.body);
      }
      next();
    });

    app.use(compression());
    app.enableCors();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );

    const config = new DocumentBuilder()
      .setTitle('Moger Mulluk Api')
      .setVersion('1.0')
      .build();

    const document = SwaggerModule.createDocument(app, config);

    // 3. FIXED SWAGGER: Forced use of CDN and absolute URLs
    SwaggerModule.setup('api', app, document, {
      customfavIcon: '/favicon.ico',
      customSiteTitle: 'Moger Mulluk API Docs',
      customJs: [
        'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.11.0/swagger-ui-bundle.js',
        'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.11.0/swagger-ui-standalone-preset.js',
      ],
      customCssUrl: [
        'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.11.0/swagger-ui.css',
      ],
    });

    await app.init();
    cachedApp = app
      .getHttpAdapter()
      .getInstance() as unknown as ExpressInstance;
  }
  return cachedApp;
}

export default async (req: Request, res: Response) => {
  const app = await bootstrap();
  return app(req, res);
};

// Added back for Local dev support
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  void bootstrap();
}
