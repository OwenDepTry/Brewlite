'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { ROLE_LABEL } from '@/lib/roles';
import { useAuth } from '@/store/auth';
import { Logo } from '../Logo';

export interface NavItem {
  href: string;
  label: string;
  /** chỉ khớp đúng đường dẫn (dùng cho trang gốc /admin) */
  exact?: boolean;
}

/** Khung làm việc cho nhân viên quầy và quản lý: thanh bên tối màu + nội dung */
export function WorkShell({ nav, children }: { nav: NavItem[]; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const isActive = (item: NavItem) => (item.exact ? pathname === item.href : pathname.startsWith(item.href));

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="px-5 py-5">
        <Logo href={nav[0]?.href ?? '/'} tone="light" />
      </div>
      <nav className="flex-1 space-y-1 px-3" aria-label="Khu làm việc">
        {nav.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                active ? 'bg-jade-500 text-white' : 'text-paper/70 hover:bg-white/5 hover:text-paper'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-4">
        <Link href="/" className="mb-3 block text-sm text-paper/60 hover:text-paper">
          Xem trang khách hàng
        </Link>
        {user && (
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-paper">{user.fullName || user.email}</p>
              <p className="text-xs text-paper/50">{ROLE_LABEL[user.role]}</p>
            </div>
            <button
              type="button"
              className="rounded-lg px-2 py-1 text-xs text-paper/60 hover:bg-white/10 hover:text-paper"
              onClick={() => {
                logout();
                router.push('/login');
              }}
            >
              Đăng xuất
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="hidden bg-ink lg:sticky lg:top-0 lg:block lg:h-screen">{sidebar}</aside>

      {/* Thanh trên cho màn hình nhỏ */}
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between bg-ink px-4 lg:hidden">
        <Logo href={nav[0]?.href ?? '/'} tone="light" />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-paper hover:bg-white/10"
          aria-expanded={open}
        >
          Menu
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" aria-label="Đóng menu" className="absolute inset-0 bg-ink/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-ink">{sidebar}</aside>
        </div>
      )}

      <main className="min-w-0 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl font-extrabold tracking-[-0.03em]">{title}</h1>
        {description && <p className="mt-1 text-ink-soft">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
