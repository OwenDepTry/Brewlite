'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyView, ErrorView, Spinner } from '@/components/StateViews';
import { api } from '@/lib/api';
import { formatDateTime, formatVND } from '@/lib/format';
import type { OrderView } from '@/lib/types';
import type { SessionUser } from '@/store/auth';
import { useRequireAuth } from '@/lib/useRequireAuth';

export default function OrderHistoryPage() {
  const { ready, token } = useRequireAuth();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['orders', 'me'],
    queryFn: () => api<OrderView[]>('/orders/me', { token }),
    enabled: ready,
  });

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () => api<SessionUser>('/auth/me', { token }),
    enabled: ready,
  });

  if (!ready || isLoading) return <Spinner />;
  if (isError) return <ErrorView message={(error as Error).message} onRetry={() => refetch()} />;

  if (!data || data.length === 0) {
    return (
      <EmptyView title="Bạn chưa có đơn nào">
        <Link href="/" className="btn-primary mt-2">
          Đặt đồ uống ngay
        </Link>
      </EmptyView>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Lịch sử đơn</h1>
        {me && (
          <span className="rounded-full bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700">
            Điểm tích lũy: {me.loyaltyPoints}
          </span>
        )}
      </div>
      <ul className="space-y-3">
        {data.map((o) => (
          <li key={o.id}>
            <Link href={`/orders/${o.id}`} className="card flex items-center justify-between gap-3 p-4 hover:shadow-md">
              <div>
                <p className="font-bold">{o.code}</p>
                <p className="text-sm text-espresso/70">
                  {o.items.map((i) => `${i.productName} ×${i.qty}`).join(', ')}
                </p>
                <p className="text-xs text-espresso/50">{formatDateTime(o.createdAt)}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <StatusBadge status={o.status} />
                <span className="font-semibold">{formatVND(o.total)}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
