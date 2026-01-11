import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AllExceptionsFilter } from './all-exceptions.filter';
import helmet from 'helmet';
import compression from 'compression';
import * as sanitize from 'mongo-sanitize';
import { Request, Response, NextFunction } from 'express';

// Define the type for the Express instance
type ExpressInstance = (
  req: Request,
  res: Response,
  next?: NextFunction,
) => void;

async function bootstrap(): Promise<ExpressInstance> {
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
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const config = new DocumentBuilder()
    .setTitle('Moger Mulluk Api')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    customfavIcon: '/favicon.ico',
    customSiteTitle: 'Moger Mulluk API Docs',
  });

  // Local development listen
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const port = process.env.PORT || 3001;
    await app.listen(port);
  }

  await app.init();
  // Double cast to satisfy strict ESLint rules
  return app.getHttpAdapter().getInstance() as unknown as ExpressInstance;
}

// Export the promise for Vercel
export default bootstrap();
