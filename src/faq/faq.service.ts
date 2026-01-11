import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Faq } from './schemas/faq.schema';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';
import { nanoid } from 'nanoid';

export interface TransformedFaq {
  _id: string;
  shortId: string;
  question: string;
  answer: string;
  position: number;
  link: string;
  updatedAt: Date;
}

@Injectable()
export class FaqService {
  constructor(
    @InjectModel(Faq.name, 'metadata') private faqModel: Model<Faq>,
  ) {}

  async create(createFaqDto: CreateFaqDto): Promise<Faq> {
    if (!createFaqDto.question?.en || !createFaqDto.answer?.en) {
      throw new BadRequestException('English (en) translation is mandatory');
    }

    const pos = createFaqDto.position ?? 0;
    const shortId = `faq--${pos}--${nanoid(6)}`;

    const createdFaq = new this.faqModel({
      ...createFaqDto,
      shortId,
    });

    return await createdFaq.save();
  }

  async findAll(): Promise<Faq[]> {
    return await this.faqModel.find().sort({ position: 1 }).exec();
  }

  // Find Raw Document by MongoDB ID
  async findOne(id: string): Promise<Faq> {
    const faq = await this.faqModel.findById(id).exec();
    if (!faq) throw new NotFoundException(`FAQ with ID ${id} not found`);
    return faq;
  }

  // NEW: Find Raw Document by Short ID (Admin use)
  async findByShortId(shortId: string): Promise<Faq> {
    const faq = await this.faqModel.findOne({ shortId }).exec();
    if (!faq)
      throw new NotFoundException(`FAQ with shortId ${shortId} not found`);
    return faq;
  }

  async findAllByLang(lang: string): Promise<TransformedFaq[]> {
    const faqs = await this.faqModel
      .find({ hide: false })
      .sort({ position: 1 })
      .exec();
    return faqs.map((faq) => this.transformByLang(faq, lang));
  }

  async findOneByLang(id: string, lang: string): Promise<TransformedFaq> {
    const faq = await this.faqModel.findById(id).exec();
    if (!faq || faq.hide)
      throw new NotFoundException(`FAQ with ID ${id} not found`);
    return this.transformByLang(faq, lang);
  }

  // NEW: Find Transformed Document by Lang and ShortId (Public use)
  async findOneByLangByShortId(
    lang: string,
    shortId: string,
  ): Promise<TransformedFaq> {
    const faq = await this.faqModel.findOne({ shortId }).exec();
    if (!faq || faq.hide)
      throw new NotFoundException(`FAQ with shortId ${shortId} not found`);
    return this.transformByLang(faq, lang);
  }

  async update(id: string, updateFaqDto: UpdateFaqDto): Promise<Faq> {
    let shortId: string | undefined;

    if (updateFaqDto.position !== undefined) {
      shortId = `faq--${updateFaqDto.position}--${nanoid(6)}`;
    }

    const updated = await this.faqModel
      .findByIdAndUpdate(
        id,
        {
          ...updateFaqDto,
          ...(shortId ? { shortId } : {}),
        },
        { new: true },
      )
      .exec();

    if (!updated) throw new NotFoundException(`FAQ with ID ${id} not found`);
    return updated;
  }

  async remove(id: string) {
    const deleted = await this.faqModel.findByIdAndDelete(id).exec();
    if (!deleted) throw new NotFoundException(`FAQ not found`);
    return { deleted: true };
  }

  private transformByLang(faq: Faq, lang: string): TransformedFaq {
    return {
      _id: faq._id.toString(),
      shortId: faq.shortId || `faq--${faq.position}--legacy`,
      question: faq.question[lang] || faq.question['en'] || '',
      answer: faq.answer[lang] || faq.answer['en'] || '',
      position: faq.position,
      link: faq.link || '',
      updatedAt: faq.updatedAt,
    };
  }
}
