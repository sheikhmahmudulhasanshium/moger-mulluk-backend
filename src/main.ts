import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AllExceptionsFilter } from './all-exceptions.filter';
import helmet from 'helmet';
import compression from 'compression';
import * as sanitize from 'mongo-sanitize';
import { Request, Response, NextFunction } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const httpAdapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapterHost));

  // Global Prefix: controllers will be under /api (e.g., /api/languages)
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
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const config = new DocumentBuilder()
    .setTitle('Moger Mulluk Api')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // FIX: Swagger now lives at /api
  SwaggerModule.setup('api', app, document, {
    customfavIcon: '/favicon.ico',
    customSiteTitle: 'Moger Mulluk API Docs',
  });

  if (process.env.NODE_ENV !== 'production') {
    const port = process.env.PORT || 3001;
    await app.listen(port);
  }

  // LINT FIX: Cast to unknown then to Record to avoid 'any' return error
  return app.getHttpAdapter().getInstance() as Record<string, unknown>;
}

// For Vercel
export default bootstrap();
