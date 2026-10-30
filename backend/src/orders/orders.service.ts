import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import type { AuthUser } from '../auth/jwt.strategy';
import { OptimisticLockConflict, isUniqueViolation, withRetry } from '../common/db-errors';
import type { OrderStatus } from '../domain/order-status';
import { lineTotal, unitPrice } from '../domain/pricing';
import { evaluatePromotion, normalizePromoCode } from '../domain/promotion';
import { Product } from '../products/product.entity';
import { Topping } from '../products/topping.entity';
import { Promotion } from '../promotions/promotion.entity';
import { User } from '../users/user.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderItem } from './order-item.entity';
import { ensureTransition } from './order-transition';
import { Order } from './order.entity';
import { OrderView, toOrderView } from './order.view';

/** Dữ liệu một dòng đơn đã tính giá (chưa gắn vào đơn) */
type PricedLine = Pick<
  OrderItem,
  'productId' | 'productName' | 'size' | 'toppings' | 'unitPrice' | 'qty' | 'lineTotal'
>;

interface PricedCart {
  items: PricedLine[];
  subtotal: number;
  /** Tổng số ly cần trừ kho theo từng sản phẩm */
  qtyByProduct: Map<number, number>;
}

export interface CreateOrderResult {
  order: OrderView;
  /** true nếu đây là kết quả của một request trước đó có cùng Idempotency-Key */
  replayed: boolean;
}

