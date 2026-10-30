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

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const addItem = useCart((s) => s.addItem);

  const { data: product, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['product', id],
    queryFn: () => api<ProductDetail>(`/products/${id}`),
  });

  const [size, setSize] = useState<Size>('S');
  const [toppingIds, setToppingIds] = useState<number[]>([]);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  if (isLoading) return <Spinner />;
  if (isError || !product) {
    return <ErrorView message={(error as Error)?.message ?? 'Không tải được sản phẩm'} onRetry={() => refetch()} />;
  }

  const surcharge = product.options.sizes.find((s) => s.size === size)?.surcharge ?? 0;
  const chosenToppings = product.options.toppings.filter((t) => toppingIds.includes(t.id));
  const unitPrice = product.price + surcharge + chosenToppings.reduce((sum, t) => sum + t.price, 0);
  const maxQty = Math.max(1, Math.min(MAX_QTY_PER_LINE, product.stock));

  const toggleTopping = (toppingId: number) =>
    setToppingIds((ids) => (ids.includes(toppingId) ? ids.filter((x) => x !== toppingId) : [...ids, toppingId]));

  const handleAdd = () => {
    addItem({
      productId: product.id,
      name: product.name,
      imageUrl: product.imageUrl,
      size,
      toppings: chosenToppings,
      unitPrice,
      qty,
    });
    setAdded(true);
  };

  return (
    <div>
      <Link href="/" className="mb-4 inline-block text-sm font-medium text-brand-600 hover:underline">
        ← Quay lại menu
      </Link>

      <div className="grid gap-6 md:grid-cols-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageSrc(product.imageUrl)} alt={product.name} className="card aspect-square w-full object-cover" />

        <div className="card flex flex-col p-6">
          <span className="text-xs font-medium uppercase tracking-wide text-brand-600">{product.category}</span>
          <h1 className="mt-1 text-2xl font-bold">{product.name}</h1>
          <p className="mt-2 text-espresso/70">{product.description}</p>
          <p className="mt-3 text-lg">
            Giá: <span className="font-bold">{formatVND(product.price)}</span>
          </p>

          <fieldset className="mt-6">
            <legend className="mb-2 font-semibold">Size</legend>
            <div className="grid grid-cols-3 gap-2">
              {product.options.sizes.map((s) => (
                <button
                  key={s.size}
                  type="button"
                  onClick={() => setSize(s.size)}
                  aria-pressed={size === s.size}
                  className={`rounded-xl border px-3 py-3 text-center transition ${
                    size === s.size ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-100' : 'border-espresso/20 bg-white'
                  }`}
                >
                  <span className="block text-lg font-bold">{s.size}</span>
                  <span className="block text-xs text-espresso/70">
                    {s.label}
                    {s.surcharge > 0 && ` · +${formatVND(s.surcharge)}`}
                  </span>
                </button>
              ))}
            </div>
          </fieldset>

          {product.options.toppings.length > 0 && (
            <fieldset className="mt-6">
              <legend className="mb-2 font-semibold">Topping</legend>
              <div className="space-y-2">
                {product.options.toppings.map((t) => (
                  <label
                    key={t.id}
                    className="flex cursor-pointer items-center justify-between rounded-xl border border-espresso/15 bg-white px-4 py-3"
                  >
                    <span className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-brand-500"
                        checked={toppingIds.includes(t.id)}
                        onChange={() => toggleTopping(t.id)}
                      />
                      {t.name}
                    </span>
                    <span className="text-sm text-espresso/70">+{formatVND(t.price)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <div className="mt-6 flex items-center justify-between">
            <span className="font-semibold">Số lượng</span>
            <QtyStepper value={qty} onChange={setQty} max={maxQty} />
          </div>

          {product.available ? (
            <button type="button" onClick={handleAdd} className="btn-primary mt-6 w-full">
              Thêm vào giỏ · {formatVND(unitPrice * qty)}
            </button>
          ) : (
            <button type="button" disabled className="btn-primary mt-6 w-full">
              Hết hàng
            </button>
          )}

          {added && (
            <div className="mt-3 flex items-center justify-between rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-700">
              Đã thêm vào giỏ hàng.
              <button type="button" className="font-semibold underline" onClick={() => router.push('/cart')}>
                Xem giỏ hàng
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
