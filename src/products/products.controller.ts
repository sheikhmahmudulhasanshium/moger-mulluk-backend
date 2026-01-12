import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SearchQueryDto } from './dto/search-query.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @ApiOperation({ summary: 'Admin: Create product' })
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Get('stats/count')
  @ApiOperation({ summary: 'System: Get counts and breakdown' })
  getProductCount() {
    return this.productsService.getProductStats();
  }

  @Get('search/:lang')
  @ApiOperation({ summary: 'Public: Search by keywords (q and lang required)' })
  search(@Param('lang') lang: string, @Query() query: SearchQueryDto) {
    return this.productsService.searchProducts(lang, query);
  }

  @Get('menu/:lang')
  @ApiOperation({ summary: 'Public: Get card view menu' })
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
  @ApiOperation({ summary: 'Public: Get full product details' })
  getDetail(@Param('lang') lang: string, @Param('shortId') shortId: string) {
    return this.productsService.getProductDetail(shortId, lang);
  }

  @Get('admin/raw')
  @ApiOperation({ summary: 'Admin: Get all raw documents' })
  findAllRaw(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.productsService.findAllRaw(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Admin: Update product' })
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Admin: Delete product' })
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
