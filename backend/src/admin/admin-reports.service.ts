import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import type { OrderStatus } from '../domain/order-status';
import { Order } from '../orders/order.entity';
import { toOrderView } from '../orders/order.view';
import { Product } from '../products/product.entity';
import { User } from '../users/user.entity';
import { ListOrdersQuery } from './dto/admin.dto';

/** Đơn đã thu tiền (tính vào doanh thu). Đơn bị hủy sau khi PAID coi như hoàn tiền. */
const REVENUE_STATUSES: OrderStatus[] = ['PAID', 'PREPARING', 'READY', 'COMPLETED'];
const TIMEZONE = 'Asia/Ho_Chi_Minh';
export const LOW_STOCK_THRESHOLD = 10;

@Injectable()
export class AdminReportsService {
  constructor(
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    private readonly dataSource: DataSource,
  ) {}

  /** Số liệu cho trang Tổng quan */
  async stats(days: number) {
    const [today] = await this.dataSource.query(
      `SELECT COALESCE(SUM(total) FILTER (WHERE status = ANY($1)), 0)::bigint AS revenue,
              COUNT(*) FILTER (WHERE status = ANY($1))::int AS "paidOrders",
              COUNT(*)::int AS "allOrders"
         FROM orders
        WHERE ("createdAt" AT TIME ZONE $2)::date = (now() AT TIME ZONE $2)::date`,
      [REVENUE_STATUSES, TIMEZONE],
    );

    const series: Array<{ day: string; revenue: string; orders: number }> = await this.dataSource.query(
      `WITH days AS (
         SELECT d::date AS day
           FROM generate_series((now() AT TIME ZONE $3)::date - ($1::int - 1), (now() AT TIME ZONE $3)::date, interval '1 day') AS d
       )
       SELECT to_char(days.day, 'YYYY-MM-DD') AS day,
              COALESCE(SUM(o.total), 0)::bigint AS revenue,
              COUNT(o.id)::int AS orders
         FROM days
         LEFT JOIN orders o
           ON (o."createdAt" AT TIME ZONE $3)::date = days.day
          AND o.status = ANY($2)
        GROUP BY days.day
        ORDER BY days.day`,
      [days, REVENUE_STATUSES, TIMEZONE],
    );

    const topProducts: Array<{ productId: number; productName: string; qty: string; revenue: string }> =
      await this.dataSource.query(
        `SELECT oi."productId", oi."productName", SUM(oi.qty)::bigint AS qty, SUM(oi."lineTotal")::bigint AS revenue
           FROM order_items oi
           JOIN orders o ON o.id = oi."orderId"
          WHERE o.status = ANY($1)
            AND o."createdAt" >= now() - make_interval(days => $2::int)
          GROUP BY oi."productId", oi."productName"
          ORDER BY SUM(oi.qty) DESC
          LIMIT 5`,
        [REVENUE_STATUSES, days],
      );

    const statusRows: Array<{ status: OrderStatus; count: number }> = await this.dataSource.query(
      `SELECT status, COUNT(*)::int AS count FROM orders
        WHERE status IN ('PAID', 'PREPARING', 'READY') GROUP BY status`,
    );

    const lowStock = await this.products
      .createQueryBuilder('p')
      .where('p.isActive = true AND p.stock <= :limit', { limit: LOW_STOCK_THRESHOLD })
      .orderBy('p.stock', 'ASC')
      .getMany();

    const customers = await this.users.count({ where: { role: 'CUSTOMER' } });

    const revenueToday = Number(today.revenue);
    const paidToday = Number(today.paidOrders);
    const queue = { PAID: 0, PREPARING: 0, READY: 0 } as Record<'PAID' | 'PREPARING' | 'READY', number>;
    for (const r of statusRows) queue[r.status as keyof typeof queue] = Number(r.count);

    return {
      today: {
        revenue: revenueToday,
        paidOrders: paidToday,
        allOrders: Number(today.allOrders),
        averageOrderValue: paidToday > 0 ? Math.round(revenueToday / paidToday) : 0,
      },
      days,
      series: series.map((r) => ({ day: r.day, revenue: Number(r.revenue), orders: Number(r.orders) })),
      periodRevenue: series.reduce((sum, r) => sum + Number(r.revenue), 0),
      periodOrders: series.reduce((sum, r) => sum + Number(r.orders), 0),
      topProducts: topProducts.map((r) => ({
        productId: r.productId,
        productName: r.productName,
        qty: Number(r.qty),
        revenue: Number(r.revenue),
      })),
      queue,
      lowStock: lowStock.map((p) => ({ id: p.id, name: p.name, stock: p.stock })),
      lowStockThreshold: LOW_STOCK_THRESHOLD,
      customers,
    };
  }

  /** Danh sách mọi đơn, lọc theo trạng thái / mã đơn / email khách, có phân trang */
  async listOrders(query: ListOrdersQuery) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const qb = this.orders
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.items', 'items')
      .orderBy('o.id', 'DESC');

    if (query.status) qb.andWhere('o.status = :status', { status: query.status });

    if (query.q) {
      const raw = query.q.replace(/^#/, '');
      if (/^\d+$/.test(raw)) {
        qb.andWhere('o.id = :id', { id: Number(raw) });
      } else {
        const matched = await this.users
          .createQueryBuilder('u')
          .select('u.id')
          .where('LOWER(u.email) LIKE :like OR LOWER(u.fullName) LIKE :like', { like: `%${raw.toLowerCase()}%` })
          .getMany();
        if (matched.length === 0) return { items: [], total: 0, page, pageSize };
        qb.andWhere('o.userId IN (:...ids)', { ids: matched.map((u) => u.id) });
      }
    }

    // Đếm và phân trang theo đơn (không theo dòng chi tiết)
    const total = await qb.clone().getCount();
    const rows = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();

    const userIds = [...new Set(rows.map((o) => o.userId).filter((id): id is string => !!id))];
    const owners = userIds.length ? await this.users.find({ where: { id: In(userIds) } }) : [];
    const ownerMap = new Map(owners.map((u) => [u.id, u]));

    return {
      items: rows.map((o) => {
        const owner = o.userId ? ownerMap.get(o.userId) : undefined;
        return {
          ...toOrderView(o),
          customer: owner ? { id: owner.id, email: owner.email, fullName: owner.fullName } : null,
        };
      }),
      total,
      page,
      pageSize,
    };
  }
}
