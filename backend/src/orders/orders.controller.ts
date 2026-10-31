import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '../auth/guards';
import type { AuthUser } from '../auth/jwt.strategy';
import { isStaffRole } from '../users/user.entity';
import { IDEMPOTENCY_HEADER, parseIdempotencyKey } from '../common/idempotency';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto/create-order.dto';
import { toOrderView } from './order.view';
import { OrdersService } from './orders.service';

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * POST /orders – nhận giỏ hàng, validate, giữ tồn kho, lưu đơn PENDING, trả mã đơn.
   * Header Idempotency-Key (tùy chọn): gửi lại cùng khóa => trả đơn cũ (HTTP 200), không tạo đơn mới.
   */
  @Post()
  async create(
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: AuthUser,
    @Headers(IDEMPOTENCY_HEADER) rawKey: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const key = parseIdempotencyKey(rawKey, false);
    const { order, replayed } = await this.ordersService.create(dto, user.id, key);
    res.status(replayed ? 200 : 201);
    if (replayed) res.setHeader('Idempotent-Replayed', 'true');
    return order;
  }

  /** POST /orders/quote – xem trước tổng tiền và giảm giá, không tạo đơn */
  @Post('quote')
  @HttpCode(200)
  quote(@Body() dto: CreateOrderDto) {
    return this.ordersService.quote(dto);
  }

  /** GET /orders/me – lịch sử đơn của user đang đăng nhập (khai báo trước :id) */
  @Get('me')
  findMine(@CurrentUser() user: AuthUser) {
    return this.ordersService.findMine(user.id);
  }

  /** GET /orders/active – (STAFF, MANAGER) đơn cần pha chế/giao */
  @Get('active')
  @Roles('STAFF', 'MANAGER')
  findActive() {
    return this.ordersService.findActive();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    const order = await this.ordersService.findOne(id);
    if (order.userId !== user.id && !isStaffRole(user.role)) {
      throw new ForbiddenException('Bạn không có quyền xem đơn này');
    }
    return toOrderView(order);
  }

  /** PATCH /orders/:id/status – (STAFF, MANAGER) chuyển trạng thái theo máy trạng thái; sai luồng => 409 */
  @Patch(':id/status')
  @Roles('STAFF', 'MANAGER')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.ordersService.transition(id, dto.status, user);
  }

  /** POST /orders/:id/cancel – khách hủy đơn chưa thanh toán (hoàn lại tồn kho) */
  @Post(':id/cancel')
  @HttpCode(200)
  cancel(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.ordersService.transition(id, 'CANCELLED', user);
  }
}
