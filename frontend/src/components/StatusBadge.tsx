import type { OrderStatus } from '@/lib/types';

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Chờ thanh toán',
  PAID: 'Đã thanh toán',
  PAYMENT_FAILED: 'Thanh toán lỗi',
  PREPARING: 'Đang pha',
  READY: 'Mời lấy nước',
  COMPLETED: 'Đã nhận',
  CANCELLED: 'Đã hủy',
};

const STATUS_STYLE: Record<OrderStatus, string> = {
  PENDING: 'bg-milk-100 text-milk-600',
  PAID: 'bg-jade-50 text-jade-700',
  PAYMENT_FAILED: 'bg-brick-50 text-brick-600',
  PREPARING: 'bg-jade-100 text-jade-700',
  READY: 'bg-milk-400 text-ink',
  COMPLETED: 'bg-ink/5 text-ink-soft',
  CANCELLED: 'bg-ink/5 text-ink-mute line-through decoration-1',
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      title={status}
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
