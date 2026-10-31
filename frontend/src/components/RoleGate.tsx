'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { homeFor } from '@/lib/roles';
import type { UserRole } from '@/lib/types';
import { useHydrated } from '@/lib/useHydrated';
import { useAuth } from '@/store/auth';
import { Spinner } from './StateViews';

/**
 * Chỉ hiển thị nội dung cho các vai trò được phép.
 * Chưa đăng nhập -> chuyển tới /login; sai vai trò -> báo và dẫn về khu vực của mình.
 * (Backend vẫn kiểm tra quyền ở mọi API; đây chỉ là lớp điều hướng.)
 */
export function RoleGate({ allow, children }: { allow: UserRole[]; children: React.ReactNode }) {
  const hydrated = useHydrated();
  const { token, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (hydrated && !token) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [hydrated, token, router, pathname]);

  if (!hydrated || !token || !user) return <Spinner />;

  if (!allow.includes(user.role)) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Khu vực này không dành cho tài khoản của bạn</h1>
        <p className="mt-2 text-ink-soft">Bạn đang đăng nhập bằng {user.email}.</p>
        <Link href={homeFor(user.role)} className="btn-primary mt-6">
          Về khu vực của tôi
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
