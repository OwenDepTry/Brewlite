'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useHydrated } from '@/lib/useHydrated';
import { useAuth } from '@/store/auth';
import { cartCount, useCart } from '@/store/cart';

export function Header() {
  const hydrated = useHydrated();
  const router = useRouter();
  const count = useCart((s) => cartCount(s.items));
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-10 border-b border-espresso/10 bg-cream/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3">
        <Link href="/" className="text-xl font-extrabold tracking-tight">
          Brew<span className="text-brand-500">Lite</span>
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-1 text-sm font-medium">
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
          {hydrated &&
            (user ? (
              <>
                <span className="hidden px-2 text-espresso/70 sm:inline">Xin chào, {user.fullName || user.email}</span>
                <button type="button" onClick={handleLogout} className="rounded-lg px-3 py-2 hover:bg-espresso/5">
                  Đăng xuất
                </button>
              </>
            ) : (
              <Link href="/login" className="rounded-lg bg-espresso px-3 py-2 text-white hover:bg-espresso/90">
                Đăng nhập
              </Link>
            ))}
        </nav>
      </div>
    </header>
  );
}
