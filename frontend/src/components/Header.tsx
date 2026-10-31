'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ROLE_LABEL, homeFor } from '@/lib/roles';
import { useHydrated } from '@/lib/useHydrated';
import { useAuth } from '@/store/auth';
import { cartCount, useCart } from '@/store/cart';
import { Logo } from './Logo';

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active ? 'text-ink' : 'text-ink-soft hover:text-ink'
      }`}
    >
      {children}
    </Link>
  );
}

function AccountMenu() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  if (!user) return null;
  const initial = (user.fullName || user.email).trim().charAt(0).toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-full border border-line bg-white py-1 pl-1 pr-3 text-sm font-medium hover:border-ink/30"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-jade-500 text-xs font-bold text-white">
          {initial}
        </span>
        <span className="hidden max-w-[10rem] truncate sm:inline">{user.fullName || user.email}</span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-30 mt-2 w-60 rounded-2xl border border-line bg-white p-2 shadow-xl">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-semibold">{user.fullName || user.email}</p>
            <p className="text-xs text-ink-mute">{ROLE_LABEL[user.role]}</p>
          </div>
          <div className="my-1 border-t border-line" />
          {user.role !== 'CUSTOMER' && (
            <Link role="menuitem" href={homeFor(user.role)} className="block rounded-lg px-3 py-2 text-sm hover:bg-paper" onClick={() => setOpen(false)}>
              {user.role === 'MANAGER' ? 'Trang quản lý' : 'Màn hình quầy'}
            </Link>
          )}
          <Link role="menuitem" href="/orders" className="block rounded-lg px-3 py-2 text-sm hover:bg-paper" onClick={() => setOpen(false)}>
            Đơn của tôi
          </Link>
          <Link role="menuitem" href="/account" className="block rounded-lg px-3 py-2 text-sm hover:bg-paper" onClick={() => setOpen(false)}>
            Tài khoản
          </Link>
          <button
            role="menuitem"
            type="button"
            className="block w-full rounded-lg px-3 py-2 text-left text-sm text-brick-600 hover:bg-brick-50"
            onClick={() => {
              logout();
              setOpen(false);
              router.push('/');
            }}
          >
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}

export function Header() {
  const hydrated = useHydrated();
  const count = useCart((s) => cartCount(s.items));
  const user = useAuth((s) => s.user);

  return (
    <header className="sticky top-0 z-20 border-b border-line/80 bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-1" aria-label="Điều hướng chính">
          <div className="hidden items-center sm:flex">
            <NavLink href="/">Menu</NavLink>
            {hydrated && user && <NavLink href="/orders">Đơn của tôi</NavLink>}
          </div>
          <Link
            href="/cart"
            className="relative ml-1 flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-paper hover:bg-ink/90"
          >
            Giỏ hàng
            {hydrated && count > 0 && (
              <span
                aria-label={`${count} ly trong giỏ`}
                className="flex h-5 min-w-5 items-center justify-center rounded-full bg-milk-400 px-1.5 text-xs font-bold text-ink tabular"
              >
                {count}
              </span>
            )}
          </Link>
          {hydrated &&
            (user ? (
              <div className="ml-1">
                <AccountMenu />
              </div>
            ) : (
              <Link href="/login" className="btn-ghost ml-1">
                Đăng nhập
              </Link>
            ))}
        </nav>
      </div>
    </header>
  );
}
