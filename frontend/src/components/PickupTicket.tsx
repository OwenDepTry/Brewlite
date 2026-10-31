import { formatVND } from '@/lib/format';
import type { OrderStatus, OrderView } from '@/lib/types';
import { STATUS_LABEL } from './StatusBadge';

/** Các bước của đơn sau khi thanh toán – đúng thứ tự máy trạng thái */
const STEPS: { status: OrderStatus; label: string }[] = [
  { status: 'PAID', label: 'Đã nhận đơn' },
  { status: 'PREPARING', label: 'Đang pha' },
  { status: 'READY', label: 'Mời lấy nước' },
  { status: 'COMPLETED', label: 'Đã nhận' },
];

const HEADLINE: Record<OrderStatus, string> = {
  PENDING: 'Đơn chưa thanh toán',
  PAYMENT_FAILED: 'Thanh toán chưa thành công',
  PAID: 'Quầy đã nhận đơn của bạn',
  PREPARING: 'Barista đang pha',
  READY: 'Nước đã xong, mời bạn tới quầy',
  COMPLETED: 'Chúc bạn ngon miệng',
  CANCELLED: 'Đơn đã hủy',
};

export function OrderProgress({ status }: { status: OrderStatus }) {
  const current = STEPS.findIndex((s) => s.status === status);
  if (current < 0) return null;
  return (
    <ol className="grid grid-cols-4 gap-2" aria-label="Tiến độ đơn hàng">
      {STEPS.map((step, i) => {
        const done = i <= current;
        return (
          <li key={step.status} className="flex flex-col gap-2" aria-current={i === current ? 'step' : undefined}>
            <span className={`h-1.5 rounded-full ${done ? 'bg-jade-500' : 'bg-line'}`} />
            <span className={`text-xs ${i === current ? 'font-semibold text-ink' : done ? 'text-ink-soft' : 'text-ink-mute'}`}>
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Vé lấy nước – thành phần nhận diện của BrewLite.
 * Phần trên: số đơn thật lớn để đọc từ xa tại quầy. Phần dưới (sau đường xé): chi tiết đơn.
 */
export function PickupTicket({ order, children }: { order: OrderView; children?: React.ReactNode }) {
  const ready = order.status === 'READY';
  return (
    <article className="ticket animate-ticket-in overflow-hidden" aria-label={`Vé lấy nước ${order.code}`}>
      <header className={`px-6 pb-5 pt-6 sm:px-8 ${ready ? 'bg-milk-400' : ''}`}>
        <p className={`text-sm ${ready ? 'text-ink' : 'text-ink-soft'}`}>Vé lấy nước</p>
        <p className="font-display text-[clamp(4.5rem,18vw,7.5rem)] font-extrabold leading-[0.9] tracking-[-0.04em] tabular">
          {order.code}
        </p>
        <h1 className="mt-3 text-xl font-bold sm:text-2xl">{HEADLINE[order.status]}</h1>
        {['PAID', 'PREPARING', 'READY', 'COMPLETED'].includes(order.status) && (
          <div className="mt-5">
            <OrderProgress status={order.status} />
          </div>
        )}
        {!['PAID', 'PREPARING', 'READY', 'COMPLETED'].includes(order.status) && (
          <p className="mt-1 text-sm text-ink-soft">Trạng thái: {STATUS_LABEL[order.status]}</p>
        )}
      </header>

      <div className="ticket-tear" aria-hidden="true" />

      <div className="px-6 pb-6 pt-2 sm:px-8">
        <ul className="divide-y divide-line/70">
          {order.items.map((i, idx) => (
            <li key={idx} className="flex justify-between gap-4 py-2.5 text-sm">
              <span>
                <span className="font-semibold tabular">{i.qty}×</span> {i.productName}{' '}
                <span className="text-ink-mute">size {i.size}</span>
                {i.toppings.length > 0 && (
                  <span className="block text-ink-mute">thêm {i.toppings.map((t) => t.name.toLowerCase()).join(', ')}</span>
                )}
              </span>
              <span className="tabular">{formatVND(i.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
          {order.discount > 0 && (
            <>
              <div className="flex justify-between text-ink-soft">
                <dt>Tạm tính</dt>
                <dd className="tabular">{formatVND(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between text-jade-600">
                <dt>Mã {order.promoCode}</dt>
                <dd className="tabular">−{formatVND(order.discount)}</dd>
              </div>
            </>
          )}
          <div className="flex items-baseline justify-between pt-1">
            <dt className="font-semibold">Tổng thanh toán</dt>
            <dd className="font-display text-2xl font-bold tabular">{formatVND(order.total)}</dd>
          </div>
        </dl>
        {children}
      </div>
    </article>
  );
}
