import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { SIZE_LABEL, SIZE_SURCHARGE, SIZES } from '../domain/pricing';
import { Product } from './product.entity';
import { Topping } from './topping.entity';

export interface ProductView {
  id: number;
  name: string;
  description: string;
  category: string;
  price: number;
  imageUrl: string;
  stock: number;
  available: boolean;
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(Topping) private readonly toppings: Repository<Topping>,
  ) {}

  async findAll(category?: string): Promise<ProductView[]> {
    const rows = await this.products.find({
      where: { isActive: true, ...(category ? { category } : {}) },
      order: { id: 'ASC' },
    });
    return rows.map(toView);
  }

  async findOne(id: number) {
    const product = await this.products.findOne({ where: { id, isActive: true } });
    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm #${id}`);
    }

    const toppings = await this.toppings.find({ where: { isActive: true }, order: { id: 'ASC' } });

    return {
      ...toView(product),
      options: {
        sizes: SIZES.map((size) => ({ size, label: SIZE_LABEL[size], surcharge: SIZE_SURCHARGE[size] })),
        toppings: toppings.map((t) => ({ id: t.id, name: t.name, price: t.price })),
      },
    };
  }

  findToppingsByIds(ids: number[]): Promise<Topping[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.toppings.find({ where: { id: In(ids), isActive: true } });
  }
}

function toView(p: Product): ProductView {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    category: p.category,
    price: p.price,
    imageUrl: p.imageUrl,
    stock: p.stock,
    available: p.stock > 0,
  };
}
