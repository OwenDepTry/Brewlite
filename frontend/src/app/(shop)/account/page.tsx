'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useEffect, useState } from 'react';
import { Spinner } from '@/components/StateViews';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { ROLE_LABEL } from '@/lib/roles';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { SessionUser, useAuth } from '@/store/auth';
import { toast } from '@/store/toast';

interface Me extends SessionUser {
  createdAt: string;
}

const POINTS_PER_REWARD = 50;

export default function AccountPage() {
  const { ready, token } = useRequireAuth();
  const setUser = useAuth((s) => s.setUser);
  const queryClient = useQueryClient();

  const { data: me, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => api<Me>('/auth/me', { token }),
    enabled: ready,
  });

  const [fullName, setFullName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (me) setFullName(me.fullName);
  }, [me]);

  if (!ready || isLoading || !me) return <Spinner />;

  const saveName = async (e: FormEvent) => {
    e.preventDefault();
    setSavingName(true);
    try {
      const updated = await api<Me>('/auth/me', { method: 'PATCH', token, body: { fullName } });
      setUser(updated);
      queryClient.setQueryData(['me'], updated);
      toast('Đã lưu họ tên');
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setSavingName(false);
    }
  };

  const changePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    if (newPassword.length < 6) return setPasswordError('Mật khẩu mới tối thiểu 6 ký tự');
    if (newPassword !== confirmPassword) return setPasswordError('Hai lần nhập mật khẩu mới chưa khớp');
    setSavingPassword(true);
    try {
      await api('/auth/change-password', { method: 'POST', token, body: { currentPassword, newPassword } });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast('Đã đổi mật khẩu');
    } catch (err) {
      setPasswordError((err as Error).message);
    } finally {
      setSavingPassword(false);
    }
  };

  const progress = me.loyaltyPoints % POINTS_PER_REWARD;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-4xl font-extrabold tracking-[-0.03em]">Tài khoản</h1>
      <p className="mt-1 text-ink-soft">
        {me.email}, {ROLE_LABEL[me.role].toLowerCase()} từ {formatDate(me.createdAt)}
      </p>

      {me.role === 'CUSTOMER' && (
        <section className="mt-8 overflow-hidden rounded-[28px] bg-jade-500 p-6 text-white sm:p-8">
          <p className="text-sm text-jade-100">Điểm tích lũy</p>
          <p className="font-display text-7xl font-extrabold leading-none tracking-[-0.04em] tabular">{me.loyaltyPoints}</p>
          <p className="mt-3 max-w-sm text-sm text-jade-100">
            Mỗi 10.000đ thanh toán được 1 điểm. Còn {POINTS_PER_REWARD - progress} điểm nữa là tròn mốc {POINTS_PER_REWARD} tiếp theo.
          </p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-jade-700" role="progressbar" aria-valuemin={0} aria-valuemax={POINTS_PER_REWARD} aria-valuenow={progress}>
            <div className="h-full rounded-full bg-milk-400" style={{ width: `${(progress / POINTS_PER_REWARD) * 100}%` }} />
          </div>
        </section>
      )}

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <form onSubmit={saveName} className="panel p-5">
          <h2 className="text-lg font-bold">Thông tin cá nhân</h2>
          <label className="mt-4 block">
            <span className="field-label">Họ tên</span>
            <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} required maxLength={100} />
          </label>
          <label className="mt-3 block">
            <span className="field-label">Email</span>
            <input className="input" value={me.email} disabled />
            <span className="field-hint">Email dùng để đăng nhập, không đổi được.</span>
          </label>
          <button type="submit" className="btn-dark mt-4" disabled={savingName || !fullName.trim() || fullName === me.fullName}>
            {savingName ? 'Đang lưu…' : 'Lưu họ tên'}
          </button>
        </form>

        <form onSubmit={changePassword} className="panel p-5">
          <h2 className="text-lg font-bold">Đổi mật khẩu</h2>
          <label className="mt-4 block">
            <span className="field-label">Mật khẩu hiện tại</span>
            <input className="input" type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
          </label>
          <label className="mt-3 block">
            <span className="field-label">Mật khẩu mới</span>
            <input className="input" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
          </label>
          <label className="mt-3 block">
            <span className="field-label">Nhập lại mật khẩu mới</span>
            <input className="input" type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
          </label>
          {passwordError && (
            <p role="alert" className="mt-3 text-sm text-brick-600">
              {passwordError}
            </p>
          )}
          <button type="submit" className="btn-dark mt-4" disabled={savingPassword || !currentPassword || !newPassword}>
            {savingPassword ? 'Đang đổi…' : 'Đổi mật khẩu'}
          </button>
        </form>
      </div>
    </div>
  );
}
