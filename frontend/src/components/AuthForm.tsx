'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { api } from '@/lib/api';
import { homeFor } from '@/lib/roles';
import { AuthResponse, useAuth } from '@/store/auth';

/** Chỉ cho phép chuyển hướng nội bộ để tránh open redirect */
function safeNext(next: string | null): string | null {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : null;
}

const DEMO_ACCOUNTS = [
  { label: 'Khách hàng', email: 'demo@brewlite.vn', password: 'demo1234' },
  { label: 'Nhân viên quầy', email: 'barista@brewlite.vn', password: 'barista123' },
  { label: 'Quản lý', email: 'manager@brewlite.vn', password: 'manager123' },
];

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get('next'));
  const setSession = useAuth((s) => s.setSession);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isRegister = mode === 'register';

  const submit = async (creds: { email: string; password: string; fullName?: string }) => {
    setError(null);
    if (isRegister && creds.password.length < 6) {
      setError('Mật khẩu tối thiểu 6 ký tự');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api<AuthResponse>(isRegister ? '/auth/register' : '/auth/login', {
        method: 'POST',
        body: isRegister ? creds : { email: creds.email, password: creds.password },
      });
      setSession(res);
      // Khách quay lại trang đang dở (vd. thanh toán); nhân viên/quản lý vào khu làm việc
      const target = res.user.role === 'CUSTOMER' ? next ?? '/' : next?.startsWith(homeFor(res.user.role)) ? next : homeFor(res.user.role);
      router.replace(target);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit({ email, password, fullName });
  };

  const otherHref = `${isRegister ? '/login' : '/register'}${next ? `?next=${encodeURIComponent(next)}` : ''}`;

  return (
    <div className="mx-auto grid max-w-4xl gap-10 md:grid-cols-[1fr_400px] md:items-center">
      <div className="hidden md:block">
        <h1 className="text-5xl font-extrabold leading-[0.95] tracking-[-0.035em]">
          {isRegister ? 'Tạo tài khoản, gọi món nhanh hơn.' : 'Chào bạn quay lại.'}
        </h1>
        <p className="mt-4 max-w-sm text-ink-soft">
          {isRegister
            ? 'Lưu lịch sử đơn, theo dõi vé lấy nước và tích điểm sau mỗi lần thanh toán.'
            : 'Khách hàng, nhân viên quầy và quản lý đều đăng nhập ở đây. Hệ thống tự đưa bạn tới đúng khu vực.'}
        </p>
      </div>

      <div>
        <form onSubmit={onSubmit} className="panel space-y-4 p-6" noValidate>
          <h1 className="text-2xl font-bold md:hidden">{isRegister ? 'Tạo tài khoản' : 'Đăng nhập'}</h1>
          <h2 className="hidden text-2xl font-bold md:block">{isRegister ? 'Tạo tài khoản' : 'Đăng nhập'}</h2>

          {isRegister && (
            <label className="block">
              <span className="field-label">Họ tên</span>
              <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} required autoComplete="name" />
            </label>
          )}

          <label className="block">
            <span className="field-label">Email</span>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </label>

          <label className="block">
            <span className="field-label">Mật khẩu</span>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={isRegister ? 6 : undefined}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
            />
            {isRegister && <span className="field-hint">Tối thiểu 6 ký tự.</span>}
          </label>

          {error && (
            <p role="alert" className="whitespace-pre-line rounded-xl bg-brick-50 px-3 py-2 text-sm text-brick-600">
              {error}
            </p>
          )}

          <button type="submit" className="btn-primary btn-lg w-full" disabled={submitting}>
            {submitting ? 'Đang xử lý…' : isRegister ? 'Tạo tài khoản' : 'Đăng nhập'}
          </button>

          <p className="text-center text-sm text-ink-soft">
            {isRegister ? 'Đã có tài khoản? ' : 'Chưa có tài khoản? '}
            <Link href={otherHref} className="font-semibold text-jade-600 hover:underline">
              {isRegister ? 'Đăng nhập' : 'Tạo tài khoản khách hàng'}
            </Link>
          </p>
          {isRegister && (
            <p className="text-center text-xs text-ink-mute">Tài khoản nhân viên do quản lý cửa hàng cấp.</p>
          )}
        </form>

        {!isRegister && (
          <div className="mt-4 rounded-2xl border border-dashed border-line p-4">
            <p className="text-sm font-medium">Tài khoản demo</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.email}
                  type="button"
                  className="chip"
                  disabled={submitting}
                  onClick={() => {
                    setEmail(a.email);
                    setPassword(a.password);
                    submit({ email: a.email, password: a.password });
                  }}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
