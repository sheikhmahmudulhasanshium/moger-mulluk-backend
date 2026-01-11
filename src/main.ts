import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { ValidationPipe, Logger, INestApplication } from '@nestjs/common';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AllExceptionsFilter } from './all-exceptions.filter';
import helmet from 'helmet';
import compression from 'compression';
import * as sanitize from 'mongo-sanitize';
import { Request, Response, NextFunction } from 'express';

// Define interface to handle strict body typing
interface SanitizeRequest extends Request {
  body: Record<string, unknown>;
}

type ExpressInstance = (
  req: Request,
  res: Response,
  next?: NextFunction,
) => void;

let cachedApp: ExpressInstance;

async function bootstrap(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule);
  const httpAdapterHost = app.get(HttpAdapterHost);

  // 1. Global Filters & Prefix
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapterHost));
  app.setGlobalPrefix('api', { exclude: ['/'] });

  // 2. Security & Middleware
  // ContentSecurityPolicy is disabled to allow Swagger CDN assets to load
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  const sanitizeFn = sanitize as <T>(data: T) => T;
  app.use((req: Request, _res: Response, next: NextFunction) => {
    const sanitizeReq = req as unknown as SanitizeRequest;
    if (sanitizeReq.body) {
      sanitizeReq.body = sanitizeFn(sanitizeReq.body) as unknown as Record<
        string,
        unknown
      >;
    }
    next();
  });

  app.use(compression());
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // 3. Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('Moger Mulluk Api')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);

  // Use reliable CDN for Swagger UI to avoid Vercel 404/MIME errors
  SwaggerModule.setup('api', app, document, {
    customSiteTitle: 'Moger Mulluk API Docs',
    customfavIcon: 'https://swagger.io/favicon.ico',
    customJs: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.js',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.js',
    ],
    customCssUrl: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css',
    ],
  });

  return app;
}

// PRODUCTION / VERCEL EXPORT
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

// LOCAL DEVELOPMENT
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  const logger = new Logger('Bootstrap');
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
