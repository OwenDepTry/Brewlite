import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderItem } from '../orders/order-item.entity';
import { Order } from '../orders/order.entity';
import { Product } from '../products/product.entity';
import { Topping } from '../products/topping.entity';
import { Promotion } from '../promotions/promotion.entity';
import { User } from '../users/user.entity';
import { AdminCatalogService } from './admin-catalog.service';
import { AdminPromotionsService } from './admin-promotions.service';
import { AdminReportsService } from './admin-reports.service';
import { AdminUsersService } from './admin-users.service';
import { AdminController } from './admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem, Product, Topping, Promotion, User])],
  controllers: [AdminController],
  providers: [AdminReportsService, AdminCatalogService, AdminPromotionsService, AdminUsersService],
})
export class AdminModule {}
