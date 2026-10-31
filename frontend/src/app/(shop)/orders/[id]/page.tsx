'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PickupTicket } from '@/components/PickupTicket';
import { ErrorView, Spinner } from '@/components/StateViews';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import type { OrderView } from '@/lib/types';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { toast } from '@/store/toast';

const FINAL_STATUSES = ['COMPLETED', 'CANCELLED'];

export default function OrderTicketPage() {
  const { id } = useParams<{ id: string }>();
  const { ready, token } = useRequireAuth();
  const queryClient = useQueryClient();

  const { data: order, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['order', id],
    queryFn: () => api<OrderView>(`/orders/${id}`, { token }),
    enabled: ready,
    // Tự cập nhật trạng thái (đang pha, mời lấy nước…) cho tới khi đơn kết thúc
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && FINAL_STATUSES.includes(status) ? false : 5000;
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => api<OrderView>(`/orders/${id}/cancel`, { method: 'POST', token }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['order', id], updated);
      queryClient.invalidateQueries({ queryKey: ['orders', 'me'] });
      toast(`Đã hủy đơn ${updated.code}`);
    },
    onError: (err) => toast((err as Error).message, 'error'),
  });

  if (!ready || isLoading) return <Spinner />;
  if (isError || !order) {
    return <ErrorView message={(error as Error)?.message ?? 'Không tải được đơn hàng'} onRetry={() => refetch()} />;
  }

  const unpaid = order.status === 'PENDING' || order.status === 'PAYMENT_FAILED';

  return (
    <div className="mx-auto max-w-lg">
      <PickupTicket order={order}>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-ink-mute">
          <span>Đặt lúc {formatDateTime(order.createdAt)}</span>
          {order.pointsEarned > 0 && (
            <span className="rounded-full bg-milk-100 px-3 py-1 font-semibold text-milk-600">+{order.pointsEarned} điểm tích lũy</span>
          )}
        </div>
      </PickupTicket>

      {['PAID', 'PREPARING', 'READY'].includes(order.status) && (
        <p className="mt-5 text-center text-sm text-ink-soft">
          Trang này tự cập nhật. Khi vé chuyển sang màu vàng, mời bạn đưa mã {order.code} cho quầy.
        </p>
      )}

      {unpaid && (
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Link href="/cart" className="btn-primary flex-1">
            Quay lại giỏ để trả tiền
          </Link>
          <button
            type="button"
            className="btn-danger flex-1"
            disabled={cancelMutation.isPending}
            onClick={() => {
              if (window.confirm(`Hủy đơn ${order.code}? Các ly đã giữ sẽ được trả lại quầy.`)) cancelMutation.mutate();
            }}
          >
            {cancelMutation.isPending ? 'Đang hủy…' : 'Hủy đơn'}
          </button>
        </div>
      )}

      <div className="mt-6 flex justify-center gap-2">
        <Link href="/orders" className="btn-ghost">
          Tất cả đơn
        </Link>
        <Link href="/" className="btn-ghost">
          Gọi thêm món
        </Link>
      </div>
    </div>
  );
}
