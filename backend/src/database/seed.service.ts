import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import { BCRYPT_ROUNDS } from '../auth/auth.service';
import { Product } from '../products/product.entity';
import { Promotion } from '../promotions/promotion.entity';
import { Topping } from '../products/topping.entity';
import { User } from '../users/user.entity';
import { SEED_PRODUCTS, SEED_PROMOTIONS, SEED_TOPPINGS, SEED_USERS } from './seed-data';

/** Nạp dữ liệu mẫu khi CSDL còn trống (bỏ qua khi SEED_ON_START=false). */
@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onApplicationBootstrap() {
    if (process.env.SEED_ON_START === 'false') return;
    await this.seed();
  }

  async seed() {
    const productRepo = this.dataSource.getRepository(Product);
    if ((await productRepo.count()) === 0) {
      await productRepo.save(SEED_PRODUCTS.map((p) => productRepo.create(p)));
      this.logger.log(`Đã tạo ${SEED_PRODUCTS.length} sản phẩm mẫu`);
    }

    const toppingRepo = this.dataSource.getRepository(Topping);
    if ((await toppingRepo.count()) === 0) {
      await toppingRepo.save(SEED_TOPPINGS.map((t) => toppingRepo.create(t)));
      this.logger.log(`Đã tạo ${SEED_TOPPINGS.length} topping mẫu`);
    }

    const userRepo = this.dataSource.getRepository(User);
    if ((await userRepo.count()) === 0) {
      for (const u of SEED_USERS) {
        const passwordHash = await bcrypt.hash(u.password, BCRYPT_ROUNDS);
        await userRepo.save(userRepo.create({ email: u.email, fullName: u.fullName, role: u.role, passwordHash }));
      }
      this.logger.log(`Đã tạo ${SEED_USERS.length} tài khoản demo`);
    }

    const promoRepo = this.dataSource.getRepository(Promotion);
    if ((await promoRepo.count()) === 0) {
      await promoRepo.save(SEED_PROMOTIONS.map((p) => promoRepo.create(p)));
      this.logger.log(`Đã tạo ${SEED_PROMOTIONS.length} mã khuyến mãi mẫu`);
    }
  }
}
