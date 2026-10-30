/** Các trạng thái của đơn hàng (xem sơ đồ máy trạng thái ở Mục 9.1 của đề). */
export const ORDER_STATUSES = [
  'PENDING',
  'PAID',
  'PAYMENT_FAILED',
  'PREPARING',
  'READY',
  'COMPLETED',
  'CANCELLED',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