/** Trạng thái barista cần xử lý */
const ACTIVE_STATUSES: OrderStatus[] = ['PAID', 'PREPARING', 'READY'];

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(Topping) private readonly toppings: Repository<Topping>,
    @InjectRepository(Promotion) private readonly promotions: Repository<Promotion>,
    private readonly dataSource: DataSource,
  ) {}

  /** Xem trước tiền hàng + giảm giá, không tạo đơn và không giữ kho. */
  async quote(dto: CreateOrderDto) {
    const priced = await this.priceCart(dto);
    let discount = 0;
    let promoError: string | null = null;

    if (dto.promoCode) {
      const result = await this.evaluatePromoCode(dto.promoCode, priced.subtotal);
      if (result.ok) discount = result.discount;
      else promoError = result.reason;
    }

    return {
      subtotal: priced.subtotal,
      discount,
      total: priced.subtotal - discount,
      promoCode: dto.promoCode && !promoError ? dto.promoCode : null,
      promoError,
    };
  }

  /**
   * Tạo đơn PENDING.
   * - Giá tính lại ở server.
   * - Trừ tồn kho trong transaction với optimistic locking (cột version) + retry,
   *   nên nhiều khách đặt cùng lúc cũng không bán vượt số lượng còn lại.
   * - Idempotency-Key (tùy chọn): gửi lại cùng khóa trả về đúng đơn cũ, không tạo đơn mới.
   */
  async create(dto: CreateOrderDto, userId: string, idempotencyKey: string | null = null): Promise<CreateOrderResult> {
    if (idempotencyKey) {
      const existing = await this.findByIdempotencyKey(userId, idempotencyKey);
      if (existing) return { order: existing, replayed: true };
    }

    const priced = await this.priceCart(dto);

    let promo: { code: string; discount: number } | null = null;
    if (dto.promoCode) {
      const result = await this.evaluatePromoCode(dto.promoCode, priced.subtotal);
      if (!result.ok) throw new UnprocessableEntityException(result.reason);
      promo = { code: normalizePromoCode(dto.promoCode), discount: result.discount };
    }

    try {
      const orderId = await withRetry(() =>
        this.dataSource.transaction(async (m) => {
          await this.reserveStock(m, priced.qtyByProduct);
          if (promo) await this.reservePromoUsage(m, promo.code);

          const order = m.create(Order, {
            userId,
            status: 'PENDING',
            subtotal: priced.subtotal,
            discount: promo?.discount ?? 0,
            total: priced.subtotal - (promo?.discount ?? 0),
            promoCode: promo?.code ?? null,
            pointsEarned: 0,
            idempotencyKey,
            // tạo entity mới mỗi lần thử để lần retry không dùng lại đối tượng đã bị TypeORM gán id
            items: priced.items.map((line) => m.create(OrderItem, { ...line })),
          });
          const saved = await m.save(order);
          return saved.id;
        }),
      );
      return { order: toOrderView(await this.findOne(orderId)), replayed: false };
    } catch (err) {
      // Hai request cùng khóa chạy song song: request thua bị vi phạm UNIQUE -> trả đơn của request thắng
      if (idempotencyKey && isUniqueViolation(err)) {
        const existing = await this.findByIdempotencyKey(userId, idempotencyKey);
        if (existing) return { order: existing, replayed: true };
      }
      if (err instanceof OptimisticLockConflict) {
        throw new ConflictException('Có quá nhiều đơn đặt cùng lúc, vui lòng thử lại');
      }
      throw err;
    }
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

  /** Đơn barista đang cần xử lý (đã thanh toán, đang pha, chờ lấy) */
  async findActive() {
    const rows = await this.orders.find({
      where: { status: In(ACTIVE_STATUSES) },
      relations: { items: true },
      order: { createdAt: 'ASC', id: 'ASC' },
      take: 100,
    });
    return rows.map(toOrderView);
  }

  async findOne(id: number) {
    const order = await this.orders.findOne({ where: { id }, relations: { items: true } });
    if (!order) throw new NotFoundException(`Không tìm thấy đơn #${id}`);
    return order;
  }

  /**
   * Chuyển trạng thái đơn theo máy trạng thái.
   * - STAFF: mọi chuyển tiếp hợp lệ (PAID→PREPARING→READY→COMPLETED, hủy).
   * - Khách: chỉ được hủy đơn của mình khi chưa thanh toán (PENDING / PAYMENT_FAILED).
   * Hủy đơn sẽ hoàn lại tồn kho, lượt dùng mã giảm giá và điểm đã cộng.
   */
  async transition(orderId: number, to: OrderStatus, actor: AuthUser): Promise<OrderView> {
    await this.dataSource.transaction(async (m) => {
      // Khóa dòng đơn để hai thao tác đồng thời không cùng đổi trạng thái
      const order = await m.findOne(Order, { where: { id: orderId }, lock: { mode: 'pessimistic_write' } });
      if (!order) throw new NotFoundException(`Không tìm thấy đơn #${orderId}`);

      if (actor.role !== 'STAFF') {
        if (order.userId !== actor.id) throw new ForbiddenException('Bạn không có quyền với đơn này');
        if (to !== 'CANCELLED') throw new ForbiddenException('Chỉ nhân viên quầy được cập nhật trạng thái pha chế');
        if (order.status === 'PAID') {
          throw new ForbiddenException('Đơn đã thanh toán, vui lòng liên hệ quầy để hủy và hoàn tiền');
        }
      }

      ensureTransition(order.status, to);

      if (to === 'CANCELLED') {
        const items = await m.find(OrderItem, { where: { orderId: order.id } });
        await this.releaseStock(m, items);
        if (order.promoCode) await this.releasePromoUsage(m, order.promoCode);
        if (order.pointsEarned > 0 && order.userId) {
          await m
            .createQueryBuilder()
            .update(User)
            .set({ loyaltyPoints: () => 'GREATEST("loyaltyPoints" - :points, 0)' })
            .where('"id" = :userId')
            .setParameters({ points: order.pointsEarned, userId: order.userId })
            .execute();
          order.pointsEarned = 0;
        }
      }

      order.status = to;
      await m.save(order);
    });

    return toOrderView(await this.findOne(orderId));
  }

  // ---------------------------------------------------------------------------

  private async findByIdempotencyKey(userId: string, key: string): Promise<OrderView | null> {
    const order = await this.orders.findOne({ where: { userId, idempotencyKey: key }, relations: { items: true } });
    return order ? toOrderView(order) : null;
  }

  /**
   * Trừ kho bằng optimistic locking:
   *   UPDATE products SET stock = stock - qty, version = version + 1
   *   WHERE id = ? AND version = <version vừa đọc> AND stock >= qty
   * Không cập nhật được dòng nào => có giao dịch khác vừa sửa => ném OptimisticLockConflict để withRetry chạy lại.
   * Duyệt sản phẩm theo id tăng dần để các transaction khóa dòng cùng thứ tự (tránh deadlock).
   */
  private async reserveStock(m: EntityManager, qtyByProduct: Map<number, number>) {
    const entries = [...qtyByProduct.entries()].sort((a, b) => a[0] - b[0]);

    for (const [productId, qty] of entries) {
      const product = await m.findOne(Product, { where: { id: productId } });
      if (!product || !product.isActive) {
        throw new BadRequestException(`Sản phẩm #${productId} không tồn tại`);
      }
      if (product.stock < qty) {
        throw new ConflictException(
          product.stock === 0 ? `"${product.name}" đã hết hàng` : `"${product.name}" chỉ còn ${product.stock} ly`,
        );
      }

      const result = await m
        .createQueryBuilder()
        .update(Product)
        .set({ stock: () => '"stock" - :qty', version: () => '"version" + 1' })
        .where('"id" = :id AND "version" = :version AND "stock" >= :qty')
        .setParameters({ id: productId, version: product.version, qty })
        .execute();

      if (result.affected !== 1) {
        throw new OptimisticLockConflict(`Tồn kho "${product.name}" vừa thay đổi`);
      }
    }
  }

  private async releaseStock(m: EntityManager, items: OrderItem[]) {
    const qtyByProduct = new Map<number, number>();
    for (const i of items) qtyByProduct.set(i.productId, (qtyByProduct.get(i.productId) ?? 0) + i.qty);

    for (const [productId, qty] of [...qtyByProduct.entries()].sort((a, b) => a[0] - b[0])) {
      await m
        .createQueryBuilder()
        .update(Product)
        .set({ stock: () => '"stock" + :qty', version: () => '"version" + 1' })
        .where('"id" = :id')
        .setParameters({ id: productId, qty })
        .execute();
    }
  }

  /** Tăng lượt dùng nguyên tử; hết lượt thì không cập nhật được dòng nào */
  private async reservePromoUsage(m: EntityManager, code: string) {
    const result = await m
      .createQueryBuilder()
      .update(Promotion)
      .set({ usedCount: () => '"usedCount" + 1' })
      .where('"code" = :code AND ("usageLimit" IS NULL OR "usedCount" < "usageLimit")')
      .setParameters({ code })
      .execute();
    if (result.affected !== 1) {
      throw new ConflictException(`Mã ${code} đã hết lượt sử dụng`);
    }
  }

  private async releasePromoUsage(m: EntityManager, code: string) {
    await m
      .createQueryBuilder()
      .update(Promotion)
      .set({ usedCount: () => 'GREATEST("usedCount" - 1, 0)' })
      .where('"code" = :code')
      .setParameters({ code })
      .execute();
  }

  private async evaluatePromoCode(rawCode: string, subtotal: number) {
    const code = normalizePromoCode(rawCode);
    const promo = await this.promotions.findOne({ where: { code } });
    if (!promo) return { ok: false as const, reason: `Mã ${code} không tồn tại` };
    return evaluatePromotion(promo, subtotal);
  }

  /** Tính giá từng dòng theo dữ liệu trong CSDL (không tin giá từ client) */
  private async priceCart(dto: CreateOrderDto): Promise<PricedCart> {
    const productIds = [...new Set(dto.items.map((i) => i.productId))];
    const toppingIds = [...new Set(dto.items.flatMap((i) => i.toppingIds ?? []))];

    const products = await this.products.find({ where: { id: In(productIds), isActive: true } });
    const toppings = toppingIds.length
      ? await this.toppings.find({ where: { id: In(toppingIds), isActive: true } })
      : [];

    const productMap = new Map(products.map((p) => [p.id, p]));
    const toppingMap = new Map(toppings.map((t) => [t.id, t]));
    const qtyByProduct = new Map<number, number>();

    const items = dto.items.map((line): PricedLine => {
      const product = productMap.get(line.productId);
      if (!product) throw new BadRequestException(`Sản phẩm #${line.productId} không tồn tại`);

      const lineToppings = (line.toppingIds ?? []).map((id) => {
        const t = toppingMap.get(id);
        if (!t) throw new BadRequestException(`Topping #${id} không tồn tại`);
        return { id: t.id, name: t.name, price: t.price };
      });

      qtyByProduct.set(product.id, (qtyByProduct.get(product.id) ?? 0) + line.qty);

      const unit = unitPrice(product.price, line.size, lineToppings.map((t) => t.price));
      return {
        productId: product.id,
        productName: product.name,
        size: line.size,
        toppings: lineToppings,
        unitPrice: unit,
        qty: line.qty,
        lineTotal: lineTotal(unit, line.qty),
      };
    });

    const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
    return { items, subtotal, qtyByProduct };
  }
}
