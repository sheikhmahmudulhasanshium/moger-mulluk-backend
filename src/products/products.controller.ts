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
import { ApiTags } from '@nestjs/swagger';
@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Get('stats/count')
  getProductCount() {
    return this.productsService.getProductStats();
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
  }
}
