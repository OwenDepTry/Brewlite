'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { formatVND } from '@/lib/format';
import { useHydrated } from '@/lib/useHydrated';
import { cartCount, cartTotal, useCart } from '@/store/cart';

/** Thanh giỏ hàng dính đáy màn hình trên điện thoại, chỉ hiện ở trang menu (trang món có thanh riêng) */
export function MobileCartBar() {
  const hydrated = useHydrated();
  const pathname = usePathname();
  const items = useCart((s) => s.items);

  const visible = pathname === '/';
  if (!hydrated || !visible || items.length === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper/95 p-3 backdrop-blur sm:hidden">
      <Link href="/cart" className="btn-dark btn-lg w-full justify-between">
        <span>
          Xem giỏ <span className="font-normal opacity-70">({cartCount(items)} ly)</span>
        </span>
        <span className="tabular">{formatVND(cartTotal(items))}</span>
      </Link>
    </div>
  );
}
