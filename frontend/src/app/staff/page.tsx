'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyView, ErrorView, Spinner } from '@/components/StateViews';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import type { OrderStatus, OrderView } from '@/lib/types';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { useAuth } from '@/store/auth';

/** Bước tiếp theo barista được phép bấm, khớp với máy trạng thái ở backend */
const NEXT_STEP: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  PAID: { to: 'PREPARING', label: 'Nhận đơn & pha chế' },
  PREPARING: { to: 'READY', label: 'Pha xong' },
  READY: { to: 'COMPLETED', label: 'Đã giao khách' },
};

/** Màn hình quầy cho barista (phần mở rộng ngoài MVP) */
export default function StaffBoardPage() {
  const { ready, token } = useRequireAuth();
  const role = useAuth((s) => s.user?.role);
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['orders', 'active'],
    queryFn: () => api<OrderView[]>('/orders/active', { token }),
    enabled: ready && role === 'STAFF',
    refetchInterval: 5000,
  });

  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: OrderStatus }) =>
      api<OrderView>(`/orders/${id}/status`, { method: 'PATCH', token, body: { status } }),
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ['orders', 'active'] });
    },
    onError: (err) => setActionError((err as Error).message),
  });

  if (!ready) return <Spinner />;
  if (role !== 'STAFF') {
    return <EmptyView title="Trang dành cho nhân viên quầy">Đăng nhập bằng tài khoản barista để sử dụng.</EmptyView>;
  }
  if (isLoading) return <Spinner />;
  if (isError) return <ErrorView message={(error as Error).message} onRetry={() => refetch()} />;

  const columns: { status: OrderStatus; title: string }[] = [
    { status: 'PAID', title: 'Chờ pha' },
    { status: 'PREPARING', title: 'Đang pha' },
    { status: 'READY', title: 'Chờ khách lấy' },
  ];

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Quầy pha chế</h1>
      <p className="mb-4 text-sm text-espresso/60">Tự cập nhật mỗi 5 giây.</p>
      {actionError && (
        <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {columns.map((col) => {
          const orders = (data ?? []).filter((o) => o.status === col.status);
          return (
            <section key={col.status} className="rounded-2xl bg-white/60 p-3">
              <h2 className="mb-3 font-semibold">
                {col.title} <span className="text-espresso/50">({orders.length})</span>
              </h2>
              <div className="space-y-3">
                {orders.length === 0 && <p className="text-sm text-espresso/50">Không có đơn</p>}
                {orders.map((o) => {
                  const next = NEXT_STEP[o.status];
                  return (
                    <article key={o.id} className="card p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold">{o.code}</span>
                        <StatusBadge status={o.status} />
                      </div>
                      <ul className="mt-2 text-sm">
                        {o.items.map((i, idx) => (
                          <li key={idx}>
                            {i.qty} × {i.productName} ({i.size})
                            {i.toppings.length > 0 && (
                              <span className="text-espresso/60"> + {i.toppings.map((t) => t.name).join(', ')}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-1 text-xs text-espresso/50">{formatDateTime(o.createdAt)}</p>
                      <div className="mt-3 flex gap-2">
                        {next && (
                          <button
                            type="button"
                            className="btn-primary flex-1 py-2 text-sm"
                            disabled={mutation.isPending}
                            onClick={() => mutation.mutate({ id: o.id, status: next.to })}
                          >
                            {next.label}
                          </button>
                        )}
                        {o.status === 'PAID' && (
                          <button
                            type="button"
                            className="btn-secondary py-2 text-sm"
                            disabled={mutation.isPending}
                            onClick={() => {
                              if (window.confirm(`Hủy và hoàn tiền đơn ${o.code}?`)) {
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
