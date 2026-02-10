import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SearchQueryDto } from './dto/search-query.dto';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { UpdateMediaOrderDto } from './dto/update-media-order.dto';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Patch(':id/media')
  @ApiOperation({ summary: 'Admin: Upload product images' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        thumbnail: {
          type: 'string',
          format: 'binary',
          description: 'One image file',
        },
        gallery: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Multiple image files',
        },
      },
    },
  })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'thumbnail', maxCount: 1 },
      { name: 'gallery', maxCount: 10 },
    ]),
  )
  async uploadMedia(
    @Param('id') id: string,
    @UploadedFiles()
    files: {
      thumbnail?: Express.Multer.File[];
      gallery?: Express.Multer.File[];
    },
  ) {
    if (!files || (!files.thumbnail && !files.gallery)) {
      throw new BadRequestException('No files provided in the request');
    }
    return this.productsService.uploadProductMedia(id, files);
  }

  @Post()
  @ApiOperation({ summary: 'Admin: Create product' })
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Get('stats/count')
  @ApiOperation({ summary: 'System: Get counts' })
  getProductCount() {
    return this.productsService.getProductStats();
  }

  @Get('search/:lang')
  search(@Param('lang') lang: string, @Query() query: SearchQueryDto) {
    return this.productsService.searchProducts(lang, query);
  }

  @Get('menu/:lang')
  getMenu(
    @Param('lang') lang: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('cat') cat?: string,
  ) {
    return this.productsService.getMenuCards(
      lang,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
      cat,
    );
  }

  @Get('detail/:lang/:shortId')
  getDetail(@Param('lang') lang: string, @Param('shortId') shortId: string) {
    return this.productsService.getProductDetail(shortId, lang);
  }

  @Get('admin/raw')
  findAllRaw(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.productsService.findAllRaw(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  } // Add UpdateMediaOrderDto to imports
  // Inside ProductsController class
  @Patch(':id/media/reorder')
  @ApiOperation({ summary: 'Admin: Reorder gallery or swap thumbnail' })
  async updateMediaOrder(
    @Param('id') id: string,
    @Body() updateMediaOrderDto: UpdateMediaOrderDto,
  ) {
    return this.productsService.updateMediaOrder(id, updateMediaOrderDto);
  }
}
