/**
 * Máy trạng thái đơn hàng (Order State Machine) – Mục 9.1 của đề.
 *
 *   PENDING ──thanh toán OK──▶ PAID ──barista nhận──▶ PREPARING ──pha xong──▶ READY ──giao khách──▶ COMPLETED
 *     │  ▲                      │
 *     │  └──thử lại──┐          └──hủy──▶ CANCELLED
 *     ├──lỗi──▶ PAYMENT_FAILED ──hủy──▶ CANCELLED
 *     └──hủy──────────────────────────▶ CANCELLED
 *
 * Mọi chuyển tiếp không có mũi tên đều bị assertTransition chặn lại.
 * COMPLETED và CANCELLED là trạng thái kết thúc.
 */
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

export const ORDER_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  PENDING: ['PAID', 'PAYMENT_FAILED', 'CANCELLED'],
  PAYMENT_FAILED: ['PENDING', 'CANCELLED'],
  PAID: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY'],
  READY: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

export class InvalidOrderTransitionError extends Error {
  readonly from: OrderStatus;
  readonly to: OrderStatus;

  constructor(from: OrderStatus, to: OrderStatus) {
    super(`Không thể chuyển đơn từ ${from} sang ${to}`);
    this.name = 'InvalidOrderTransitionError';
    this.from = from;
    this.to = to;
  }
}

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === 'string' && (ORDER_STATUSES as readonly string[]).includes(value);
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

/** Ném InvalidOrderTransitionError nếu chuyển tiếp không hợp lệ; trả về trạng thái mới nếu hợp lệ. */
export function assertTransition(from: OrderStatus, to: OrderStatus): OrderStatus {
  if (!canTransition(from, to)) {
    throw new InvalidOrderTransitionError(from, to);
  }
  return to;
}

export function isFinalStatus(status: OrderStatus): boolean {
  return ORDER_TRANSITIONS[status].length === 0;
}

/** Các trạng thái mà đơn đã giữ tồn kho / lượt khuyến mãi (cần hoàn lại khi hủy) */
export function holdsReservation(status: OrderStatus): boolean {
  return status !== 'CANCELLED';
}
