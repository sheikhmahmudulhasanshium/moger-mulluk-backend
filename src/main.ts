import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { ValidationPipe, INestApplication } from '@nestjs/common';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AllExceptionsFilter } from './all-exceptions.filter';
import helmet from 'helmet';
import compression from 'compression';
import * as mongoSanitize from 'mongo-sanitize';
import { Request, Response, NextFunction } from 'express';

type SanitizeFn = <T>(data: T) => T;
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

  // FIX: Cast through unknown to satisfy "@typescript-eslint/no-unsafe-assignment"
  const httpAdapterHost = app.get(HttpAdapterHost);

  app.useGlobalFilters(new AllExceptionsFilter(httpAdapterHost));
  app.setGlobalPrefix('api', { exclude: ['/'] });
  app.use(
    helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }),
  );

  // FIX: Type-safe extraction of sanitize function
  const sanitize = mongoSanitize as unknown as SanitizeFn;

  app.use((req: Request, _res: Response, next: NextFunction) => {
    const sanitizeReq = req as unknown as SanitizeRequest;
    if (sanitizeReq.body && typeof sanitize === 'function') {
      sanitizeReq.body = sanitize(sanitizeReq.body);
    }
    (next as () => void)();
  });

  app.use(compression());
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const config = new DocumentBuilder()
    .setTitle('Moger Mulluk Api')
    .setVersion('1.0')
    .build();
  SwaggerModule.setup('api', app, SwaggerModule.createDocument(app, config));

  return app;
}

// VERCEL EXPORT
export default async (req: Request, res: Response): Promise<void> => {
  try {
    if (!cachedApp) {
      const app = await bootstrap();
      await app.init();
      cachedApp = app
        .getHttpAdapter()
        .getInstance() as unknown as ExpressInstance;
    }
    cachedApp(req, res);
  } catch (err: unknown) {
    console.error('VERCEL_CRASH:', err);
    // Use native Node.js methods to satisfy TS Compiler and ESLint "unsafe" rules
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
  bootstrap()
    .then(async (app) => {
      await app.listen(3001);
    })
    .catch((err) => console.error(err));
}
