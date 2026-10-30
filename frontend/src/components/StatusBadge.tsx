import type { OrderStatus } from '@/lib/types';

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Chờ thanh toán',
  PAID: 'Đã thanh toán',
  PAYMENT_FAILED: 'Thanh toán lỗi',
  PREPARING: 'Đang pha chế',
  READY: 'Sẵn sàng – mời lấy nước',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã hủy',
};

const STATUS_STYLE: Record<OrderStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  PAID: 'bg-brand-100 text-brand-700',
  PAYMENT_FAILED: 'bg-red-100 text-red-700',
  PREPARING: 'bg-sky-100 text-sky-800',
  READY: 'bg-violet-100 text-violet-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-espresso/10 text-espresso/70',
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[status]}`}>
      <span className="sr-only">Trạng thái: </span>
      {STATUS_LABEL[status]} <span className="ml-1 font-mono opacity-60">({status})</span>
    </span>
  );
}
