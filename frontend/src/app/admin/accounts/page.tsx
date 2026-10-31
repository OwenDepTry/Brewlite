'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { PageHeader } from '@/components/admin/WorkShell';
import { Modal } from '@/components/Modal';
import { ErrorView, Spinner } from '@/components/StateViews';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { ROLE_LABEL } from '@/lib/roles';
import type { UserRole, UserView } from '@/lib/types';
import { useAuth } from '@/store/auth';
import { toast } from '@/store/toast';

type Tab = 'TEAM' | 'CUSTOMER';

export default function AdminAccountsPage() {
  const { token, user: me } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('TEAM');
  const [searchInput, setSearchInput] = useState('');
  const [q, setQ] = useState('');

  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ fullName: '', email: '', password: '', role: 'STAFF' as UserRole });
  const [resetFor, setResetFor] = useState<UserView | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const params = new URLSearchParams();
  if (tab === 'CUSTOMER') params.set('role', 'CUSTOMER');
  if (q) params.set('q', q);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin', 'users', tab, q],
    queryFn: () => api<UserView[]>(`/admin/users?${params.toString()}`, { token }),
  });

  // Tab "Nhân sự" = nhân viên quầy + quản lý
  const rows = (data ?? []).filter((u) => (tab === 'TEAM' ? u.role !== 'CUSTOMER' : true));

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api<UserView>(`/admin/users/${id}`, { method: 'PATCH', token, body }),
    onSuccess: (u: UserView, vars) => {
      if ('password' in vars.body) toast(`Đã đặt lại mật khẩu cho ${u.email}`);
      else if ('isActive' in vars.body) toast(u.isActive ? `Đã mở khóa ${u.email}` : `Đã khóa ${u.email}`);
      else toast(`Đã đổi vai trò ${u.email} thành ${ROLE_LABEL[u.role].toLowerCase()}`);
      setResetFor(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (err) => toast((err as Error).message, 'error'),
  });

  const create = useMutation({
    mutationFn: () => api<UserView>('/admin/users', { method: 'POST', token, body: createForm }),
    onSuccess: (u: UserView) => {
      toast(`Đã tạo tài khoản ${ROLE_LABEL[u.role].toLowerCase()} ${u.email}`);
      setCreating(false);
      setCreateForm({ fullName: '', email: '', password: '', role: 'STAFF' });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (err) => toast((err as Error).message, 'error'),
  });

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    setQ(searchInput.trim());
  };

  return (
    <div>
      <PageHeader
        title="Tài khoản"
        description="Khách tự đăng ký trên ứng dụng. Tài khoản nhân viên quầy và quản lý chỉ được tạo ở đây."
        actions={
          <button type="button" className="btn-primary" onClick={() => setCreating(true)}>
            Tạo tài khoản nhân viên
          </button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-full border border-line bg-white p-1" role="tablist">
          {(
            [
              ['TEAM', 'Nhân sự'],
              ['CUSTOMER', 'Khách hàng'],
            ] as [Tab, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold ${tab === value ? 'bg-ink text-paper' : 'text-ink-soft hover:text-ink'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <form onSubmit={onSearch} className="flex gap-2 sm:w-80">
          <input className="input py-2" placeholder="Tìm theo tên hoặc email" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} aria-label="Tìm tài khoản" />
          <button type="submit" className="btn-dark shrink-0">
            Tìm
          </button>
        </form>
      </div>

      {isLoading && <Spinner />}
      {isError && <ErrorView message={(error as Error).message} onRetry={() => refetch()} />}

      {data && (
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Người dùng</th>
                  <th>Vai trò</th>
                  {tab === 'CUSTOMER' && <th className="text-right">Điểm</th>}
                  <th>Ngày tạo</th>
                  <th>Trạng thái</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-ink-mute">
                      {q ? `Không có tài khoản nào khớp “${q}”.` : 'Chưa có tài khoản nào.'}
                    </td>
                  </tr>
                )}
                {rows.map((u) => {
                  const isMe = u.id === me?.id;
                  return (
                    <tr key={u.id} className={u.isActive ? '' : 'text-ink-mute'}>
                      <td>
                        <span className="block font-semibold">
                          {u.fullName || 'Chưa đặt tên'} {isMe && <span className="font-normal text-ink-mute">(bạn)</span>}
                        </span>
                        <span className="block text-xs text-ink-mute">{u.email}</span>
                      </td>
                      <td>
                        {tab === 'TEAM' && !isMe ? (
                          <select
                            className="input w-auto py-1.5 text-sm"
                            value={u.role}
                            aria-label={`Vai trò của ${u.email}`}
                            disabled={update.isPending}
                            onChange={(e) => update.mutate({ id: u.id, body: { role: e.target.value } })}
                          >
                            <option value="STAFF">{ROLE_LABEL.STAFF}</option>
                            <option value="MANAGER">{ROLE_LABEL.MANAGER}</option>
                          </select>
                        ) : (
                          ROLE_LABEL[u.role]
                        )}
                      </td>
                      {tab === 'CUSTOMER' && <td className="text-right tabular">{u.loyaltyPoints}</td>}
                      <td className="whitespace-nowrap text-ink-soft">{formatDate(u.createdAt)}</td>
                      <td>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${u.isActive ? 'bg-jade-50 text-jade-700' : 'bg-brick-50 text-brick-600'}`}>
                          {u.isActive ? 'Đang hoạt động' : 'Đã khóa'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap text-right">
                        {!isMe && (
                          <>
                            <button
                              type="button"
                              className="btn-ghost btn-sm mr-1"
                              onClick={() => {
                                setResetFor(u);
                                setNewPassword('');
                              }}
                            >
                              Đặt lại mật khẩu
                            </button>
                            <button
                              type="button"
                              className={u.isActive ? 'btn-danger btn-sm' : 'btn-outline btn-sm'}
                              disabled={update.isPending}
                              onClick={() => {
                                if (u.isActive && !window.confirm(`Khóa ${u.email}? Người này sẽ bị đăng xuất ngay.`)) return;
                                update.mutate({ id: u.id, body: { isActive: !u.isActive } });
                              }}
                            >
                              {u.isActive ? 'Khóa' : 'Mở khóa'}
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={creating}
        title="Tạo tài khoản nhân viên"
        onClose={() => setCreating(false)}
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setCreating(false)}>
              Hủy
            </button>
            <button type="submit" form="create-user-form" className="btn-primary" disabled={create.isPending}>
              {create.isPending ? 'Đang tạo…' : 'Tạo tài khoản'}
            </button>
          </>
        }
      >
        <form
          id="create-user-form"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
          className="space-y-4"
        >
          <label className="block">
            <span className="field-label">Họ tên</span>
            <input className="input" value={createForm.fullName} onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })} required maxLength={100} />
          </label>
          <label className="block">
            <span className="field-label">Email đăng nhập</span>
            <input className="input" type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} required />
          </label>
          <label className="block">
            <span className="field-label">Mật khẩu tạm</span>
            <input className="input" type="text" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} required minLength={6} autoComplete="off" />
            <span className="field-hint">Gửi cho nhân viên và nhắc họ đổi trong mục Tài khoản sau lần đăng nhập đầu.</span>
          </label>
          <fieldset>
            <legend className="field-label">Vai trò</legend>
            <div className="grid grid-cols-2 gap-2">
              {(['STAFF', 'MANAGER'] as UserRole[]).map((r) => (
                <label
                  key={r}
                  className={`cursor-pointer rounded-xl border-2 p-3 text-sm ${createForm.role === r ? 'border-jade-500 bg-jade-50' : 'border-line'}`}
                >
                  <input type="radio" name="role" className="sr-only" checked={createForm.role === r} onChange={() => setCreateForm({ ...createForm, role: r })} />
                  <span className="block font-semibold">{ROLE_LABEL[r]}</span>
                  <span className="block text-xs text-ink-soft">{r === 'STAFF' ? 'Chỉ dùng màn hình quầy pha chế' : 'Toàn quyền quản lý cửa hàng'}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </form>
      </Modal>

      <Modal
        open={resetFor !== null}
        title="Đặt lại mật khẩu"
        onClose={() => setResetFor(null)}
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setResetFor(null)}>
              Hủy
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={update.isPending || newPassword.length < 6}
              onClick={() => resetFor && update.mutate({ id: resetFor.id, body: { password: newPassword } })}
            >
              Đặt mật khẩu mới
            </button>
          </>
        }
      >
        {resetFor && (
          <label className="block">
            <span className="field-label">Mật khẩu mới cho {resetFor.email}</span>
            <input className="input" type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={6} autoComplete="off" />
            <span className="field-hint">Tối thiểu 6 ký tự.</span>
          </label>
        )}
      </Modal>
    </div>
  );
}
