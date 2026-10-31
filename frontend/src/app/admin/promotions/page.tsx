'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { PageHeader } from '@/components/admin/WorkShell';
import { Modal } from '@/components/Modal';
import { ErrorView, Spinner } from '@/components/StateViews';
import { api } from '@/lib/api';
import { formatDate, formatVND, toDateTimeLocal } from '@/lib/format';
import type { AdminPromotion } from '@/lib/types';
import { useAuth } from '@/store/auth';
import { toast } from '@/store/toast';

interface PromoForm {
  code: string;
  description: string;
  percentOff: string;
  maxDiscount: string;
  minOrderTotal: string;
  startsAt: string;
  endsAt: string;
  usageLimit: string;
}

function promoState(p: AdminPromotion): { label: string; tone: string } {
  const now = Date.now();
  if (!p.active) return { label: 'Đã tắt', tone: 'bg-ink/5 text-ink-mute' };
  if (now > new Date(p.endsAt).getTime()) return { label: 'Hết hạn', tone: 'bg-ink/5 text-ink-mute' };
  if (now < new Date(p.startsAt).getTime()) return { label: 'Sắp chạy', tone: 'bg-milk-100 text-milk-600' };
  if (p.usageLimit !== null && p.usedCount >= p.usageLimit) return { label: 'Hết lượt', tone: 'bg-brick-50 text-brick-600' };
  return { label: 'Đang chạy', tone: 'bg-jade-50 text-jade-700' };
}

function emptyForm(): PromoForm {
  const start = new Date();
  const end = new Date(Date.now() + 30 * 24 * 3600 * 1000);
  return {
    code: '',
    description: '',
    percentOff: '10',
    maxDiscount: '',
    minOrderTotal: '0',
    startsAt: toDateTimeLocal(start.toISOString()),
    endsAt: toDateTimeLocal(end.toISOString()),
    usageLimit: '',
  };
}

