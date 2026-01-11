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

    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: [`'self'`],
            styleSrc: [`'self'`, `'unsafe-inline'`, 'https://cdn.jsdelivr.net'],
            imgSrc: [`'self'`, 'data:', 'https://validator.swagger.io'],
            scriptSrc: [
              `'self'`,
              `https: 'unsafe-inline'`,
              'https://cdn.jsdelivr.net',
            ],
          },
        },
      }),
    );

    const sanitizeFn = sanitize as unknown as <T>(data: T) => T;
    app.use((req: Request, _res: Response, next: NextFunction) => {
      const request = req as RequestWithBody;
      if (request.body) {
        request.body = sanitizeFn(request.body);
      }
      next(); // This is the line that caused the build error; it is now correctly typed
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

    // FIX: Use CDN for Swagger Assets to prevent MIME/404 errors on Vercel
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

    if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
      const port = process.env.PORT || 3001;
      await app.listen(port);
    }

    cachedApp = app
      .getHttpAdapter()
      .getInstance() as unknown as ExpressInstance;
  }
  return cachedApp;
}

export default async (req: Request, res: Response): Promise<void> => {
  const appInstance = await bootstrap();
  appInstance(req, res);
};

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  void bootstrap();
}
