import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AllExceptionsFilter } from './all-exceptions.filter';
import helmet from 'helmet';
import compression from 'compression';
import * as mongoSanitize from 'mongo-sanitize';
import { Request, Response, NextFunction } from 'express';
import { join } from 'path'; // 1. Import join
import { NestExpressApplication } from '@nestjs/platform-express'; // 2. Import this

type SanitizeFn = (data: unknown) => unknown;
type ExpressInstance = (
  req: Request,
  res: Response,
  next?: NextFunction,
) => void;

let cachedApp: ExpressInstance;

async function bootstrap(): Promise<NestExpressApplication> {
  // 3. Add <NestExpressApplication> here
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 4. Tell Nest to serve the public folder
  // This allows the browser to find /logo.svg, /favicon.ico, etc.
  app.useStaticAssets(join(process.cwd(), 'public'));

  const httpAdapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapterHost));

  app.setGlobalPrefix('api', { exclude: ['/'] });

  app.use(
    helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }),
  );

  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (req.body && typeof req.body === 'object') {
      const sanitize = mongoSanitize as SanitizeFn;
      req.body = sanitize(req.body) as Record<string, unknown>;
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
    customSiteTitle: 'Moger Mulluk API Docs',
    customJs: [
      'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.11.2/swagger-ui-bundle.js',
      'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.11.2/swagger-ui-standalone-preset.js',
    ],
    customCssUrl: [
      'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.11.2/swagger-ui.css',
    ],
  });

  return app;
}

export default async (req: Request, res: Response): Promise<void> => {
  try {
    if (!cachedApp) {
      const app = await bootstrap();
      await app.init();
      const instance = app.getHttpAdapter().getInstance() as unknown;
      cachedApp = instance as ExpressInstance;
    }
    cachedApp(req, res);
  } catch (err: unknown) {
    console.error('VERCEL_CRASH:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        error: 'Bootstrap Failed',
        message: err instanceof Error ? err.message : String(err),
      }),
    );
  }
};

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  const logger = new Logger('Bootstrap');
  bootstrap()
    .then(async (app) => {
      await app.listen(3001);
      logger.log(`🚀 Server ready at http://localhost:3001/api`);
    })
    .catch((err) => console.error(err));
}
