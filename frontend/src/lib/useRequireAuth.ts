'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/store/auth';
import { useHydrated } from './useHydrated';

/** Chuyển về trang đăng nhập nếu chưa có phiên; trả token khi sẵn sàng. */
export function useRequireAuth(): { ready: boolean; token: string | null } {
  const hydrated = useHydrated();
  const token = useAuth((s) => s.token);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (hydrated && !token) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [hydrated, token, router, pathname]);

  return { ready: hydrated && !!token, token };
}
