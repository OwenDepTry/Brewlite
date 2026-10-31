'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { QtyStepper } from '@/components/QtyStepper';
import { ErrorView, Spinner } from '@/components/StateViews';
import { api, imageSrc } from '@/lib/api';
import { formatVND } from '@/lib/format';
import type { ProductDetail, Size } from '@/lib/types';
import { MAX_QTY_PER_LINE, useCart } from '@/store/cart';
import { toast } from '@/store/toast';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const addItem = useCart((s) => s.addItem);

  const { data: product, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['product', id],
    queryFn: () => api<ProductDetail>(`/products/${id}`),
  });

  const [size, setSize] = useState<Size>('M');
  const [toppingIds, setToppingIds] = useState<number[]>([]);
  const [qty, setQty] = useState(1);

  if (isLoading) return <Spinner />;
  if (isError || !product) {
    return <ErrorView message={(error as Error)?.message ?? 'Không tải được món này'} onRetry={() => refetch()} />;
  }

  const surcharge = product.options.sizes.find((s) => s.size === size)?.surcharge ?? 0;
  const chosenToppings = product.options.toppings.filter((t) => toppingIds.includes(t.id));
  const unitPrice = product.price + surcharge + chosenToppings.reduce((sum, t) => sum + t.price, 0);
  const maxQty = Math.max(1, Math.min(MAX_QTY_PER_LINE, product.stock));

  const toggleTopping = (toppingId: number) =>
    setToppingIds((ids) => (ids.includes(toppingId) ? ids.filter((x) => x !== toppingId) : [...ids, toppingId]));

  const add = (goToCart: boolean) => {
    addItem({
      productId: product.id,
      name: product.name,
      imageUrl: product.imageUrl,
      size,
      toppings: chosenToppings,
      unitPrice,
      qty,
    });
    if (goToCart) {
      router.push('/cart');
    } else {
      toast(`Đã thêm ${qty} ly ${product.name} vào giỏ`);
      router.push('/');
    }
  };

  return (
    <div>
      <Link href="/" className="btn-ghost -ml-3 mb-4">
        ← Menu
      </Link>

      <div className="grid gap-8 md:grid-cols-[1fr_1.05fr] md:gap-12">
        <div className="md:sticky md:top-24 md:self-start">
          <div className="overflow-hidden rounded-[32px] bg-jade-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageSrc(product.imageUrl)} alt={product.name} className="aspect-square w-full object-cover" />
          </div>
        </div>

        <div className="pb-28 md:pb-0">
          <p className="text-sm text-jade-600">{product.category}</p>
          <h1 className="mt-1 text-4xl font-extrabold leading-tight tracking-[-0.03em] sm:text-5xl">{product.name}</h1>
          <p className="mt-3 max-w-prose text-ink-soft">{product.description}</p>
          <p className="mt-4 text-sm text-ink-mute">
            {product.stock > 0 ? `Quầy còn ${product.stock} ly hôm nay` : 'Đã hết hôm nay'}
          </p>

          <fieldset className="mt-8">
            <legend className="mb-3 font-semibold">Chọn size</legend>
            <div className="grid grid-cols-3 gap-2">
              {product.options.sizes.map((s) => {
                const active = size === s.size;
                return (
                  <label
                    key={s.size}
                    className={`flex cursor-pointer flex-col items-center rounded-2xl border-2 px-2 py-3 text-center transition-colors ${
                      active ? 'border-jade-500 bg-jade-50' : 'border-line bg-white hover:border-ink/30'
                    }`}
                  >
                    <input
                      type="radio"
                      name="size"
                      value={s.size}
                      checked={active}
                      onChange={() => setSize(s.size)}
                      className="sr-only"
                    />
                    <span className="font-display text-2xl font-bold">{s.size}</span>
                    <span className="text-xs text-ink-soft">{s.label}</span>
                    <span className="mt-1 text-sm font-medium tabular">{formatVND(product.price + s.surcharge)}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {product.options.toppings.length > 0 && (
            <fieldset className="mt-8">
              <legend className="mb-3 font-semibold">
                Thêm topping <span className="font-normal text-ink-mute">(không bắt buộc)</span>
              </legend>
              <div className="flex flex-wrap gap-2">
                {product.options.toppings.map((t) => {
                  const on = toppingIds.includes(t.id);
                  return (
                    <label
                      key={t.id}
                      className={`flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors ${
                        on ? 'border-jade-500 bg-jade-500 text-white' : 'border-line bg-white hover:border-ink/30'
                      }`}
                    >
                      <input type="checkbox" className="sr-only" checked={on} onChange={() => toggleTopping(t.id)} />
                      <span className="font-medium">{t.name}</span>
                      <span className={on ? 'text-white/80' : 'text-ink-mute'}>+{formatVND(t.price)}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}

          <div className="mt-8 flex items-center justify-between rounded-2xl border border-line bg-white px-4 py-3">
            <span className="font-semibold">Số lượng</span>
            <QtyStepper value={qty} onChange={setQty} max={maxQty} />
          </div>

          {/* Thanh hành động: dính đáy trên điện thoại */}
          <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper/95 p-3 backdrop-blur md:static md:mt-6 md:border-0 md:bg-transparent md:p-0">
            {product.available ? (
              <div className="mx-auto flex max-w-6xl gap-2">
                <button type="button" onClick={() => add(false)} className="btn-outline btn-lg hidden sm:inline-flex">
                  Thêm và chọn tiếp
                </button>
                <button type="button" onClick={() => add(true)} className="btn-primary btn-lg flex-1 justify-between">
                  <span>Thêm vào giỏ</span>
                  <span className="tabular">{formatVND(unitPrice * qty)}</span>
                </button>
              </div>
            ) : (
              <button type="button" disabled className="btn-dark btn-lg w-full">
                Đã hết hôm nay
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
