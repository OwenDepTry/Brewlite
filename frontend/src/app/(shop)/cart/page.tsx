'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { QtyStepper } from '@/components/QtyStepper';
import { EmptyView, Spinner } from '@/components/StateViews';
import { api, imageSrc } from '@/lib/api';
import { formatVND } from '@/lib/format';
import type { Product } from '@/lib/types';
import { useHydrated } from '@/lib/useHydrated';
import { useAuth } from '@/store/auth';
import { MAX_QTY_PER_LINE, cartCount, cartTotal, useCart } from '@/store/cart';

export default function CartPage() {
  const hydrated = useHydrated();
  const router = useRouter();
  const { items, setQty, removeItem } = useCart();
  const token = useAuth((s) => s.token);

  // Đối chiếu giỏ (lưu trong trình duyệt) với menu hiện tại: món đã ngừng bán / hết hàng
  const { data: menu } = useQuery({ queryKey: ['products'], queryFn: () => api<Product[]>('/products') });
  const menuMap = new Map((menu ?? []).map((p) => [p.id, p]));
  const problemOf = (productId: number, qty: number): string | null => {
    if (!menu) return null;
    const p = menuMap.get(productId);
    if (!p) return 'Món này không còn bán';
    if (p.stock === 0) return 'Đã hết hôm nay';
    if (p.stock < qty) return `Quầy chỉ còn ${p.stock} ly`;
    return null;
  };
  const hasProblem = items.some((i) => problemOf(i.productId, i.qty) !== null);

  if (!hydrated) return <Spinner />;

  if (items.length === 0) {
    return (
      <EmptyView title="Giỏ hàng đang trống">
        <p>Chọn một món trong menu để bắt đầu.</p>
        <Link href="/" className="btn-primary mt-5">
          Xem menu
        </Link>
      </EmptyView>
    );
  }

  const total = cartTotal(items);
  const goCheckout = () => router.push(token ? '/checkout' : '/login?next=/checkout');

  return (
    <div>
      <h1 className="text-4xl font-extrabold tracking-[-0.03em]">Giỏ hàng</h1>
      <p className="mt-1 text-ink-soft">{cartCount(items)} ly đang chờ bạn thanh toán</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <ul className="divide-y divide-line border-y border-line">
          {items.map((item) => {
            const problem = problemOf(item.productId, item.qty);
            return (
              <li key={item.key} className="flex gap-4 py-5">
                <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-jade-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageSrc(item.imageUrl)} alt="" className="h-full w-full object-cover" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-sm text-ink-soft">
                        Size {item.size}
                        {item.toppings.length > 0 && `, thêm ${item.toppings.map((t) => t.name.toLowerCase()).join(', ')}`}
                      </p>
                      <p className="text-sm text-ink-mute tabular">{formatVND(item.unitPrice)} mỗi ly</p>
                    </div>
                    <p className="shrink-0 font-semibold tabular">{formatVND(item.unitPrice * item.qty)}</p>
                  </div>
                  {problem && (
                    <p className="mt-2 text-sm font-medium text-brick-600" role="alert">
                      {problem}
                    </p>
                  )}
                  <div className="mt-auto flex items-center justify-between pt-3">
                    <QtyStepper size="sm" value={item.qty} onChange={(q) => setQty(item.key, q)} max={MAX_QTY_PER_LINE} />
                    <button type="button" onClick={() => removeItem(item.key)} className="btn-ghost btn-sm text-brick-600">
                      Bỏ khỏi giỏ
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="panel p-5">
            <div className="flex items-baseline justify-between">
              <span className="font-semibold">Tạm tính</span>
              <span className="font-display text-3xl font-bold tabular">{formatVND(total)}</span>
            </div>
            <p className="mt-1 text-sm text-ink-mute">Nhập mã giảm giá ở bước thanh toán.</p>
            {hasProblem && (
              <p className="mt-4 rounded-xl bg-brick-50 px-3 py-2 text-sm text-brick-600">
                Có món cần chỉnh lại trước khi thanh toán.
              </p>
            )}
            <button type="button" onClick={goCheckout} disabled={hasProblem} className="btn-primary btn-lg mt-5 w-full">
              {token ? 'Thanh toán' : 'Đăng nhập để thanh toán'}
            </button>
            <Link href="/" className="btn-ghost mt-2 w-full">
              Chọn thêm món
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
