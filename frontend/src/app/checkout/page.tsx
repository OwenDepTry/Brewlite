'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { EmptyView, Spinner } from '@/components/StateViews';
import { ApiError, api } from '@/lib/api';
import { formatVND } from '@/lib/format';
import { newIdempotencyKey } from '@/lib/id';
import type { OrderView, PaymentMethod, PaymentResult, QuoteView } from '@/lib/types';
import { useHydrated } from '@/lib/useHydrated';
import { useAuth } from '@/store/auth';
import { cartTotal, useCart } from '@/store/cart';

const METHODS: { value: PaymentMethod; label: string; hint: string }[] = [
  { value: 'WALLET', label: 'Ví điện tử', hint: 'Momo / ZaloPay (giả lập)' },
  { value: 'CARD', label: 'Thẻ ngân hàng', hint: 'Visa / Mastercard / ATM nội địa (giả lập)' },
];

export default function CheckoutPage() {
  const hydrated = useHydrated();
  const router = useRouter();
  const { token, logout } = useAuth();
  const { items, clear } = useCart();

  const [method, setMethod] = useState<PaymentMethod>('WALLET');
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [order, setOrder] = useState<OrderView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [promoInput, setPromoInput] = useState('');
  const [quote, setQuote] = useState<QuoteView | null>(null);
  const [promoMessage, setPromoMessage] = useState<string | null>(null);
  const [checkingPromo, setCheckingPromo] = useState(false);

  // Mỗi lần vào trang thanh toán: 1 khóa cho việc tạo đơn; mỗi lần bấm trả tiền: 1 khóa thanh toán.
  // Nếu mạng lỗi giữa chừng, bấm lại sẽ gửi lại đúng khóa cũ nên server không tạo đơn/trừ tiền 2 lần.
  const orderKey = useRef(newIdempotencyKey());
  const paymentKey = useRef<string | null>(null);

  useEffect(() => {
    if (hydrated && !token) router.replace('/login?next=/checkout');
  }, [hydrated, token, router]);

  if (!hydrated || !token) return <Spinner />;

  if (items.length === 0 && !order) {
    return (
      <EmptyView title="Giỏ hàng đang trống">
        <Link href="/" className="btn-primary mt-2">
          Xem menu
        </Link>
      </EmptyView>
    );
  }

  const cartItemsPayload = items.map((i) => ({
    productId: i.productId,
    size: i.size,
    toppingIds: i.toppings.map((t) => t.id),
    qty: i.qty,
  }));

  const subtotal = order?.subtotal ?? quote?.subtotal ?? cartTotal(items);
  const discount = order?.discount ?? (quote?.promoCode ? quote.discount : 0);
  const total = order?.total ?? subtotal - discount;

  const applyPromo = async () => {
    const code = promoInput.trim();
    setPromoMessage(null);
    if (!code) {
      setQuote(null);
      return;
    }
    setCheckingPromo(true);
    try {
      const q = await api<QuoteView>('/orders/quote', {
        method: 'POST',
        token,
        body: { items: cartItemsPayload, promoCode: code },
      });
      setQuote(q);
      setPromoMessage(q.promoError ?? `Đã áp dụng mã ${q.promoCode}: giảm ${formatVND(q.discount)}`);
    } catch (err) {
      setQuote(null);
      setPromoMessage((err as Error).message);
    } finally {
      setCheckingPromo(false);
    }
  };

  const removePromo = () => {
    setQuote(null);
    setPromoInput('');
    setPromoMessage(null);
  };

  const handlePay = async () => {
    setError(null);
    setSubmitting(true);
    try {
      // 1) Tạo đơn PENDING (chỉ tạo 1 lần cho mỗi lượt thanh toán)
      let current = order;
      if (!current) {
        current = await api<OrderView>('/orders', {
          method: 'POST',
          token,
          headers: { 'Idempotency-Key': orderKey.current },
          body: {
            items: cartItemsPayload,
            ...(quote?.promoCode ? { promoCode: quote.promoCode } : {}),
          },
        });
        setOrder(current);
      }

      // 2) Thanh toán không tiền mặt
      paymentKey.current ??= newIdempotencyKey();
      const result = await api<PaymentResult>('/payments', {
        method: 'POST',
        token,
        headers: { 'Idempotency-Key': paymentKey.current },
        body: { orderId: current.id, method, simulateFailure },
      });
      paymentKey.current = null; // đã có kết quả -> lần thử sau dùng khóa mới
      setOrder(result.order);

      if (result.payment.status === 'SUCCESS') {
        clear();
        router.replace(`/orders/${current.id}?new=1`);
        return;
      }
      setError(
        `Thanh toán thất bại: ${result.payment.failureReason ?? 'không rõ lý do'}. ` +
          'Giỏ hàng vẫn được giữ nguyên, bạn có thể đổi phương thức và thử lại.',
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        logout();
        router.replace('/login?next=/checkout');
        return;
      }
      if (err instanceof ApiError && err.status !== 0) {
        paymentKey.current = null;
      }
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-4 text-2xl font-bold">Thanh toán</h1>

      <section className="card p-5">
        <h2 className="mb-3 font-semibold">Đơn của bạn{order && ` · ${order.code}`}</h2>
        <ul className="divide-y divide-espresso/10 text-sm">
          {(order ? order.items : items).map((i, idx) => {
            const name = 'productName' in i ? i.productName : i.name;
            const lineTotal = 'lineTotal' in i ? i.lineTotal : i.unitPrice * i.qty;
            return (
              <li key={idx} className="flex justify-between gap-2 py-2">
                <span>
                  {name} · {i.size} × {i.qty}
                  {i.toppings.length > 0 && (
                    <span className="block text-espresso/60">+ {i.toppings.map((t) => t.name).join(', ')}</span>
                  )}
                </span>
                <span className="font-medium">{formatVND(lineTotal)}</span>
              </li>
            );
          })}
        </ul>
        <div className="mt-3 space-y-1 border-t border-espresso/10 pt-3">
          {discount > 0 && (
            <>
              <div className="flex justify-between text-sm">
                <span>Tạm tính</span>
                <span>{formatVND(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-brand-700">
                <span>Giảm giá ({order?.promoCode ?? quote?.promoCode})</span>
                <span>−{formatVND(discount)}</span>
              </div>
            </>
          )}
          <div className="flex justify-between text-lg font-bold">
            <span>Tổng</span>
            <span>{formatVND(total)}</span>
          </div>
        </div>
      </section>

      {!order && (
        <section className="card mt-4 p-5">
          <h2 className="mb-3 font-semibold">Mã giảm giá</h2>
          <div className="flex gap-2">
            <input
              className="input uppercase"
              placeholder="VD: WELCOME10"
              value={promoInput}
              onChange={(e) => setPromoInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyPromo()}
              disabled={!!quote?.promoCode}
              aria-label="Mã giảm giá"
            />
            {quote?.promoCode ? (
              <button type="button" className="btn-secondary" onClick={removePromo}>
                Bỏ mã
              </button>
            ) : (
              <button type="button" className="btn-secondary" onClick={applyPromo} disabled={checkingPromo}>
                {checkingPromo ? '…' : 'Áp dụng'}
              </button>
            )}
          </div>
          {promoMessage && (
            <p className={`mt-2 text-sm ${quote?.promoCode ? 'text-brand-700' : 'text-red-700'}`}>{promoMessage}</p>
          )}
          <p className="mt-2 text-xs text-espresso/60">Mỗi 10.000đ thanh toán được cộng 1 điểm tích lũy.</p>
        </section>
      )}

      <section className="card mt-4 p-5">
        <h2 className="mb-3 font-semibold">Phương thức</h2>
        <div className="space-y-2">
          {METHODS.map((m) => (
            <label
              key={m.value}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 ${
                method === m.value ? 'border-brand-500 bg-brand-50' : 'border-espresso/15 bg-white'
              }`}
            >
              <input
                type="radio"
                name="method"
                className="accent-brand-500"
                checked={method === m.value}
                onChange={() => setMethod(m.value)}
              />
              <span>
                <span className="block font-medium">{m.label}</span>
                <span className="block text-xs text-espresso/60">{m.hint}</span>
              </span>
            </label>
          ))}
        </div>
        <p className="mt-3 text-center text-sm text-espresso/60">Không dùng tiền mặt</p>

        <label className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <input
            type="checkbox"
            className="accent-amber-600"
            checked={simulateFailure}
            onChange={(e) => setSimulateFailure(e.target.checked)}
          />
          Mô phỏng thanh toán lỗi (dùng khi demo)
        </label>
      </section>

      {error && (
        <p role="alert" className="mt-4 whitespace-pre-line rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Link href="/cart" className="btn-secondary flex-1">
          Quay lại giỏ
        </Link>
        <button type="button" onClick={handlePay} disabled={submitting} className="btn-primary flex-1">
          {submitting ? 'Đang xử lý…' : `Xác nhận trả · ${formatVND(total)}`}
        </button>
      </div>
    </div>
  );
}
