'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { StatusBadge } from '@/components/StatusBadge';
import { ErrorView, Spinner } from '@/components/StateViews';
import { api } from '@/lib/api';
import { formatDateTime, formatVND } from '@/lib/format';
import type { OrderView } from '@/lib/types';
import { useRequireAuth } from '@/lib/useRequireAuth';

const FINAL_STATUSES = ['COMPLETED', 'CANCELLED'];

export default function OrderConfirmationPage() {
  const { id } = useParams<{ id: string }>();
  const { ready, token } = useRequireAuth();
  const queryClient = useQueryClient();
  const [cancelError, setCancelError] = useState<string | null>(null);

  const cancelMutation = useMutation({
    mutationFn: () => api<OrderView>(`/orders/${id}/cancel`, { method: 'POST', token }),
    onSuccess: (updated) => {
      setCancelError(null);
      queryClient.setQueryData(['order', id], updated);
      queryClient.invalidateQueries({ queryKey: ['orders', 'me'] });
    },
    onError: (err) => setCancelError((err as Error).message),
  });

  const { data: order, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['order', id],
    queryFn: () => api<OrderView>(`/orders/${id}`, { token }),
    enabled: ready,
    // Tự cập nhật trạng thái (đang pha chế, sẵn sàng…) cho tới khi đơn kết thúc
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && FINAL_STATUSES.includes(status) ? false : 5000;
    },
  });

  if (!ready || isLoading) return <Spinner />;
  if (isError || !order) {
    return <ErrorView message={(error as Error)?.message ?? 'Không tải được đơn hàng'} onRetry={() => refetch()} />;
  }

  const paid = !['PENDING', 'PAYMENT_FAILED', 'CANCELLED'].includes(order.status);

  return (
    <div className="mx-auto max-w-xl">
      <section className="card p-6 text-center">
        {paid ? (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-3xl text-brand-600">
              ✓
            </div>
            <h1 className="mt-3 text-2xl font-bold">Đặt hàng thành công</h1>
          </>
        ) : (
          <h1 className="text-2xl font-bold">Chi tiết đơn hàng</h1>
        )}

        <dl className="mt-5 space-y-3">
          <div className="rounded-xl border border-espresso/15 px-4 py-3">
            <dt className="text-xs uppercase tracking-wide text-espresso/60">Mã đơn</dt>
            <dd className="text-2xl font-extrabold">{order.code}</dd>
          </div>
          <div className="rounded-xl border border-espresso/15 px-4 py-3">
            <dt className="mb-1 text-xs uppercase tracking-wide text-espresso/60">Trạng thái</dt>
            <dd>
              <StatusBadge status={order.status} />
            </dd>
          </div>
        </dl>

        {paid && order.status !== 'COMPLETED' && (
          <p className="mt-4 text-espresso/70">Mời bạn tới quầy lấy nước khi trạng thái là “Sẵn sàng”.</p>
        )}
        {order.status === 'PAYMENT_FAILED' && (
          <p className="mt-4 text-red-700">Thanh toán chưa thành công. Bạn có thể quay lại giỏ hàng để thử lại.</p>
        )}
        {order.pointsEarned > 0 && (
          <p className="mt-3 inline-block rounded-full bg-brand-50 px-4 py-1 text-sm font-semibold text-brand-700">
            +{order.pointsEarned} điểm tích lũy
          </p>
        )}
        {(order.status === 'PENDING' || order.status === 'PAYMENT_FAILED') && (
          <div className="mt-4">
            <button
              type="button"
              className="btn-secondary"
              disabled={cancelMutation.isPending}
              onClick={() => {
                if (window.confirm(`Hủy đơn ${order.code}?`)) cancelMutation.mutate();
              }}
            >
              {cancelMutation.isPending ? 'Đang hủy…' : 'Hủy đơn'}
            </button>
            {cancelError && <p className="mt-2 text-sm text-red-700">{cancelError}</p>}
          </div>
        )}
      </section>

      <section className="card mt-4 p-5">
        <h2 className="mb-2 font-semibold">Đồ uống</h2>
        <ul className="divide-y divide-espresso/10 text-sm">
          {order.items.map((i, idx) => (
            <li key={idx} className="flex justify-between gap-2 py-2">
              <span>
                {i.productName} · {i.size} × {i.qty}
                {i.toppings.length > 0 && (
                  <span className="block text-espresso/60">+ {i.toppings.map((t) => t.name).join(', ')}</span>
                )}
              </span>
              <span>{formatVND(i.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 space-y-1 border-t border-espresso/10 pt-3 text-sm">
          {order.discount > 0 && (
            <>
              <div className="flex justify-between">
                <span>Tạm tính</span>
                <span>{formatVND(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-brand-700">
                <span>Giảm giá{order.promoCode && ` (${order.promoCode})`}</span>
                <span>−{formatVND(order.discount)}</span>
              </div>
            </>
          )}
          <div className="flex justify-between text-lg font-bold">
            <span>Tổng</span>
            <span>{formatVND(order.total)}</span>
          </div>
          <p className="text-xs text-espresso/60">Đặt lúc {formatDateTime(order.createdAt)}</p>
        </div>
      </section>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Link href="/orders" className="btn-secondary flex-1">
          Lịch sử đơn
        </Link>
        <Link href="/" className="btn-primary flex-1">
          Về trang chủ
        </Link>
      </div>
    </div>
  );
}
