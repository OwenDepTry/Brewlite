'use client';

import { useEffect, useState } from 'react';

/**
 * Giỏ hàng/đăng nhập lưu ở localStorage nên chỉ có ở trình duyệt.
 * Dùng hook này để tránh lệch nội dung giữa server render và client.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
