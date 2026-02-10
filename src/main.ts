import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { ValidationPipe, Logger, INestApplication } from '@nestjs/common';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AllExceptionsFilter } from './all-exceptions.filter';
import helmet from 'helmet';
import compression from 'compression';
import * as mongoSanitize from 'mongo-sanitize';
import { Request, Response, NextFunction } from 'express';

type SanitizeFn = <T>(data: T) => T;
interface MongoSanitizeModule {
  default: SanitizeFn;
}
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
  // Added generic type <HttpAdapterHost> to fix the "Unsafe assignment" error
  const httpAdapterHost = app.get<HttpAdapterHost>(HttpAdapterHost);

  app.useGlobalFilters(new AllExceptionsFilter(httpAdapterHost));
  app.setGlobalPrefix('api', { exclude: ['/'] });
  app.use(
    helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }),
  );

  const sanitizeFn =
    typeof mongoSanitize === 'function'
      ? (mongoSanitize as unknown as SanitizeFn)
      : (mongoSanitize as unknown as MongoSanitizeModule).default;

  app.use((req: Request, _res: Response, next: NextFunction) => {
    const sanitizeReq = req as unknown as SanitizeRequest;
    if (sanitizeReq.body && typeof sanitizeFn === 'function') {
      sanitizeReq.body = sanitizeFn(sanitizeReq.body);
    }
    // FIX: Cast to function type to satisfy both Vercel and ESLint
    (next as () => void)();
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
  cachedApp(req, res);
};

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  const logger = new Logger('Bootstrap');
  bootstrap()
    .then(async (app) => {
      await app.listen(process.env.PORT || 3001);
      logger.log(`🚀 Server ready at http://localhost:3001/api`);
    })
    .catch((err: Error) => console.error(err));
}
