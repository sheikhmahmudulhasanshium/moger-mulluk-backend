import { Module } from '@nestjs/common';
import { join } from 'path';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LanguagesModule } from './languages/languages.module'; // Import this

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    // 1. Static Landing Page
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'public'),
      renderPath: '/',
    }),

    // 2. Dual Database Strategy
    MongooseModule.forRoot(
      `${process.env.MONGODB_URI}/metadata?retryWrites=true&w=majority`,
      { connectionName: 'metadata' },
    ),
    MongooseModule.forRoot(
      `${process.env.MONGODB_URI}/products?retryWrites=true&w=majority`,
      { connectionName: 'products' },
    ),

    // 3. Feature Modules
    LanguagesModule, // <--- Add the module here

    // 4. Rate Limiting
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 20 }]),
  ],
  controllers: [AppController], // Cleaned up
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
