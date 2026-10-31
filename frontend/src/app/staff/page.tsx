'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/admin/WorkShell';
import { ErrorView, Spinner } from '@/components/StateViews';
import { api } from '@/lib/api';
import type { OrderStatus, OrderView } from '@/lib/types';
import { useAuth } from '@/store/auth';
import { toast } from '@/store/toast';

/** Bước tiếp theo barista được bấm – khớp máy trạng thái ở backend */
const NEXT_STEP: Partial<Record<OrderStatus, { to: OrderStatus; label: string; done: string }>> = {
  PAID: { to: 'PREPARING', label: 'Bắt đầu pha', done: 'đang pha' },
  PREPARING: { to: 'READY', label: 'Pha xong, gọi khách', done: 'đã sẵn sàng' },
  READY: { to: 'COMPLETED', label: 'Khách đã nhận', done: 'đã giao' },
};

const COLUMNS: { status: OrderStatus; title: string; empty: string }[] = [
  { status: 'PAID', title: 'Chờ pha', empty: 'Chưa có đơn mới' },
  { status: 'PREPARING', title: 'Đang pha', empty: 'Không có ly nào đang pha' },
  { status: 'READY', title: 'Chờ khách lấy', empty: 'Không có ly nào chờ lấy' },
];

function minutesAgo(iso: string): string {
  const m = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 1) return 'vừa đặt';
  if (m < 60) return `${m} phút trước`;
  return `${Math.floor(m / 60)} giờ ${m % 60} phút trước`;
}

export default function StaffBoardPage() {
  const token = useAuth((s) => s.token);
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['orders', 'active'],
    queryFn: () => api<OrderView[]>('/orders/active', { token }),
    refetchInterval: 5000,
  });

  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: OrderStatus }) =>
      api<OrderView>(`/orders/${id}/status`, { method: 'PATCH', token, body: { status } }),
    onSuccess: (order: OrderView) => {
      queryClient.invalidateQueries({ queryKey: ['orders', 'active'] });
      toast(order.status === 'CANCELLED' ? `Đã hủy đơn ${order.code}` : `Đơn ${order.code} ${NEXT_STEP[prevOf(order.status)]?.done ?? 'đã cập nhật'}`);
    },
    onError: (err) => toast((err as Error).message, 'error'),
  });

  if (isLoading) return <Spinner />;
  if (isError) return <ErrorView message={(error as Error).message} onRetry={() => refetch()} />;

  const total = data?.length ?? 0;

  return (
    <div>
      <PageHeader
        title="Quầy pha chế"
        description={
          total === 0
            ? 'Chưa có đơn cần xử lý. Màn hình tự cập nhật mỗi 5 giây.'
            : `${total} đơn đang mở, cập nhật lúc ${new Date(dataUpdatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
        }
      />

      <div className="grid gap-5 xl:grid-cols-3">
        {COLUMNS.map((col) => {
          const orders = (data ?? []).filter((o) => o.status === col.status);
          return (
            <section key={col.status} aria-label={col.title} className="rounded-3xl bg-ink/[0.04] p-3">
              <h2 className="flex items-baseline justify-between px-2 pb-3 pt-1 text-base font-bold">
                {col.title}
                <span className="font-display text-2xl tabular text-ink-soft">{orders.length}</span>
              </h2>
              <div className="space-y-3">
                {orders.length === 0 && <p className="px-2 pb-4 text-sm text-ink-mute">{col.empty}</p>}
                {orders.map((o) => {
                  const next = NEXT_STEP[o.status];
                  const ready = o.status === 'READY';
                  return (
                    <article key={o.id} className={`ticket overflow-hidden ${ready ? 'bg-milk-400' : ''}`}>
                      <div className="flex items-start justify-between gap-3 px-4 pt-4">
                        <span className="font-display text-5xl font-extrabold leading-none tracking-[-0.04em] tabular">{o.code}</span>
                        <span className={`pt-1 text-right text-xs ${ready ? 'text-ink' : 'text-ink-mute'}`}>{minutesAgo(o.createdAt)}</span>
                      </div>
                      <ul className="space-y-1 px-4 py-3 text-sm">
                        {o.items.map((i, idx) => (
                          <li key={idx}>
                            <span className="font-bold tabular">{i.qty}×</span> {i.productName}{' '}
                            <span className="font-semibold">{i.size}</span>
                            {i.toppings.length > 0 && (
                              <span className={ready ? 'text-ink/70' : 'text-ink-soft'}>
                                {' '}
                                + {i.toppings.map((t) => t.name.toLowerCase()).join(', ')}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                      <div className={`flex gap-2 border-t px-4 py-3 ${ready ? 'border-ink/10' : 'border-line'}`}>
                        {next && (
                          <button
                            type="button"
                            className={`${ready ? 'btn-dark' : 'btn-primary'} flex-1`}
                            disabled={mutation.isPending}
                            onClick={() => mutation.mutate({ id: o.id, status: next.to })}
                          >
                            {next.label}
                          </button>
                        )}
                        {o.status === 'PAID' && (
                          <button
                            type="button"
                            className="btn-danger"
                            disabled={mutation.isPending}
                            onClick={() => {
                              if (window.confirm(`Hủy đơn ${o.code} và hoàn tiền cho khách?`)) {
                                mutation.mutate({ id: o.id, status: 'CANCELLED' });
                              }
                            }}
                          >
                            Hủy
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

/** Trạng thái trước đó, để chọn câu thông báo phù hợp */
function prevOf(status: OrderStatus): OrderStatus {
  if (status === 'PREPARING') return 'PAID';
  if (status === 'READY') return 'PREPARING';
  if (status === 'COMPLETED') return 'READY';
  return status;
}
