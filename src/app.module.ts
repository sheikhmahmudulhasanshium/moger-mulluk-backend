import { Module } from '@nestjs/common';
import { join } from 'path';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LanguagesModule } from './languages/languages.module'; // Import this
import { FaqModule } from './faq/faq.module';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'public'),
      renderPath: '/',
    }),

    // Strategy: Ensure only ONE slash exists between URI and DB Name
    MongooseModule.forRootAsync({
      connectionName: 'metadata',
      useFactory: (config: ConfigService) => {
        const uri = config.get<string>('MONGODB_URI')?.replace(/\/$/, '') ?? '';
        return {
          uri: `${uri}/metadata?retryWrites=true&w=majority`,
          serverSelectionTimeoutMS: 5000, // Fail after 5 seconds if DB not found
        };
      },
      inject: [ConfigService],
    }),

    MongooseModule.forRootAsync({
      connectionName: 'products',
      useFactory: (config: ConfigService) => {
        const uri = config.get<string>('MONGODB_URI')?.replace(/\/$/, '') ?? '';
        return { uri: `${uri}/products?retryWrites=true&w=majority` };
      },
      inject: [ConfigService],
    }),

    LanguagesModule,
    FaqModule,

    ThrottlerModule.forRoot([{ ttl: 60000, limit: 20 }]),
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
