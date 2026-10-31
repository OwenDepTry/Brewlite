'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { RevenueChart } from '@/components/admin/RevenueChart';
import { PageHeader } from '@/components/admin/WorkShell';
import { ErrorView, Spinner } from '@/components/StateViews';
import { api } from '@/lib/api';
import { formatVND } from '@/lib/format';
import type { AdminStats } from '@/lib/types';
import { useAuth } from '@/store/auth';

const RANGES = [7, 14, 30] as const;

export default function AdminDashboardPage() {
  const token = useAuth((s) => s.token);
  const [days, setDays] = useState<(typeof RANGES)[number]>(7);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin', 'stats', days],
    queryFn: () => api<AdminStats>(`/admin/stats?days=${days}`, { token }),
    refetchInterval: 30_000,
  });

  if (isLoading) return <Spinner />;
  if (isError || !data) return <ErrorView message={(error as Error)?.message ?? 'Không tải được số liệu'} onRetry={() => refetch()} />;

  const queueTotal = data.queue.PAID + data.queue.PREPARING + data.queue.READY;
  const topMax = Math.max(...data.topProducts.map((p) => p.qty), 1);

  return (
    <div>
      <PageHeader title="Tổng quan" description={`Hôm nay, ${new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' })}`} />

      {/* Hôm nay: doanh thu là số chính, các số còn lại phụ */}
      <section className="panel grid gap-6 p-6 md:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="text-sm text-ink-soft">Doanh thu hôm nay</p>
          <p className="font-display text-5xl font-extrabold tracking-[-0.03em] tabular sm:text-6xl">{formatVND(data.today.revenue)}</p>
          <p className="mt-2 text-sm text-ink-soft">
            {data.today.paidOrders} đơn đã thanh toán
            {data.today.paidOrders > 0 && `, trung bình ${formatVND(data.today.averageOrderValue)} mỗi đơn`}
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-4 md:border-l md:border-line md:pl-6">
          <div>
            <dt className="text-sm text-ink-soft">Đơn đang mở</dt>
            <dd className="font-display text-3xl font-bold tabular">{queueTotal}</dd>
            <dd className="text-xs text-ink-mute">
              {data.queue.PAID} chờ pha, {data.queue.PREPARING} đang pha, {data.queue.READY} chờ lấy
            </dd>
          </div>
          <div>
            <dt className="text-sm text-ink-soft">Khách hàng</dt>
            <dd className="font-display text-3xl font-bold tabular">{data.customers}</dd>
            <dd className="text-xs text-ink-mute">tài khoản đã đăng ký</dd>
          </div>
          <div>
            <dt className="text-sm text-ink-soft">Đơn tạo hôm nay</dt>
            <dd className="font-display text-3xl font-bold tabular">{data.today.allOrders}</dd>
            <dd className="text-xs text-ink-mute">kể cả chưa thanh toán</dd>
          </div>
          <div>
            <dt className="text-sm text-ink-soft">Sắp hết hàng</dt>
            <dd className={`font-display text-3xl font-bold tabular ${data.lowStock.length > 0 ? 'text-brick-600' : ''}`}>
              {data.lowStock.length}
            </dd>
            <dd className="text-xs text-ink-mute">món còn ≤ {data.lowStockThreshold} ly</dd>
          </div>
        </dl>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <section className="panel p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Doanh thu {days} ngày</h2>
              <p className="text-sm text-ink-soft tabular">
                {formatVND(data.periodRevenue)} từ {data.periodOrders} đơn
              </p>
            </div>
            <div className="flex gap-1 rounded-full border border-line p-1" role="group" aria-label="Khoảng thời gian">
              {RANGES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setDays(r)}
                  aria-pressed={days === r}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${days === r ? 'bg-ink text-paper' : 'text-ink-soft hover:text-ink'}`}
                >
                  {r} ngày
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4">
            <RevenueChart data={data.series} />
          </div>
        </section>

        <div className="space-y-6">
          <section className="panel p-5">
            <h2 className="text-lg font-bold">Bán chạy {days} ngày</h2>
            {data.topProducts.length === 0 ? (
              <p className="mt-3 text-sm text-ink-mute">Chưa có đơn đã thanh toán trong khoảng này.</p>
            ) : (
              <ol className="mt-4 space-y-3">
                {data.topProducts.map((p, i) => (
                  <li key={p.productId}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="truncate">
                        <span className="mr-2 text-ink-mute tabular">{i + 1}</span>
                        {p.productName}
                      </span>
                      <span className="shrink-0 font-semibold tabular">{p.qty} ly</span>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-paper">
                      <div className="h-full rounded-full" style={{ width: `${(p.qty / topMax) * 100}%`, background: '#0E8A72' }} />
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="panel p-5">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-bold">Sắp hết hàng</h2>
              <Link href="/admin/menu" className="text-sm font-medium text-jade-600 hover:underline">
                Nhập thêm
              </Link>
            </div>
            {data.lowStock.length === 0 ? (
              <p className="mt-3 text-sm text-ink-mute">Mọi món đều còn trên {data.lowStockThreshold} ly.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line/70">
                {data.lowStock.map((p) => (
                  <li key={p.id} className="flex justify-between py-2 text-sm">
                    <span>{p.name}</span>
                    <span className={`font-semibold tabular ${p.stock === 0 ? 'text-brick-600' : ''}`}>
                      {p.stock === 0 ? 'Hết' : `${p.stock} ly`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
