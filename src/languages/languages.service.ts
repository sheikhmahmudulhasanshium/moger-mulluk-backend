import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Language } from './schemas/language.schema';
import { CreateLanguageDto } from './dto/create-language.dto';

@Injectable()
export class LanguagesService {
  constructor(
    @InjectModel(Language.name, 'metadata') private langModel: Model<Language>,
  ) {}

  async create(createLanguageDto: CreateLanguageDto) {
    try {
      const newLang = new this.langModel(createLanguageDto);
      return await newLang.save();
    } catch (error: unknown) {
      // Change 'any' to 'unknown'
      // Safely check for MongoDB duplicate key error (code 11000)
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 11000
      ) {
        throw new ConflictException('Language code already exists');
      }
      throw error;
    }
  }
  async findAll() {
    return this.langModel.find().sort({ label: 1 }).exec();
  }

  async findOne(id: string) {
    const lang = await this.langModel.findById(id).exec();
    if (!lang) throw new NotFoundException('Language not found');
    return lang;
  }

  async findByCode(code: string) {
    const lang = await this.langModel
      .findOne({ code: code.toLowerCase() })
      .exec();
    if (!lang)
      throw new NotFoundException(`Language with code ${code} not found`);
    return lang;
  }

  async findByCountry(countryCode: string) {
    return this.langModel
      .find({ CountryCode: countryCode.toUpperCase() })
      .exec();
  }

  async update(id: string, updateData: Partial<CreateLanguageDto>) {
    const updated = await this.langModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
    if (!updated) throw new NotFoundException('Language not found');
    return updated;
  }

  async remove(id: string) {
    const deleted = await this.langModel.findByIdAndDelete(id).exec();
    if (!deleted) throw new NotFoundException('Language not found');
    return { deleted: true };
  }
}
