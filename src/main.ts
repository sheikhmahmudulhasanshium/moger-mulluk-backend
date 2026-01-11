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
            styleSrc: [`'self'`, `'unsafe-inline'`],
            imgSrc: [`'self'`, 'data:', 'validator.swagger.io'],
            scriptSrc: [`'self'`, `https: 'unsafe-inline'`],
          },
        },
      }),
    );

    const sanitizeFn = sanitize as unknown as <T>(data: T) => T;
    app.use((req: Request, _res: Response, next: NextFunction) => {
      if (req.body) {
        req.body = sanitizeFn(req.body) as Record<string, unknown>;
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
    // Moved to /api/docs to avoid conflict with health check
    SwaggerModule.setup('api/docs', app, document, {
      customfavIcon: '/favicon.ico',
      customSiteTitle: 'Moger Mulluk API Docs',
    });

    await app.init();
    cachedApp = app
      .getHttpAdapter()
      .getInstance() as unknown as ExpressInstance;

    // LOCAL DEVELOPMENT ONLY
    if (process.env.VERCEL !== '1') {
      const port = process.env.PORT || 3001;
      await app.listen(port);
      console.log(`🏰 Kingdom running on: http://localhost:${port}`);
      console.log(`📜 Docs: http://localhost:3001/api/docs`);
    }
  }
  return cachedApp;
}

// LOCAL START
if (process.env.VERCEL !== '1') {
  void bootstrap();
}

// VERCEL START
export default async (req: Request, res: Response) => {
  const app = await bootstrap();
  return app(req, res);
};
