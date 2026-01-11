import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { ValidationPipe, Logger, INestApplication } from '@nestjs/common';
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

async function bootstrap(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule);
  const httpAdapterHost = app.get(HttpAdapterHost);

  app.useGlobalFilters(new AllExceptionsFilter(httpAdapterHost));
  app.setGlobalPrefix('api', { exclude: ['/'] });
  app.use(helmet({ contentSecurityPolicy: false }));

  // FIX: Refined cast to avoid unsafe assignment
  const sanitizeFn = sanitize as <T>(data: T) => T;

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
  SwaggerModule.setup('api', app, document);

  return app;
}

export default async (req: Request, res: Response): Promise<void> => {
  if (!cachedApp) {
    const app = await bootstrap();
    await app.init();
    cachedApp = app
      .getHttpAdapter()
      .getInstance() as unknown as ExpressInstance;
  }
  return cachedApp(req, res);
};

// LOCAL DEVELOPMENT SUPPORT
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  const logger = new Logger('Bootstrap');
  // FIX: Added 'void' to satisfy @typescript-eslint/no-floating-promises
  void bootstrap()
    .then(async (app) => {
      const port = process.env.PORT || 3001;
      await app.listen(port);
      logger.log(`🚀 Server ready at http://localhost:${port}/api`);
    })
    .catch((err: unknown) => {
      console.error('💥 Error starting server', err);
    });
}
