import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AllExceptionsFilter } from './all-exceptions.filter';
import helmet from 'helmet';
import compression from 'compression';
import * as sanitize from 'mongo-sanitize';
import { Request, Response, NextFunction } from 'express';

// 1. Define strict types to satisfy ESLint
type ExpressInstance = (
  req: Request,
  res: Response,
  next?: NextFunction,
) => void;

// Interface to allow safe access to 'body' without using 'any'
interface RequestWithBody extends Request {
  body: Record<string, unknown>;
}

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

    // 2. Sanitization (Strict ESLint Fix)
    const sanitizeFn = sanitize as unknown as <T>(data: T) => T;
    app.use((req: Request, _res: Response, next: NextFunction) => {
      // Cast to our local interface instead of 'any'
      const request = req as RequestWithBody;
      if (request.body) {
        request.body = sanitizeFn(request.body);
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
    SwaggerModule.setup('api', app, document, {
      customfavIcon: '/favicon.ico',
      customSiteTitle: 'Moger Mulluk API Docs',
    });

    await app.init();

    // 3. Local Development Port Listener
    if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
      const port = process.env.PORT || 3001;
      await app.listen(port);
    }

    cachedApp = app
      .getHttpAdapter()
      .getInstance() as unknown as ExpressInstance;
  }
  return cachedApp;
}

// 4. VERCEL HANDLER EXPORT
export default async (req: Request, res: Response): Promise<void> => {
  const app = await bootstrap();
  app(req, res);
};

// 5. LOCAL STARTUP
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  void bootstrap();
}
