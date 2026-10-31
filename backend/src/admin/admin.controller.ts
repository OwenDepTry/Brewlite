import { Body, Controller, Get, Param, ParseIntPipe, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '../auth/guards';
import type { AuthUser } from '../auth/jwt.strategy';
import { AdminCatalogService } from './admin-catalog.service';
import { AdminPromotionsService } from './admin-promotions.service';
import { AdminReportsService } from './admin-reports.service';
import { AdminUsersService } from './admin-users.service';
import {
  AdjustStockDto,
  CreateProductDto,
  CreatePromotionDto,
  CreateToppingDto,
  CreateUserDto,
  ListOrdersQuery,
  ListUsersQuery,
  StatsQuery,
  UpdateProductDto,
  UpdatePromotionDto,
  UpdateToppingDto,
  UpdateUserDto,
} from './dto/admin.dto';

/** Toàn bộ API quản lý – chỉ tài khoản MANAGER (khách và nhân viên quầy nhận 403) */
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('MANAGER')
export class AdminController {
  constructor(
    private readonly reports: AdminReportsService,
    private readonly catalog: AdminCatalogService,
    private readonly promotions: AdminPromotionsService,
    private readonly users: AdminUsersService,
  ) {}

  // ---- Tổng quan & đơn hàng ----

  @Get('stats')
  stats(@Query() query: StatsQuery) {
    return this.reports.stats(query.days ?? 7);
  }

  @Get('orders')
  orders(@Query() query: ListOrdersQuery) {
    return this.reports.listOrders(query);
  }

  // ---- Menu & tồn kho ----

  @Get('products')
  listProducts() {
    return this.catalog.listProducts();
  }

  @Post('products')
  createProduct(@Body() dto: CreateProductDto) {
    return this.catalog.createProduct(dto);
  }

  @Patch('products/:id')
  updateProduct(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductDto) {
    return this.catalog.updateProduct(id, dto);
  }

  /** Nhập thêm (delta > 0) hoặc trừ hao hụt (delta < 0) */
  @Post('products/:id/stock')
  adjustStock(@Param('id', ParseIntPipe) id: number, @Body() dto: AdjustStockDto) {
    return this.catalog.adjustStock(id, dto);
  }

  @Get('toppings')
  listToppings() {
    return this.catalog.listToppings();
  }

  @Post('toppings')
  createTopping(@Body() dto: CreateToppingDto) {
    return this.catalog.createTopping(dto);
  }

  @Patch('toppings/:id')
  updateTopping(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateToppingDto) {
    return this.catalog.updateTopping(id, dto);
  }

  // ---- Khuyến mãi ----

  @Get('promotions')
  listPromotions() {
    return this.promotions.list();
  }

  @Post('promotions')
  createPromotion(@Body() dto: CreatePromotionDto) {
    return this.promotions.create(dto);
  }

  @Patch('promotions/:code')
  updatePromotion(@Param('code') code: string, @Body() dto: UpdatePromotionDto) {
    return this.promotions.update(code, dto);
  }

  // ---- Tài khoản ----

  @Get('users')
  listUsers(@Query() query: ListUsersQuery) {
    return this.users.list(query);
  }

  @Post('users')
  createUser(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }

  @Patch('users/:id')
  updateUser(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto, @CurrentUser() actor: AuthUser) {
    return this.users.update(id, dto, actor);
  }
}
