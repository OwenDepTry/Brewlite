import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Product } from '../products/product.entity';
import { Topping } from '../products/topping.entity';
import { SEED_PRODUCTS, SEED_TOPPINGS } from './seed-data';

/** Nạp dữ liệu mẫu khi CSDL còn trống (chỉ chạy khi SEED_ON_START khác "false"). */
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
  }
}
