import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser, JwtAuthGuard } from '../auth/guards';
import type { AuthUser } from '../auth/jwt.strategy';
import { CreateOrderDto } from './dto/create-order.dto';
import { toOrderView } from './order.view';
import { OrdersService } from './orders.service';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /** POST /orders – nhận giỏ hàng, validate, lưu đơn PENDING, trả mã đơn */
  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateOrderDto, @CurrentUser() user: AuthUser) {
    return this.ordersService.create(dto, user.id);
  }

  /** GET /orders/me – lịch sử đơn của user đang đăng nhập (khai báo trước :id) */
  @Get('me')
  findMine(@CurrentUser() user: AuthUser) {
    return this.ordersService.findMine(user.id);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    const order = await this.ordersService.findOne(id);
    if (order.userId !== user.id && user.role !== 'STAFF') {
      throw new ForbiddenException('Bạn không có quyền xem đơn này');
    }
    return toOrderView(order);
  }
}
