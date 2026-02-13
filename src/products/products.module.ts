import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { Product, ProductSchema } from './schemas/product.schema';
import { CloudinaryModule } from '@/common/cloudinary/cloudinary.module';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [
    MongooseModule.forFeature(
      [{ name: Product.name, schema: ProductSchema }],
      'products',
    ),
    CloudinaryModule,
    MediaModule, // Added to allow ProductsService to use MediaService
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
