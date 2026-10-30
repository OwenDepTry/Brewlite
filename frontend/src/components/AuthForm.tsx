'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { api } from '@/lib/api';
import { AuthResponse, useAuth } from '@/store/auth';

/** Chỉ cho phép chuyển hướng nội bộ để tránh open redirect */
function safeNext(next: string | null): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
}

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

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (isRegister && password.length < 6) {
      setError('Mật khẩu tối thiểu 6 ký tự');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api<AuthResponse>(isRegister ? '/auth/register' : '/auth/login', {
        method: 'POST',
        body: isRegister ? { fullName, email, password } : { email, password },
      });
      setSession(res);
      router.replace(next);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const otherHref = `${isRegister ? '/login' : '/register'}${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`;

  return (
    <div className="mx-auto max-w-md">
      <form onSubmit={onSubmit} className="card space-y-4 p-6" noValidate>
        <h1 className="text-2xl font-bold">{isRegister ? 'Tạo tài khoản' : 'Đăng nhập'}</h1>

        {isRegister && (
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Họ tên</span>
            <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} required autoComplete="name" />
          </label>
        )}

        <label className="block">
          <span className="mb-1 block text-sm font-medium">Email</span>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">Mật khẩu</span>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={isRegister ? 6 : undefined}
            autoComplete={isRegister ? 'new-password' : 'current-password'}
          />
        </label>

        {error && (
          <p role="alert" className="whitespace-pre-line rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? 'Đang xử lý…' : isRegister ? 'Đăng ký' : 'Đăng nhập'}
        </button>

        <p className="text-center text-sm text-espresso/70">
          {isRegister ? 'Đã có tài khoản? ' : 'Chưa có tài khoản? '}
          <Link href={otherHref} className="font-semibold text-brand-600 hover:underline">
            {isRegister ? 'Đăng nhập' : 'Đăng ký'}
          </Link>
        </p>

        {!isRegister && (
          <p className="rounded-xl bg-cream px-4 py-3 text-xs text-espresso/70">
            Tài khoản demo: <b>demo@brewlite.vn</b> / <b>demo1234</b>
          </p>
        )}
      </form>
    </div>
  );
}
