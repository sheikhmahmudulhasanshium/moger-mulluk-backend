import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(
    @InjectConnection('metadata') private metadataConn: Connection,
    @InjectConnection('products') private productsConn: Connection,
    private configService: ConfigService,
  ) {}

  getSystemStatus() {
    // Explicitly cast to number to satisfy strict ESLint rules
    // 1 = Connected in Mongoose readyState
    const isMetadataConnected = (this.metadataConn.readyState as number) === 1;
    const isProductsConnected = (this.productsConn.readyState as number) === 1;

    return {
      name: 'Moger Mulluk API',
      version: '1.0.0',
      status: 'Online',
      database: {
        metadata: isMetadataConnected ? 'Connected' : 'Disconnected',
        products: isProductsConnected ? 'Connected' : 'Disconnected',
      },
      // Check if critical .env is loaded
      environment: !!this.configService.get<string>('MONGODB_URI'),
      docs: '/api/docs',
      timestamp: new Date().toISOString(),
    };
  }
}
