import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../products/product.entity';
import { Topping } from '../products/topping.entity';
import {
  AdjustStockDto,
  CreateProductDto,
  CreateToppingDto,
  UpdateProductDto,
  UpdateToppingDto,
} from './dto/admin.dto';

/** Quản lý menu (đồ uống, topping) và tồn kho */
@Injectable()
export class AdminCatalogService {
  constructor(
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(Topping) private readonly toppings: Repository<Topping>,
  ) {}

  /** Toàn bộ món, kể cả món đang ẩn */
  listProducts() {
    return this.products.find({ order: { id: 'ASC' } });
  }

  createProduct(dto: CreateProductDto) {
    return this.products.save(
      this.products.create({
        name: dto.name,
        description: dto.description ?? '',
        category: dto.category,
        price: dto.price,
        imageUrl: dto.imageUrl ?? '',
        stock: dto.stock ?? 0,
        isActive: dto.isActive ?? true,
      }),
    );
  }

  /** Sửa thông tin món. Không đụng tới stock/version để không xung đột với đơn đang đặt. */
  async updateProduct(id: number, dto: UpdateProductDto) {
    await this.getProduct(id);
    const patch: Partial<Product> = {};
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.description !== undefined) patch.description = dto.description;
    if (dto.category !== undefined) patch.category = dto.category;
    if (dto.price !== undefined) patch.price = dto.price;
    if (dto.imageUrl !== undefined) patch.imageUrl = dto.imageUrl;
    if (dto.isActive !== undefined) patch.isActive = dto.isActive;
    if (Object.keys(patch).length > 0) {
      await this.products.update({ id }, patch);
    }
    return this.getProduct(id);
  }

  /**
   * Nhập thêm / trừ bớt tồn kho bằng một câu UPDATE nguyên tử và tăng version,
   * nên không làm mất các lượt trừ kho của đơn đang được đặt cùng lúc.
   */
  async adjustStock(id: number, dto: AdjustStockDto) {
    await this.getProduct(id);
    const result = await this.products
      .createQueryBuilder()
      .update(Product)
      .set({ stock: () => '"stock" + :delta', version: () => '"version" + 1' })
      .where('"id" = :id AND "stock" + :delta >= 0')
      .setParameters({ id, delta: dto.delta })
      .execute();
    if (result.affected !== 1) {
      throw new ConflictException('Không thể trừ nhiều hơn số đang có trong kho');
    }
    return this.getProduct(id);
  }

  listToppings() {
    return this.toppings.find({ order: { id: 'ASC' } });
  }

  createTopping(dto: CreateToppingDto) {
    return this.toppings.save(this.toppings.create({ name: dto.name, price: dto.price, isActive: dto.isActive ?? true }));
  }

  async updateTopping(id: number, dto: UpdateToppingDto) {
    const topping = await this.toppings.findOne({ where: { id } });
    if (!topping) throw new NotFoundException(`Không tìm thấy topping #${id}`);
    if (dto.name !== undefined) topping.name = dto.name;
    if (dto.price !== undefined) topping.price = dto.price;
    if (dto.isActive !== undefined) topping.isActive = dto.isActive;
    return this.toppings.save(topping);
  }

  private async getProduct(id: number) {
    const product = await this.products.findOne({ where: { id } });
    if (!product) throw new NotFoundException(`Không tìm thấy đồ uống #${id}`);
    return product;
  }
}
