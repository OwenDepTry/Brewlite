'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ProductCard, ProductCardSkeleton } from '@/components/ProductCard';
import { EmptyView, ErrorView } from '@/components/StateViews';
import { STATUS_LABEL } from '@/components/StatusBadge';
import { api } from '@/lib/api';
import type { OrderView, Product } from '@/lib/types';
import { useHydrated } from '@/lib/useHydrated';
import { useAuth } from '@/store/auth';

const ALL = 'Tất cả';

/** Vé nhỏ ở đầu trang nếu khách đang có đơn chờ lấy */
function ActiveOrderStub() {
  const hydrated = useHydrated();
  const { token, user } = useAuth();
  const { data } = useQuery({
    queryKey: ['orders', 'me'],
    queryFn: () => api<OrderView[]>('/orders/me', { token }),
    enabled: hydrated && !!token && user?.role === 'CUSTOMER',
    refetchInterval: 10_000,
  });
  const active = data?.find((o) => ['PAID', 'PREPARING', 'READY'].includes(o.status));
  if (!active) return null;

  const ready = active.status === 'READY';
  return (
    <Link
      href={`/orders/${active.id}`}
      className={`ticket flex w-full items-center gap-5 px-5 py-4 sm:w-auto ${ready ? 'bg-milk-400' : ''}`}
    >
      <span className="font-display text-4xl font-extrabold leading-none tracking-tight tabular">{active.code}</span>
      <span className="text-sm">
        <span className="block font-semibold">{STATUS_LABEL[active.status]}</span>
        <span className="text-ink-soft">Xem vé lấy nước</span>
      </span>
    </Link>
  );
}

export default function MenuPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['products'],
    queryFn: () => api<Product[]>('/products'),
  });
  const [category, setCategory] = useState(ALL);
  const [search, setSearch] = useState('');

  const categories = useMemo(() => [ALL, ...Array.from(new Set((data ?? []).map((p) => p.category)))], [data]);

  const keyword = search.trim().toLowerCase();
  const visible = (data ?? []).filter(
    (p) =>
      (category === ALL || p.category === category) &&
      (!keyword || p.name.toLowerCase().includes(keyword) || p.description.toLowerCase().includes(keyword)),
  );

  return (
    <div>
      <section className="flex flex-col gap-6 pb-8 sm:flex-row sm:items-end sm:justify-between sm:pb-10">
        <div className="max-w-xl">
          <h1 className="text-[clamp(2.4rem,7vw,4.25rem)] font-extrabold leading-[0.95] tracking-[-0.035em]">
            Gọi trước,
            <br />
            tới quầy là có nước.
          </h1>
          <p className="mt-4 max-w-md text-ink-soft">
            Chọn món, trả bằng ví hoặc thẻ. Quầy pha xong sẽ báo trên vé lấy nước của bạn.
          </p>
        </div>
        <ActiveOrderStub />
      </section>

      <div className="sticky top-16 z-10 -mx-4 mb-6 border-b border-line/70 bg-paper/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1" role="tablist" aria-label="Danh mục">
            {!isLoading &&
              categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="tab"
                  aria-selected={category === c}
                  onClick={() => setCategory(c)}
                  className={`chip shrink-0 ${category === c ? 'chip-active' : ''}`}
                >
                  {c}
                </button>
              ))}
          </div>
          <label className="relative block sm:w-64">
            <span className="sr-only">Tìm đồ uống</span>
            <svg className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-mute" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="2" />
              <path d="m14 14 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm đồ uống"
              className="input rounded-full py-2 pl-10"
            />
          </label>
        </div>
      </div>

      {isLoading && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      )}

      {isError && <ErrorView message={(error as Error).message} onRetry={() => refetch()} />}

      {!isLoading && !isError && visible.length === 0 && (
        <EmptyView title={keyword ? `Không có món nào khớp “${search.trim()}”` : 'Menu đang được cập nhật'}>
          {keyword ? (
            <button type="button" className="btn-outline mt-2" onClick={() => setSearch('')}>
              Xóa từ khóa
            </button>
          ) : (
            'Quầy chưa mở bán món nào. Bạn quay lại sau ít phút nhé.'
          )}
        </EmptyView>
      )}

      {visible.length > 0 && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
