import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LanguagesModule } from './languages/languages.module';
import { FaqModule } from './faq/faq.module';
import { ProductsModule } from './products/products.module';
import { PagesModule } from './pages/pages.module';
import { CloudinaryModule } from './common/cloudinary/cloudinary.module';
import { Media, MediaSchema } from './media/media.schema';
import { MediaModule } from './media/media.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CloudinaryModule,

    // Recommendation: One default connection for serverless stability
    MongooseModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI'),
        dbName: 'moger_mulluk_v2', // Use one primary database
        serverSelectionTimeoutMS: 5000,
      }),
      inject: [ConfigService],
    }),

    // Keep named connections only if they point to different clusters
    // Otherwise, map them to the default connection for stability
    MongooseModule.forRootAsync({
      connectionName: 'products',
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI'),
        dbName: 'products',
      }),
      inject: [ConfigService],
    }),

    MongooseModule.forRootAsync({
      connectionName: 'metadata',
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI'),
        dbName: 'metadata',
      }),
      inject: [ConfigService],
    }),

    MongooseModule.forFeature(
      [{ name: Media.name, schema: MediaSchema }],
      'metadata',
    ),

    LanguagesModule,
    FaqModule,
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 20 }]),
    ProductsModule,
    PagesModule,
    MediaModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
