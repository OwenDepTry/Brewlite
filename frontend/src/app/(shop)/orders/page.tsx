'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyView, ErrorView, Spinner } from '@/components/StateViews';
import { api } from '@/lib/api';
import { formatDateTime, formatVND } from '@/lib/format';
import type { OrderView } from '@/lib/types';
import { useRequireAuth } from '@/lib/useRequireAuth';

const ACTIVE = ['PAID', 'PREPARING', 'READY'];

export default function OrderHistoryPage() {
  const { ready, token } = useRequireAuth();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['orders', 'me'],
    queryFn: () => api<OrderView[]>('/orders/me', { token }),
    enabled: ready,
    refetchInterval: 10_000,
  });

  if (!ready || isLoading) return <Spinner />;
  if (isError) return <ErrorView message={(error as Error).message} onRetry={() => refetch()} />;

  const active = (data ?? []).filter((o) => ACTIVE.includes(o.status));
  const past = (data ?? []).filter((o) => !ACTIVE.includes(o.status));

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-4xl font-extrabold tracking-[-0.03em]">Đơn của tôi</h1>

      {(!data || data.length === 0) && (
        <div className="mt-8">
          <EmptyView title="Bạn chưa đặt đơn nào">
            <p>Đơn đầu tiên sẽ hiện ở đây cùng vé lấy nước.</p>
            <Link href="/" className="btn-primary mt-5">
              Xem menu
            </Link>
          </EmptyView>
        </div>
      )}

      {active.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-bold">Đang chờ lấy</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {active.map((o) => (
              <Link
                key={o.id}
                href={`/orders/${o.id}`}
                className={`ticket flex items-center gap-5 px-5 py-4 ${o.status === 'READY' ? 'bg-milk-400' : ''}`}
              >
                <span className="font-display text-4xl font-extrabold leading-none tracking-tight tabular">{o.code}</span>
                <span className="min-w-0 text-sm">
                  <StatusBadge status={o.status} />
                  <span className="mt-1 block truncate text-ink-soft">{o.items.map((i) => `${i.qty} ${i.productName}`).join(', ')}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-bold">Trước đây</h2>
          <ul className="divide-y divide-line border-y border-line">
            {past.map((o) => (
              <li key={o.id}>
                <Link href={`/orders/${o.id}`} className="flex items-center gap-4 py-4 hover:bg-white/50">
                  <span className="w-16 shrink-0 font-display text-xl font-bold tabular">{o.code}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{o.items.map((i) => `${i.qty} ${i.productName}`).join(', ')}</span>
                    <span className="block text-xs text-ink-mute">{formatDateTime(o.createdAt)}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-sm font-semibold tabular">{formatVND(o.total)}</span>
                    <StatusBadge status={o.status} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
