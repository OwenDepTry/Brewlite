import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { toOrderView } from './order.view';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /** POST /orders – nhận giỏ hàng, validate, lưu đơn PENDING, trả mã đơn */
  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateOrderDto) {
    return this.ordersService.create(dto);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return toOrderView(await this.ordersService.findOne(id));
  }
}
