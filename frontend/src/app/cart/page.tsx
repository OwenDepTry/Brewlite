'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { QtyStepper } from '@/components/QtyStepper';
import { EmptyView, Spinner } from '@/components/StateViews';
import { imageSrc } from '@/lib/api';
import { formatVND } from '@/lib/format';
import { useHydrated } from '@/lib/useHydrated';
import { MAX_QTY_PER_LINE, cartCount, cartTotal, useCart } from '@/store/cart';

export default function CartPage() {
  const hydrated = useHydrated();
  const router = useRouter();
  const { items, setQty, removeItem } = useCart();

  if (!hydrated) return <Spinner />;

  if (items.length === 0) {
    return (
      <EmptyView title="Giỏ hàng đang trống">
        <Link href="/" className="btn-primary mt-2">
          Xem menu
        </Link>
      </EmptyView>
    );
  }

  const total = cartTotal(items);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Giỏ hàng ({cartCount(items)})</h1>

      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.key} className="card flex gap-4 p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageSrc(item.imageUrl)} alt={item.name} className="h-20 w-20 rounded-xl object-cover" />
            <div className="flex flex-1 flex-col">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">
                    {item.name} <span className="text-espresso/60">· Size {item.size}</span>
                  </p>
                  {item.toppings.length > 0 && (
                    <p className="text-sm text-espresso/70">+ {item.toppings.map((t) => t.name).join(', ')}</p>
                  )}
                  <p className="text-sm text-espresso/70">{formatVND(item.unitPrice)} / ly</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.key)}
                  className="text-sm font-medium text-red-600 hover:underline"
                >
                  Xóa
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <QtyStepper value={item.qty} onChange={(q) => setQty(item.key, q)} max={MAX_QTY_PER_LINE} />
                <span className="font-bold">{formatVND(item.unitPrice * item.qty)}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="card mt-6 p-5">
        <div className="flex items-center justify-between text-lg">
          <span className="font-semibold">Tổng tiền</span>
          <span className="font-bold">{formatVND(total)}</span>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Link href="/" className="btn-secondary flex-1">
            Mua thêm
          </Link>
          <button type="button" onClick={() => router.push('/checkout')} className="btn-primary flex-1">
            Thanh toán · {formatVND(total)}
          </button>
        </div>
      </div>
    </div>
  );
}
