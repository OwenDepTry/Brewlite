import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { lineTotal, unitPrice } from '../domain/pricing';
import { Product } from '../products/product.entity';
import { Topping } from '../products/topping.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderItem } from './order-item.entity';
import { Order } from './order.entity';
import { toOrderView } from './order.view';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(Topping) private readonly toppings: Repository<Topping>,
  ) {}

  /** Tạo đơn trạng thái PENDING. Giá luôn được tính lại ở server, không tin giá từ client. */
  async create(dto: CreateOrderDto, userId: string | null = null) {
    const items = await this.buildItems(dto);
    const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);

    const order = this.orders.create({
      userId,
      status: 'PENDING',
      subtotal,
      discount: 0,
      total: subtotal,
      items,
    });
    const saved = await this.orders.save(order);
    return toOrderView(saved);
  }

  /** Lịch sử đơn của khách, mới nhất trước */
  async findMine(userId: string) {
    const rows = await this.orders.find({
      where: { userId },
      relations: { items: true },
      order: { createdAt: 'DESC', id: 'DESC' },
      take: 50,
    });
    return rows.map(toOrderView);
  }

  async findOne(id: number) {
    const order = await this.orders.findOne({ where: { id }, relations: { items: true } });
    if (!order) throw new NotFoundException(`Không tìm thấy đơn #${id}`);
    return order;
  }

  private async buildItems(dto: CreateOrderDto): Promise<OrderItem[]> {
    const productIds = [...new Set(dto.items.map((i) => i.productId))];
    const toppingIds = [...new Set(dto.items.flatMap((i) => i.toppingIds ?? []))];

    const products = await this.products.find({ where: { id: In(productIds), isActive: true } });
    const toppings = toppingIds.length
      ? await this.toppings.find({ where: { id: In(toppingIds), isActive: true } })
      : [];

    const productMap = new Map(products.map((p) => [p.id, p]));
    const toppingMap = new Map(toppings.map((t) => [t.id, t]));

    const requestedQty = new Map<number, number>();

    const items = dto.items.map((line) => {
      const product = productMap.get(line.productId);
      if (!product) throw new BadRequestException(`Sản phẩm #${line.productId} không tồn tại`);

      const lineToppings = (line.toppingIds ?? []).map((id) => {
        const t = toppingMap.get(id);
        if (!t) throw new BadRequestException(`Topping #${id} không tồn tại`);
        return { id: t.id, name: t.name, price: t.price };
      });

      requestedQty.set(product.id, (requestedQty.get(product.id) ?? 0) + line.qty);

      const unit = unitPrice(product.price, line.size, lineToppings.map((t) => t.price));
      const item = new OrderItem();
      item.productId = product.id;
      item.productName = product.name;
      item.size = line.size;
      item.toppings = lineToppings;
      item.unitPrice = unit;
      item.qty = line.qty;
      item.lineTotal = lineTotal(unit, line.qty);
      return item;
    });

    for (const [productId, qty] of requestedQty) {
      const product = productMap.get(productId)!;
      if (product.stock < qty) {
        throw new ConflictException(`"${product.name}" chỉ còn ${product.stock} ly`);
      }
    }

    return items;
  }
}
