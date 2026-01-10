import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AllExceptionsFilter } from './all-exceptions.filter';
import helmet from 'helmet';
import * as compression from 'compression';
import * as sanitize from 'mongo-sanitize';
import { Request, Response, NextFunction } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Error Handling (Global Exception Filter)
  const httpAdapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapterHost));

  // 2. Global Prefix (Moves all routes to /api/...)
  // We exclude '/' so your landing page works on the base URL.
  app.setGlobalPrefix('api', { exclude: ['/'] });

  // 3. Security Middleware (Helmet with Swagger fix)
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

  // 4. Sanitization (Only sanitize req.body to avoid read-only getter errors)
  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (req.body) {
      req.body = (sanitize as (data: unknown) => unknown)(req.body);
    }
    next();
  });

  // 5. Performance & Validation
  app.use(compression());
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 6. Swagger Setup
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

  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
