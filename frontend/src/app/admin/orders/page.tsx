'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { PageHeader } from '@/components/admin/WorkShell';
import { Modal } from '@/components/Modal';
import { ErrorView, Spinner } from '@/components/StateViews';
import { STATUS_LABEL, StatusBadge } from '@/components/StatusBadge';
import { api } from '@/lib/api';
import { formatDateTime, formatVND } from '@/lib/format';
import type { AdminOrder, OrderStatus, OrderView, Paged } from '@/lib/types';
import { useAuth } from '@/store/auth';
import { toast } from '@/store/toast';

const FILTERS: (OrderStatus | 'ALL')[] = ['ALL', 'PAID', 'PREPARING', 'READY', 'COMPLETED', 'PENDING', 'PAYMENT_FAILED', 'CANCELLED'];
const PAGE_SIZE = 20;

/** Chuyển tiếp hợp lệ quản lý được bấm (máy trạng thái ở backend vẫn kiểm tra lại) */
const ACTIONS: Partial<Record<OrderStatus, { to: OrderStatus; label: string }[]>> = {
  PENDING: [{ to: 'CANCELLED', label: 'Hủy đơn' }],
  PAYMENT_FAILED: [{ to: 'CANCELLED', label: 'Hủy đơn' }],
  PAID: [
    { to: 'PREPARING', label: 'Bắt đầu pha' },
    { to: 'CANCELLED', label: 'Hủy và hoàn tiền' },
  ],
  PREPARING: [{ to: 'READY', label: 'Pha xong' }],
  READY: [{ to: 'COMPLETED', label: 'Khách đã nhận' }],
};

export default function AdminOrdersPage() {
  const token = useAuth((s) => s.token);
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<OrderStatus | 'ALL'>('ALL');
  const [searchInput, setSearchInput] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AdminOrder | null>(null);

  const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  if (status !== 'ALL') params.set('status', status);
  if (q) params.set('q', q);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin', 'orders', status, q, page],
    queryFn: () => api<Paged<AdminOrder>>(`/admin/orders?${params.toString()}`, { token }),
    refetchInterval: 15_000,
  });

  const mutation = useMutation({
    mutationFn: ({ id, to }: { id: number; to: OrderStatus }) =>
      api<OrderView>(`/orders/${id}/status`, { method: 'PATCH', token, body: { status: to } }),
    onSuccess: (order: OrderView) => {
      toast(`Đơn ${order.code}: ${STATUS_LABEL[order.status].toLowerCase()}`);
      setSelected((cur) => (cur && cur.id === order.id ? { ...cur, ...order } : cur));
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (err) => toast((err as Error).message, 'error'),
  });

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    setPage(1);
    setQ(searchInput.trim());
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div>
      <PageHeader title="Đơn hàng" description="Theo dõi mọi đơn, chuyển trạng thái hoặc hủy và hoàn tiền khi cần." />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => {
                setStatus(f);
                setPage(1);
              }}
              className={`chip shrink-0 ${status === f ? 'chip-active' : ''}`}
            >
              {f === 'ALL' ? 'Tất cả' : STATUS_LABEL[f]}
            </button>
          ))}
        </div>
        <form onSubmit={onSearch} className="flex gap-2 lg:w-80">
          <input
            className="input py-2"
            placeholder="Mã đơn hoặc email khách"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="Tìm đơn"
          />
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
                  <th>Mã đơn</th>
                  <th>Khách</th>
                  <th>Đồ uống</th>
                  <th className="text-right">Tổng</th>
                  <th>Trạng thái</th>
                  <th>Thời gian</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-ink-mute">
                      {q ? `Không có đơn nào khớp “${q}”.` : 'Chưa có đơn nào ở trạng thái này.'}
                    </td>
                  </tr>
                )}
                {data.items.map((o) => (
                  <tr key={o.id}>
                    <td className="font-display text-base font-bold tabular">{o.code}</td>
                    <td>
                      <span className="block max-w-[12rem] truncate">{o.customer?.fullName || 'Khách vãng lai'}</span>
                      <span className="block max-w-[12rem] truncate text-xs text-ink-mute">{o.customer?.email}</span>
                    </td>
                    <td className="max-w-[16rem] truncate text-ink-soft">{o.items.map((i) => `${i.qty} ${i.productName}`).join(', ')}</td>
                    <td className="text-right font-semibold tabular">{formatVND(o.total)}</td>
                    <td>
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="whitespace-nowrap text-ink-soft">{formatDateTime(o.createdAt)}</td>
                    <td className="text-right">
                      <button type="button" className="btn-outline btn-sm" onClick={() => setSelected(o)}>
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm text-ink-soft">
            <span>
              {data.total} đơn, trang {page}/{totalPages}
            </span>
            <div className="flex gap-2">
              <button type="button" className="btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Trang trước
              </button>
              <button type="button" className="btn-outline btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Trang sau
              </button>
            </div>
          </div>
        </div>
      )}

      <Modal
        open={!!selected}
        title={selected ? `Đơn ${selected.code}` : ''}
        onClose={() => setSelected(null)}
        footer={
          selected && (
            <>
              {(ACTIONS[selected.status] ?? []).map((a) => (
                <button
                  key={a.to}
                  type="button"
                  disabled={mutation.isPending}
                  className={a.to === 'CANCELLED' ? 'btn-danger' : 'btn-primary'}
                  onClick={() => {
                    if (a.to === 'CANCELLED' && !window.confirm(`${a.label} đơn ${selected.code}?`)) return;
                    mutation.mutate({ id: selected.id, to: a.to });
                  }}
                >
                  {a.label}
                </button>
              ))}
              {!ACTIONS[selected.status] && <span className="mr-auto self-center text-sm text-ink-mute">Đơn đã kết thúc.</span>}
              <button type="button" className="btn-ghost" onClick={() => setSelected(null)}>
                Đóng
              </button>
            </>
          )
        }
      >
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <StatusBadge status={selected.status} />
              <span className="text-ink-mute">{formatDateTime(selected.createdAt)}</span>
            </div>
            <div>
              <p className="font-semibold">{selected.customer?.fullName || 'Khách vãng lai'}</p>
              <p className="text-ink-mute">{selected.customer?.email}</p>
            </div>
            <ul className="divide-y divide-line/70 border-y border-line">
              {selected.items.map((i, idx) => (
                <li key={idx} className="flex justify-between gap-3 py-2">
                  <span>
                    <span className="font-semibold tabular">{i.qty}×</span> {i.productName} <span className="text-ink-mute">size {i.size}</span>
                    {i.toppings.length > 0 && <span className="block text-ink-mute">thêm {i.toppings.map((t) => t.name.toLowerCase()).join(', ')}</span>}
                  </span>
                  <span className="tabular">{formatVND(i.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <dl className="space-y-1">
              {selected.discount > 0 && (
                <div className="flex justify-between text-jade-600">
                  <dt>Mã {selected.promoCode}</dt>
                  <dd className="tabular">−{formatVND(selected.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between text-base font-bold">
                <dt>Tổng</dt>
                <dd className="tabular">{formatVND(selected.total)}</dd>
              </div>
              {selected.pointsEarned > 0 && <p className="text-xs text-ink-mute">Khách được cộng {selected.pointsEarned} điểm.</p>}
            </dl>
          </div>
        )}
      </Modal>
    </div>
  );
}
