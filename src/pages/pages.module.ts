import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PagesService } from './pages.service';
import { PagesController } from './pages.controller';
import { Page, PageSchema } from './schemas/page.schema';

@Module({
  imports: [
    MongooseModule.forFeature(
      [{ name: Page.name, schema: PageSchema }],
      'metadata',
    ),
  ],
  controllers: [PagesController],
  providers: [PagesService],
})
export class PagesModule {}
