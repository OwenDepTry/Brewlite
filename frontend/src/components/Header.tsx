'use client';

import Link from 'next/link';
import { useHydrated } from '@/lib/useHydrated';
import { cartCount, useCart } from '@/store/cart';

export function Header() {
  const hydrated = useHydrated();
  const count = useCart((s) => cartCount(s.items));

  return (
    <header className="sticky top-0 z-10 border-b border-espresso/10 bg-cream/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-xl font-extrabold tracking-tight">
          Brew<span className="text-brand-500">Lite</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm font-medium">
          <Link href="/" className="rounded-lg px-3 py-2 hover:bg-espresso/5">
            Menu
          </Link>
          <Link href="/cart" className="relative rounded-lg px-3 py-2 hover:bg-espresso/5">
            Giỏ hàng
            {hydrated && count > 0 && (
              <span
                aria-label={`${count} sản phẩm trong giỏ`}
                className="absolute -right-1 -top-1 min-w-5 rounded-full bg-brand-500 px-1.5 text-center text-xs leading-5 text-white"
              >
                {count}
              </span>
            )}
          </Link>
        </nav>
      </div>
    </header>
  );
}
