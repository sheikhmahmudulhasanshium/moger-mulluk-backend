import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AllExceptionsFilter } from './all-exceptions.filter';
import helmet from 'helmet';
import compression from 'compression';
import * as sanitize from 'mongo-sanitize';
import { Request, Response, NextFunction } from 'express';

// 1. Define strict type for the Express instance to satisfy ESLint
type ExpressInstance = (
  req: Request,
  res: Response,
  next?: NextFunction,
) => void;

let cachedApp: ExpressInstance;

async function bootstrap(): Promise<ExpressInstance> {
  if (!cachedApp) {
    const app = await NestFactory.create(AppModule);

    // 2. Global Exception Filter (Error Checker)
    const httpAdapterHost = app.get(HttpAdapterHost);
    app.useGlobalFilters(new AllExceptionsFilter(httpAdapterHost));

    // 3. Global Prefix (Separates API from Landing Page)
    app.setGlobalPrefix('api', { exclude: ['/'] });

    // 4. Security Middleware (Helmet with Swagger CSP Fix)
    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: [`'self'`],
            styleSrc: [`'self'`, `'unsafe-inline'`],
            imgSrc: [`'self'`, 'data:', 'validator.swagger.io'],
            scriptSrc: [`'self'`, `https: 'unsafe-inline'`],
          },
        },
      }),
    );

    // 5. Sanitization (Safe Double Cast for Strict ESLint)
    const sanitizeFn = sanitize as unknown as <T>(data: T) => T;
    app.use((req: Request, _res: Response, next: NextFunction) => {
      if (req.body) {
        req.body = sanitizeFn(req.body) as Record<string, unknown>;
      }
      next();
    });

    // 6. Performance & Global Validation
    app.use(compression());
    app.enableCors();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    // 7. Swagger Setup (Documentation now at /api)
    const config = new DocumentBuilder()
      .setTitle('Moger Mulluk Api')
      .setDescription('Engine of the Kingdom of Absolute Freedom.')
      .setVersion('1.0')
      .addTag('Moger Mulluk')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document, {
      customfavIcon: '/favicon.ico',
      customSiteTitle: 'Moger Mulluk API Docs',
    });

    // 8. Initialize but do not app.listen (Vercel manages the port)
    await app.init();
    cachedApp = app
      .getHttpAdapter()
      .getInstance() as unknown as ExpressInstance;
  }
  return cachedApp;
}

// 9. VERCEL SERVERLESS HANDLER EXPORT
export default async (req: Request, res: Response): Promise<void> => {
  const appInstance = await bootstrap();
  appInstance(req, res);
};
