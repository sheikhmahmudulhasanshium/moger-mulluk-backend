import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LanguagesService } from './languages.service';
import { LanguagesController } from './languages.controller';
import { Language, LanguageSchema } from './schemas/language.schema';

@Module({
  imports: [
    MongooseModule.forFeature(
      [{ name: Language.name, schema: LanguageSchema }],
      'metadata', // <--- Important: Matches Connection Name in AppModule
    ),
  ],
  controllers: [LanguagesController],
  providers: [LanguagesService],
})
export class LanguagesModule {}
