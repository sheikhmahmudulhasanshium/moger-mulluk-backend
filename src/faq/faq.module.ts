import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FaqService } from './faq.service';
import { FaqController } from './faq.controller';
import { Faq, FaqSchema } from './schemas/faq.schema';

@Module({
  imports: [
    MongooseModule.forFeature(
      [{ name: Faq.name, schema: FaqSchema }],
      'metadata',
    ),
  ],
  controllers: [FaqController],
  providers: [FaqService],
})
export class FaqModule {}
