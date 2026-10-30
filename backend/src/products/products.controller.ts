import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  /** GET /products – danh sách menu (id, tên, giá, ảnh, tồn kho) */
  @Get()
  findAll(@Query('category') category?: string) {
    return this.productsService.findAll(category);
  }

  /** GET /products/:id – chi tiết kèm tùy chọn size và topping */
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findOne(id);
  }
}
