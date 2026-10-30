import { Order } from './order.entity';

/** Dữ liệu đơn trả về cho client */
export function toOrderView(order: Order) {
  return {
    id: order.id,
    code: `#${order.id}`,
    status: order.status,
    subtotal: order.subtotal,
    discount: order.discount,
    total: order.total,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    items: (order.items ?? []).map((i) => ({
      productId: i.productId,
      productName: i.productName,
      size: i.size,
      toppings: i.toppings,
      unitPrice: i.unitPrice,
      qty: i.qty,
      lineTotal: i.lineTotal,
    })),
  };
}

export type OrderView = ReturnType<typeof toOrderView>;
