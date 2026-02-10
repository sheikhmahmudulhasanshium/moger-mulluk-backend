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
import { UpdateMediaOrderDto } from './dto/update-media-order.dto';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @ApiOperation({ summary: 'Admin: Create product' })
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Get('stats/count')
  @ApiOperation({ summary: 'System: Get stats' })
  getProductCount() {
    return this.productsService.getProductStats();
  }

  @Get('admin/raw')
  @ApiOperation({ summary: 'Admin: Get all raw documents' })
  findAllRaw(@Query('page') p?: string, @Query('limit') l?: string) {
    return this.productsService.findAllRaw(
      p ? parseInt(p) : 1,
      l ? parseInt(l) : 20,
    );
  }

  @Get('search/:lang')
  @ApiOperation({ summary: 'Public: Search by keywords' })
  search(@Param('lang') lang: string, @Query() q: SearchQueryDto) {
    return this.productsService.searchProducts(lang, q);
  }

  @Get('menu/:lang')
  @ApiOperation({ summary: 'Public: Get card view menu' })
  getMenu(
    @Param('lang') lang: string,
    @Query('page') p?: string,
    @Query('limit') l?: string,
    @Query('cat') c?: string,
  ) {
    return this.productsService.getMenuCards(
      lang,
      p ? parseInt(p) : 1,
      l ? parseInt(l) : 10,
      c,
    );
  }

  @Get('detail/:lang/:shortId')
  @ApiOperation({ summary: 'Public: Get full details' })
  getDetail(@Param('lang') lang: string, @Param('shortId') sid: string) {
    return this.productsService.getProductDetail(sid, lang);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Admin: Get by Mongo ID' })
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(':id/media')
  @ApiOperation({ summary: 'Admin: Upload images' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        thumbnail: { type: 'string', format: 'binary' },
        gallery: { type: 'array', items: { type: 'string', format: 'binary' } },
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
    if (!files || (!files.thumbnail && !files.gallery))
      throw new BadRequestException('No files');
    return this.productsService.uploadProductMedia(id, files);
  }

  @Patch(':id/media/reorder')
  @ApiOperation({ summary: 'Admin: Reorder gallery' })
  async updateMediaOrder(
    @Param('id') id: string,
    @Body() dto: UpdateMediaOrderDto,
  ) {
    return this.productsService.updateMediaOrder(id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Admin: Update product' })
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Admin: Delete product' })
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