export default function AdminPromotionsPage() {
  const token = useAuth((s) => s.token);
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin', 'promotions'],
    queryFn: () => api<AdminPromotion[]>('/admin/promotions', { token }),
  });

  const [editing, setEditing] = useState<AdminPromotion | 'new' | null>(null);
  const [form, setForm] = useState<PromoForm>(emptyForm);

  const save = useMutation({
    mutationFn: (payload: { code?: string; body: Record<string, unknown> }) =>
      payload.code
        ? api<AdminPromotion>(`/admin/promotions/${payload.code}`, { method: 'PATCH', token, body: payload.body })
        : api<AdminPromotion>('/admin/promotions', { method: 'POST', token, body: payload.body }),
    onSuccess: (p: AdminPromotion) => {
      toast(`Đã lưu mã ${p.code}`);
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'promotions'] });
    },
    onError: (err) => toast((err as Error).message, 'error'),
  });

  const open = (p: AdminPromotion | 'new') => {
    setEditing(p);
    setForm(
      p === 'new'
        ? emptyForm()
        : {
            code: p.code,
            description: p.description,
            percentOff: String(p.percentOff),
            maxDiscount: p.maxDiscount === null ? '' : String(p.maxDiscount),
            minOrderTotal: String(p.minOrderTotal),
            startsAt: toDateTimeLocal(p.startsAt),
            endsAt: toDateTimeLocal(p.endsAt),
            usageLimit: p.usageLimit === null ? '' : String(p.usageLimit),
          },
    );
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const body: Record<string, unknown> = {
      description: form.description,
      percentOff: Number(form.percentOff),
      maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : null,
      minOrderTotal: Number(form.minOrderTotal || 0),
      startsAt: new Date(form.startsAt).toISOString(),
      endsAt: new Date(form.endsAt).toISOString(),
      usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
    };
    if (editing === 'new') {
      body.code = form.code;
      save.mutate({ body });
    } else if (editing) {
      save.mutate({ code: editing.code, body });
    }
  };

  if (isLoading) return <Spinner />;
  if (isError) return <ErrorView message={(error as Error).message} onRetry={() => refetch()} />;

  return (
    <div>
      <PageHeader
        title="Khuyến mãi"
        description="Khách nhập mã ở bước thanh toán. Mã chỉ áp dụng khi đang chạy, còn lượt và đơn đạt mức tối thiểu."
        actions={
          <button type="button" className="btn-primary" onClick={() => open('new')}>
            Tạo mã mới
          </button>
        }
      />

      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Mã</th>
                <th>Ưu đãi</th>
                <th>Điều kiện</th>
                <th>Thời gian</th>
                <th className="text-right">Đã dùng</th>
                <th>Tình trạng</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(data ?? []).length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-ink-mute">
                    Chưa có mã nào. Tạo mã đầu tiên để thu hút khách quay lại.
                  </td>
                </tr>
              )}
              {(data ?? []).map((p) => {
                const st = promoState(p);
                return (
                  <tr key={p.code}>
                    <td>
                      <span className="font-display text-base font-bold">{p.code}</span>
                      {p.description && <span className="block max-w-[14rem] truncate text-xs text-ink-mute">{p.description}</span>}
                    </td>
                    <td className="whitespace-nowrap">
                      Giảm {p.percentOff}%{p.maxDiscount !== null && <span className="text-ink-mute">, tối đa {formatVND(p.maxDiscount)}</span>}
                    </td>
                    <td className="whitespace-nowrap text-ink-soft">{p.minOrderTotal > 0 ? `Đơn từ ${formatVND(p.minOrderTotal)}` : 'Mọi đơn'}</td>
                    <td className="whitespace-nowrap text-ink-soft">
                      {formatDate(p.startsAt)} – {formatDate(p.endsAt)}
                    </td>
                    <td className="text-right tabular">
                      {p.usedCount}
                      {p.usageLimit !== null && <span className="text-ink-mute">/{p.usageLimit}</span>}
                    </td>
                    <td>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${st.tone}`}>{st.label}</span>
                    </td>
                    <td className="whitespace-nowrap text-right">
                      <button
                        type="button"
                        className="btn-ghost btn-sm mr-1"
                        disabled={save.isPending}
                        onClick={() => save.mutate({ code: p.code, body: { active: !p.active } })}
                      >
                        {p.active ? 'Tắt' : 'Bật'}
                      </button>
                      <button type="button" className="btn-outline btn-sm" onClick={() => open(p)}>
                        Sửa
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={editing !== null}
        title={editing === 'new' ? 'Tạo mã giảm giá' : `Sửa mã ${editing ? editing.code : ''}`}
        onClose={() => setEditing(null)}
        wide
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setEditing(null)}>
              Hủy
            </button>
            <button type="submit" form="promo-form" className="btn-primary" disabled={save.isPending}>
              {save.isPending ? 'Đang lưu…' : editing === 'new' ? 'Tạo mã' : 'Lưu thay đổi'}
            </button>
          </>
        }
      >
        <form id="promo-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="field-label">Mã</span>
            <input
              className="input font-semibold uppercase"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '') })}
              required
              minLength={2}
              maxLength={30}
              disabled={editing !== 'new'}
              placeholder="VD: CHAOTHU"
            />
            {editing !== 'new' && <span className="field-hint">Không đổi được mã sau khi tạo.</span>}
          </label>
          <label className="block">
            <span className="field-label">Giảm (%)</span>
            <input className="input tabular" type="number" min={1} max={100} value={form.percentOff} onChange={(e) => setForm({ ...form, percentOff: e.target.value })} required />
          </label>
          <label className="block sm:col-span-2">
            <span className="field-label">Mô tả cho nhân viên</span>
            <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={255} />
          </label>
          <label className="block">
            <span className="field-label">Giảm tối đa (đ)</span>
            <input className="input tabular" type="number" min={1000} step={1000} value={form.maxDiscount} onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })} placeholder="Không giới hạn" />
          </label>
          <label className="block">
            <span className="field-label">Đơn tối thiểu (đ)</span>
            <input className="input tabular" type="number" min={0} step={1000} value={form.minOrderTotal} onChange={(e) => setForm({ ...form, minOrderTotal: e.target.value })} />
          </label>
          <label className="block">
            <span className="field-label">Bắt đầu</span>
            <input className="input" type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} required />
          </label>
          <label className="block">
            <span className="field-label">Kết thúc</span>
            <input className="input" type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} required />
          </label>
          <label className="block">
            <span className="field-label">Giới hạn lượt dùng</span>
            <input className="input tabular" type="number" min={1} value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} placeholder="Không giới hạn" />
          </label>
        </form>
      </Modal>
    </div>
  );
}
