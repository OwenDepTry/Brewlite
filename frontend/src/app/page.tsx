'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ProductCard, ProductCardSkeleton } from '@/components/ProductCard';
import { EmptyView, ErrorView } from '@/components/StateViews';
import { api } from '@/lib/api';
import type { Product } from '@/lib/types';

export default function MenuPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['products'],
    queryFn: () => api<Product[]>('/products'),
  });
  const [category, setCategory] = useState<string>('Tất cả');

  const categories = useMemo(
    () => ['Tất cả', ...Array.from(new Set((data ?? []).map((p) => p.category)))],
    [data],
  );
  const visible = (data ?? []).filter((p) => category === 'Tất cả' || p.category === category);

  return (
    <div>
      <section className="mb-6">
        <h1 className="text-2xl font-bold">Menu hôm nay</h1>
        <p className="text-espresso/70">Chọn đồ uống, thanh toán không tiền mặt và nhận tại quầy.</p>
      </section>

      {!isLoading && !isError && categories.length > 2 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                category === c ? 'bg-espresso text-white' : 'bg-white hover:bg-espresso/5'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      )}

      {isError && <ErrorView message={(error as Error).message} onRetry={() => refetch()} />}

      {!isLoading && !isError && visible.length === 0 && (
        <EmptyView title="Chưa có đồ uống nào">Menu đang được cập nhật, bạn quay lại sau nhé.</EmptyView>
      )}

      {visible.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
