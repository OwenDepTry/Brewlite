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

const METHODS: { value: PaymentMethod; label: string; hint: string; mark: string }[] = [
  { value: 'WALLET', label: 'Ví điện tử', hint: 'MoMo, ZaloPay', mark: 'Ví' },
  { value: 'CARD', label: 'Thẻ ngân hàng', hint: 'Visa, Mastercard, ATM nội địa', mark: 'Thẻ' },
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

  // 1 khóa cho việc tạo đơn mỗi lượt vào trang; 1 khóa cho mỗi lần bấm trả tiền.
  // Mạng lỗi giữa chừng mà bấm lại thì gửi đúng khóa cũ -> server không tạo đơn / trừ tiền 2 lần.
  const orderKey = useRef(newIdempotencyKey());
  const paymentKey = useRef<string | null>(null);

  useEffect(() => {
    if (hydrated && !token) router.replace('/login?next=/checkout');
  }, [hydrated, token, router]);

  if (!hydrated || !token) return <Spinner />;

  if (items.length === 0 && !order) {
    return (
      <EmptyView title="Giỏ hàng đang trống">
        <Link href="/" className="btn-primary mt-4">
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
  const appliedCode = order?.promoCode ?? quote?.promoCode ?? null;

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
      setPromoMessage(q.promoError ?? `Đã áp dụng mã ${q.promoCode}, giảm ${formatVND(q.discount)}`);
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
      // 1) Tạo đơn PENDING (chỉ 1 lần cho mỗi lượt thanh toán)
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
      paymentKey.current = null;
      setOrder(result.order);

      if (result.payment.status === 'SUCCESS') {
        clear();
        router.replace(`/orders/${current.id}`);
        return;
      }
      setError(
        `Thanh toán không thành công: ${result.payment.failureReason ?? 'cổng thanh toán từ chối'}. ` +
          'Giỏ hàng vẫn còn nguyên, bạn có thể đổi phương thức rồi trả lại.',
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

  const lines = order
    ? order.items.map((i) => ({ name: i.productName, size: i.size, qty: i.qty, toppings: i.toppings, total: i.lineTotal }))
    : items.map((i) => ({ name: i.name, size: i.size, qty: i.qty, toppings: i.toppings, total: i.unitPrice * i.qty }));

  return (
    <div>
      <Link href="/cart" className="btn-ghost -ml-3 mb-4">
        ← Giỏ hàng
      </Link>
      <h1 className="text-4xl font-extrabold tracking-[-0.03em]">Thanh toán</h1>
      {order && (
        <p className="mt-1 text-ink-soft">
          Đơn {order.code} đã được giữ chỗ, chỉ còn bước trả tiền.
        </p>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-lg font-bold">Trả bằng</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {METHODS.map((m) => {
                const active = method === m.value;
                return (
                  <label
                    key={m.value}
                    className={`flex cursor-pointer items-center gap-4 rounded-2xl border-2 bg-white p-4 transition-colors ${
                      active ? 'border-jade-500' : 'border-line hover:border-ink/30'
                    }`}
                  >
                    <input
                      type="radio"
                      name="method"
                      className="sr-only"
                      checked={active}
                      onChange={() => setMethod(m.value)}
                    />
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                        active ? 'bg-jade-500 text-white' : 'bg-paper text-ink-soft'
                      }`}
                      aria-hidden="true"
                    >
                      {m.mark}
                    </span>
                    <span>
                      <span className="block font-semibold">{m.label}</span>
                      <span className="block text-sm text-ink-mute">{m.hint}</span>
                    </span>
                  </label>
                );
              })}
            </div>
            <label className="mt-4 flex items-start gap-3 rounded-xl border border-dashed border-milk-600/40 bg-milk-100/60 px-4 py-3 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-milk-600"
                checked={simulateFailure}
                onChange={(e) => setSimulateFailure(e.target.checked)}
              />
              <span>
                <span className="font-medium">Giả lập giao dịch bị từ chối</span>
                <span className="block text-ink-soft">Dùng khi demo luồng thanh toán lỗi. Không ảnh hưởng tiền thật.</span>
              </span>
            </label>
          </section>

          {!order && (
            <section>
              <h2 className="mb-3 text-lg font-bold">Mã giảm giá</h2>
              <div className="flex gap-2">
                <input
                  className="input uppercase placeholder:normal-case"
                  placeholder="Nhập mã, ví dụ WELCOME10"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applyPromo()}
                  disabled={!!quote?.promoCode}
                  aria-label="Mã giảm giá"
                />
                {quote?.promoCode ? (
                  <button type="button" className="btn-outline shrink-0" onClick={removePromo}>
                    Bỏ mã
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-dark shrink-0"
                    onClick={applyPromo}
                    disabled={checkingPromo || !promoInput.trim()}
                  >
                    {checkingPromo ? 'Đang kiểm tra…' : 'Áp dụng'}
                  </button>
                )}
              </div>
              {promoMessage && (
                <p className={`mt-2 text-sm ${quote?.promoCode ? 'text-jade-600' : 'text-brick-600'}`}>{promoMessage}</p>
              )}
            </section>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="panel overflow-hidden">
            <div className="px-5 pt-5">
              <h2 className="text-lg font-bold">Đơn của bạn</h2>
              <ul className="mt-3 divide-y divide-line/70">
                {lines.map((l, idx) => (
                  <li key={idx} className="flex justify-between gap-3 py-2.5 text-sm">
                    <span>
                      <span className="font-semibold tabular">{l.qty}×</span> {l.name}{' '}
                      <span className="text-ink-mute">size {l.size}</span>
                      {l.toppings.length > 0 && (
                        <span className="block text-ink-mute">thêm {l.toppings.map((t) => t.name.toLowerCase()).join(', ')}</span>
                      )}
                    </span>
                    <span className="tabular">{formatVND(l.total)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <dl className="mt-2 space-y-1 border-t border-line px-5 py-4 text-sm">
              <div className="flex justify-between text-ink-soft">
                <dt>Tạm tính</dt>
                <dd className="tabular">{formatVND(subtotal)}</dd>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-jade-600">
                  <dt>Mã {appliedCode}</dt>
                  <dd className="tabular">−{formatVND(discount)}</dd>
                </div>
              )}
              <div className="flex items-baseline justify-between pt-2">
                <dt className="font-semibold">Cần trả</dt>
                <dd className="font-display text-3xl font-bold tabular">{formatVND(total)}</dd>
              </div>
              <p className="pt-1 text-xs text-ink-mute">Được cộng {Math.floor(total / 10000)} điểm tích lũy sau khi trả.</p>
            </dl>
            <div className="border-t border-line p-5">
              {error && (
                <p role="alert" className="mb-3 whitespace-pre-line rounded-xl bg-brick-50 px-3 py-2 text-sm text-brick-600">
                  {error}
                </p>
              )}
              <button type="button" onClick={handlePay} disabled={submitting} className="btn-primary btn-lg w-full justify-between">
                <span>{submitting ? 'Đang xử lý…' : 'Trả tiền'}</span>
                <span className="tabular">{formatVND(total)}</span>
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
